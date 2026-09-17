import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { NseIndia } = require("stock-nse-india");

const nse = new NseIndia();

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function isoDay(value) {
  if (value == null) return null;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s.replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, "$2 $1, $3"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function sma(bars, period) {
  const out = [];
  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const avg = slice.reduce((s, b) => s + b.close, 0) / period;
    out.push({ time: bars[i].time, value: +avg.toFixed(2) });
  }
  return out;
}

function uniqueBars(bars) {
  const map = new Map();
  for (const b of bars || []) {
    if (b?.time == null) continue;
    map.set(String(b.time), b);
  }
  return [...map.values()].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
}

function indexSymbol(slug) {
  const compact = String(slug || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
  if (compact === "INDIA VIX" || compact === "INDIAVIX") return "INDIA VIX";
  if (compact === "NIFTY 50" || compact === "NIFTY50") return "NIFTY 50";
  if (compact === "NIFTY BANK" || compact === "NIFTYBANK") return "NIFTY BANK";
  if (compact === "NIFTY 500" || compact === "NIFTY500") return "NIFTY 500";
  return compact;
}

function fromCharting(rows) {
  return uniqueBars(
    (rows || [])
      .map((r) => ({
        time: isoDay(r.time),
        open: n(r.open),
        high: n(r.high),
        low: n(r.low),
        close: n(r.close),
        volume: n(r.volume) || 0,
      }))
      .filter((b) => b.time && b.open != null && b.high != null && b.low != null && b.close != null)
  );
}

function fromHistoricalChunks(chunks) {
  const rows = (chunks || []).flatMap((c) => c.data || []);
  return uniqueBars(
    rows
      .map((r) => ({
        time: isoDay(r.mtimestamp || r.CH_TIMESTAMP),
        open: n(r.chOpeningPrice ?? r.CH_OPENING_PRICE),
        high: n(r.chTradeHighPrice ?? r.CH_TRADE_HIGH_PRICE),
        low: n(r.chTradeLowPrice ?? r.CH_TRADE_LOW_PRICE),
        close: n(r.chClosingPrice ?? r.CH_CLOSING_PRICE),
        volume: n(r.chTotTradedQty ?? r.CH_TRADED_QTY) || 0,
      }))
      .filter((b) => b.time && b.close != null)
  );
}

function rangeDays(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end };
}

function fromChartingIntraday(rows) {
  return (rows || [])
    .map((r) => {
      const ms = Number(r.time);
      if (!Number.isFinite(ms)) return null;
      return {
        time: Math.floor(ms / 1000),
        open: n(r.open),
        high: n(r.high),
        low: n(r.low),
        close: n(r.close),
        volume: n(r.volume) || 0,
      };
    })
    .filter((b) => b && b.open != null && b.close != null)
    .sort((a, b) => a.time - b.time);
}

export async function nseEquityDetails(symbol) {
  return nse.getEquityDetails(symbol);
}

async function resolveEquityToken(symbol) {
  const listRaw = await nse.getEquitySymbolInfo(symbol).catch(() => null);
  // getEquitySymbolInfo returns one row; fetch the search list ourselves via the same method
  // is wrong for RELIANCE. Pull the dynamic list through a dedicated lookup.
  const raw = await nse.getData(
    `https://charting.nseindia.com/v1/exchanges/symbolsDynamic?symbol=${encodeURIComponent(symbol)}&segment=`,
    "charting"
  );
  const list = Array.isArray(raw) ? raw : raw?.data || (listRaw ? [listRaw] : []);
  const upper = symbol.toUpperCase();
  const score = (s) => {
    const sym = String(s.symbol || "").toUpperCase();
    const type = String(s.type || "");
    if (type !== "Equity") return 0;
    if (sym === `${upper}-EQ`) return 100;
    if (sym === upper) return 90;
    if (sym.startsWith(`${upper}-EQ`)) return 80;
    if (sym.startsWith(`${upper}-`) && !/-(BE|BZ|BL|SM)$/.test(sym)) return 40;
    return 0;
  };
  const ranked = [...list].map((s) => ({ s, score: score(s) })).filter((x) => x.score > 0);
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0]?.s;
  if (!best?.scripcode) throw new Error(`No equity token for ${symbol}`);
  return best.scripcode;
}

const nameCache = new Map();

export async function nseDailyBars(slug, days = 400) {
  const raw = String(slug || "").trim();
  const compact = indexSymbol(raw);
  const isIndex = /NIFTY|VIX|SENSEX/.test(compact);
  const symbol = isIndex ? compact : compact.replace(/ /g, "");
  const range = rangeDays(days);

  if (isIndex) {
    const chart = await nse.getEquityChartHistoricalData(symbol, range, undefined, "Index", "D", "1");
    const bars = fromCharting(chart?.data);
    if (!bars.length) throw new Error(`No NSE index history for ${symbol}`);
    return {
      symbol,
      name: symbol,
      kind: "index",
      bars,
      source: "NSE charting (stock-nse-india)",
    };
  }

  let bars = [];
  let source = "NSE charting (stock-nse-india)";
  try {
    const token = await resolveEquityToken(symbol);
    const chart = await nse.getEquityChartHistoricalData(symbol, range, token, "Equity", "D", "1");
    bars = fromCharting(chart?.data);
  } catch {
    bars = [];
  }
  if (!bars.length) {
    const hist = await nse.getEquityHistoricalData(symbol, range);
    bars = fromHistoricalChunks(hist);
    source = "NSE historical trade data (stock-nse-india)";
  }
  if (!bars.length) throw new Error(`No NSE history for ${symbol}`);

  let name = nameCache.get(symbol) || symbol;
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];
  let changePct =
    prevBar && prevBar.close ? +(((lastBar.close - prevBar.close) / prevBar.close) * 100).toFixed(2) : null;
  if (!nameCache.has(symbol)) {
    try {
      const details = await nse.getEquityDetails(symbol);
      name = details.info?.companyName || name;
      nameCache.set(symbol, name);
    } catch {
      nameCache.set(symbol, name);
    }
  }

  return { symbol, name, kind: "stock", bars, lastPrice: lastBar.close, changePct, source };
}

