// Fallback data source built only from NSE bhavcopy archive files
// (nsearchives.nseindia.com), used when the www.nseindia.com APIs are blocked.
import { archivesGet } from "./nse.js";

const ARCHIVES = "https://nsearchives.nseindia.com";
const MAX_CALENDAR_DAYS = 400;
const CONCURRENCY = 2;

// "YYYY-MM-DD" -> { ok, stocks: Map, indices: Map } ; ok=false for holidays / missing files
const dayCache = new Map();
const inflight = new Map();

const pad = (v) => String(v).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ddmmyyyy = (d) => `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
const num = (v) => {
  const x = Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : null;
};

function parseStocks(csv) {
  const out = new Map();
  for (const line of csv.split("\n").slice(1)) {
    const c = line.split(",").map((s) => s.trim());
    if (c.length < 11 || c[1] !== "EQ") continue;
    const [open, high, low, close, volume] = [num(c[4]), num(c[5]), num(c[6]), num(c[8]), num(c[10])];
    if (open == null || close == null) continue;
    out.set(c[0], { open, high, low, close, volume: volume || 0 });
  }
  return out;
}

function parseIndices(csv) {
  const out = new Map();
  for (const line of csv.split("\n").slice(1)) {
    const c = line.split(",").map((s) => s.trim());
    if (c.length < 9) continue;
    const [open, high, low, close] = [num(c[2]), num(c[3]), num(c[4]), num(c[5])];
    if (close == null) continue;
    out.set(c[0].toUpperCase(), {
      name: c[0],
      open: open ?? close,
      high: high ?? close,
      low: low ?? close,
      close,
      volume: num(c[8]) || 0,
    });
  }
  return out;
}

async function loadDay(date) {
  const iso = isoOf(date);
  if (dayCache.has(iso)) return dayCache.get(iso);
  if (inflight.has(iso)) return inflight.get(iso);
  const task = (async () => {
    const tag = ddmmyyyy(date);
    const [stocks, indices] = await Promise.allSettled([
      archivesGet(`${ARCHIVES}/products/content/sec_bhavdata_full_${tag}.csv`).then(parseStocks),
      archivesGet(`${ARCHIVES}/content/indices/ind_close_all_${tag}.csv`).then(parseIndices),
    ]);
    const day = {
      iso,
      ok: stocks.status === "fulfilled" || indices.status === "fulfilled",
      stocks: stocks.status === "fulfilled" ? stocks.value : new Map(),
      indices: indices.status === "fulfilled" ? indices.value : new Map(),
    };
    // Only remember a miss when NSE says the file doesn't exist (holiday). A 403
    // means we're throttled, and today's file may not be published yet.
    const missing = [stocks, indices].every((r) => r.status === "rejected" && r.reason?.message === "archives 404");
    if (day.ok || (missing && iso !== isoOf(new Date()))) dayCache.set(iso, day);
    if (!day.ok && !missing && indices.reason?.message === "archives 403") throw new Error("NSE archives 403 (rate limited)");
    return day;
  })().finally(() => inflight.delete(iso));
  inflight.set(iso, task);
  return task;
}

function weekdaysBack(calendarDays) {
  const dates = [];
  const d = new Date();
  for (let i = 0; i < calendarDays; i++) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) dates.push(new Date(d));
    d.setDate(d.getDate() - 1);
  }
  return dates.reverse();
}

async function loadDays(calendarDays) {
  const dates = weekdaysBack(Math.min(calendarDays, MAX_CALENDAR_DAYS));
  const days = new Array(dates.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < dates.length) {
        const i = next++;
        days[i] = await loadDay(dates[i]);
      }
    })
  );
  return days.filter((d) => d.ok);
}

export async function bhavDailyBars(slug, calendarDays = 400) {
  const key = String(slug || "").trim().toUpperCase().replace(/_/g, " ").replace(/\s+/g, " ");
  const days = await loadDays(calendarDays);
  if (!days.length) throw new Error("No bhavcopy files available");

  const isIndex = days.some((d) => d.indices.has(key));
  const bars = [];
  let name = key;
  for (const d of days) {
    const row = isIndex ? d.indices.get(key) : d.stocks.get(key.replace(/ /g, ""));
    if (!row) continue;
    if (row.name) name = row.name;
    bars.push({ time: d.iso, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume });
  }
  if (!bars.length) throw new Error(`No bhavcopy history for ${key}`);
  return {
    symbol: isIndex ? key : key.replace(/ /g, ""),
    name,
    kind: isIndex ? "index" : "stock",
    bars,
    source: "NSE bhavcopy archives",
  };
}

export async function bhavSearch(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const [latest] = (await loadDays(10)).slice(-1);
  if (!latest) return [];
  const out = [];
  for (const [key, row] of latest.indices) {
    if (key.toLowerCase().includes(q)) out.push({ symbol: key, name: row.name, series: "INDEX", kind: "index" });
  }
  for (const symbol of latest.stocks.keys()) {
    if (symbol.toLowerCase().includes(q)) out.push({ symbol, name: symbol, series: "EQ", kind: "stock" });
  }
  const rank = (r) => (r.symbol.toLowerCase() === q ? 0 : r.symbol.toLowerCase().startsWith(q) ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b)).slice(0, 20);
}