export async function nseIntradayBars(slug, minutes = 60, lookbackDays = 90) {
  const raw = String(slug || "").trim();
  const compact = indexSymbol(raw);
  const isIndex = /NIFTY|VIX|SENSEX/.test(compact);
  const symbol = isIndex ? compact : compact.replace(/ /g, "");
  const end = new Date();
  const start = new Date(end.getTime() - lookbackDays * 86400000);
  const token = isIndex ? undefined : await resolveEquityToken(symbol);
  const chart = await nse.getEquityChartHistoricalData(
    symbol,
    { start, end },
    token,
    isIndex ? "Index" : "Equity",
    "I",
    String(minutes)
  );
  let bars = uniqueBars(fromChartingIntraday(chart?.data));
  if (!bars.length) throw new Error(`No NSE ${minutes}m history for ${symbol}`);
  if (/VIX/.test(symbol) && bars[bars.length - 1].close > 50) {
    bars = bars.map((b) => ({
      ...b,
      open: +(b.open / 100).toFixed(2),
      high: +(b.high / 100).toFixed(2),
      low: +(b.low / 100).toFixed(2),
      close: +(b.close / 100).toFixed(2),
    }));
  }
  const lastBar = bars[bars.length - 1];
  return {
    symbol,
    name: symbol,
    kind: isIndex ? "index" : "stock",
    bars,
    lastPrice: lastBar.close,
    changePct: null,
    source: `NSE charting ${minutes}-minute (stock-nse-india)`,
    interval: `${minutes}m`,
  };
}

export function toMonthlyBars(daily) {
  const map = new Map();
  for (const b of daily || []) {
    const key = String(b.time).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        time: `${key}-01`,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume || 0,
      });
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.volume += b.volume || 0;
    }
  }
  return [...map.values()].sort((a, b) => a.time.localeCompare(b.time));
}

let equityList = { at: 0, rows: [] };

async function loadEquityList() {
  if (equityList.rows.length && Date.now() - equityList.at < 6 * 60 * 60 * 1000) {
    return equityList.rows;
  }
  const res = await fetch("https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "text/csv,*/*",
    },
  });
  if (!res.ok) throw new Error(`EQUITY_L ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  const symI = header.findIndex((h) => h === "SYMBOL");
  const nameI = header.findIndex((h) => h.includes("NAME"));
  const seriesI = header.findIndex((h) => h.includes("SERIES"));
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const symbol = (cols[symI] || "").trim().toUpperCase();
    const name = (cols[nameI] || "").trim();
    const series = (cols[seriesI] || "EQ").trim();
    if (symbol) rows.push({ symbol, name, series, kind: "stock" });
  }
  equityList = { at: Date.now(), rows };
  return rows;
}

export async function nseSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 1) return [];
  const needle = q.toLowerCase();
  const out = [];
  const seen = new Set();

  try {
    const rows = await loadEquityList();
    for (const r of rows) {
      if (r.symbol.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)) {
        if (seen.has(r.symbol)) continue;
        seen.add(r.symbol);
        out.push({ symbol: r.symbol, name: r.name, series: r.series, kind: "stock" });
      }
      if (out.length >= 20) break;
    }
  } catch {
    /* archives down */
  }

  try {
    const raw = await nse.getData(
      `https://charting.nseindia.com/v1/exchanges/symbolsDynamic?symbol=${encodeURIComponent(q)}&segment=`,
      "charting"
    );
    const list = Array.isArray(raw) ? raw : raw?.data || [];
    for (const s of list) {
      const type = String(s.type || "");
      if (type !== "Equity" && type !== "Index") continue;
      let symbol = String(s.symbol || "").toUpperCase();
      if (symbol.endsWith("-EQ")) symbol = symbol.slice(0, -3);
      if (!symbol || seen.has(symbol)) continue;
      if (/-(BE|BZ|BL|SM|ST)$/.test(symbol)) continue;
      if (type === "Index" && /FUT|CE|PE/.test(symbol)) continue;
      seen.add(symbol);
      out.push({
        symbol,
        name: s.description || s.fullname || symbol,
        kind: type === "Index" ? "index" : "stock",
      });
    }
  } catch {
    /* charting search optional */
  }

  try {
    const { nseGet } = await import("./nse.js");
    const all = await nseGet("/api/allIndices");
    for (const row of all.data || []) {
      const symbol = String(row.index || "").toUpperCase();
      if (!symbol) continue;
      if (!symbol.toLowerCase().includes(needle) && !String(row.indexSymbol || "").toLowerCase().includes(needle)) continue;
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      out.push({ symbol, name: row.index, kind: "index" });
    }
  } catch {
    /* indices optional */
  }

  const rank = (a) => {
    const s = a.symbol.toLowerCase();
    const n = a.name.toLowerCase();
    if (s === needle) return 0;
    if (n === needle) return 1;
    if (n.startsWith(needle)) return 2;
    if (s.startsWith(needle)) return 3;
    if (n.split(/[\s,]+/).includes(needle)) return 4;
    return 5;
  };
  out.sort((a, b) => rank(a) - rank(b) || a.symbol.localeCompare(b.symbol));
  return out.slice(0, 15);
}

export function withMovingAverages(bars) {
  return {
    sma_20: sma(bars, 20),
    sma_50: sma(bars, 50),
    sma_200: sma(bars, 200),
  };
}
