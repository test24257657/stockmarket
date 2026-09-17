import { archivesGet, nseGet } from "./nse.js";
import * as seed from "./market.js";
import { bhavDailyBars, bhavSearch } from "./bhavcopy.js";

// BHAV_ONLY=1 skips the www.nseindia.com APIs for charts and search.
const BHAV_ONLY = process.env.BHAV_ONLY === "1";

function num(v) {
  if (v == null || v === "-") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseTs(ts) {
  if (!ts) return new Date().toISOString();
  // "11-Sep-2026 15:30" or "11-Sep-2026 16:00:28"
  const d = new Date(ts.replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, "$2 $1, $3"));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function asOfDate(ts) {
  const iso = parseTs(ts);
  return iso.slice(0, 10);
}

function sparkFromIndex(row) {
  return [row.oneYearAgoVal, row.oneMonthAgoVal, row.oneWeekAgoVal, row.previousDayVal, row.last]
    .map(num)
    .filter((v) => v != null);
}

function findIndex(all, name) {
  return (all.data || []).find((x) => x.index === name || x.indexSymbol === name);
}

function tile(all, name) {
  const row = findIndex(all, name);
  if (!row) return null;
  return {
    symbol: row.index,
    value: num(row.last),
    change: num(row.variation),
    change_pct: num(row.percentChange),
    spark: sparkFromIndex(row),
    as_of: asOfDate(all.timestamp),
  };
}

function vixBlock(all) {
  const row = findIndex(all, "INDIA VIX");
  if (!row) return null;
  const value = num(row.last);
  const lo = num(row.yearLow);
  const hi = num(row.yearHigh);
  const pctile = lo != null && hi != null && hi !== lo ? +(((value - lo) / (hi - lo)) * 100).toFixed(1) : null;
  const band = value < 13 ? "low" : value < 18 ? "mid" : "high";
  return {
    value,
    change: num(row.variation),
    change_pct: num(row.percentChange),
    percentile_250d: pctile,
    band,
    verdict:
      band === "low"
        ? "Low volatility — trend-friendly"
        : band === "mid"
          ? "Normal volatility"
          : "Elevated volatility — size down",
    advice:
      band === "low"
        ? "Favour breakout continuation; wider stops unnecessary."
        : band === "mid"
          ? "Keep standard swing risk; confirm with volume."
          : "Cut size; wait for contraction before chasing breakouts.",
  };
}

function flowDate(raw) {
  // 11-Sep-2026
  const d = new Date(raw.replace(/(\d{2})-([A-Za-z]{3})-(\d{4})/, "$2 $1, $3"));
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function livePulse() {
  const [all, status, fii, most, highs, lows] = await Promise.all([
    nseGet("/api/allIndices"),
    nseGet("/api/marketStatus"),
    nseGet("/api/fiidiiTradeReact"),
    nseGet("/api/live-analysis-most-active-securities?index=value"),
    nseGet("/api/live-analysis-52Week?index=high"),
    nseGet("/api/live-analysis-52Week?index=low"),
  ]);

  const tiles = ["NIFTY 50", "NIFTY BANK", "NIFTY 500", "INDIA VIX"].map((n) => tile(all, n)).filter(Boolean);
  const fiiRow = (fii || []).find((x) => String(x.category).startsWith("FII"));
  const diiRow = (fii || []).find((x) => String(x.category).startsWith("DII"));
  const series = [];
  if (fiiRow || diiRow) {
    series.push({
      date: flowDate((fiiRow || diiRow).date),
      fii_net: num(fiiRow?.netValue),
      dii_net: num(diiRow?.netValue),
    });
  }

  const most_active = (most.data || []).slice(0, 10).map((r) => ({
    symbol: r.symbol,
    name: r.symbol,
    ltp: num(r.lastPrice) ?? num(r.closePrice),
    change_pct: num(r.pChange),
    turnover_cr: +((num(r.totalTradedValue) || 0) / 1e7).toFixed(1),
  }));

  const breakouts = (highs.dataLtpGreater20 || highs.data || []).slice(0, 10).map((r) => ({
    symbol: r.symbol,
    name: r.comapnyName || r.companyName || r.symbol,
    ltp: num(r.ltp),
    change_pct: num(r.pChange),
    vol_ratio: null,
  }));

  const nifty500 = findIndex(all, "NIFTY 500");
  const traded = (num(all.advances) || 0) + (num(all.declines) || 0) + (num(all.unchanged) || 0);
  const ad = num(all.advances);
  const dec = num(all.declines);

  return {
    data: {
      as_of: asOfDate(all.timestamp || most.timestamp),
      tiles,
      breadth: {
        date: asOfDate(all.timestamp),
        advances: ad,
        declines: dec,
        unchanged: num(all.unchanged),
        traded,
        ad_ratio: dec ? +(ad / dec).toFixed(2) : null,
        pct_above_50dma: null,
        pct_above_200dma: null,
        new_52w_highs: (highs.dataLtpGreater20 || []).length,
        new_52w_lows: (lows.dataLtpGreater20 || []).length,
        note: nifty500
          ? `NIFTY 500 internals ${nifty500.advances} / ${nifty500.declines}`
          : null,
      },
      flows: {
        series,
        fii_10_session_net: num(fiiRow?.netValue),
        dii_10_session_net: num(diiRow?.netValue),
      },
      vix: vixBlock(all),
      most_active,
      breakouts_52w: breakouts,
    },
    meta: {
      source: "NSE India (www.nseindia.com)",
      as_of: parseTs(all.timestamp || most.timestamp),
      stale: String(status?.marketState?.[0]?.marketStatus || "").toLowerCase() !== "open",
      job: "live",
      degraded_sources: [],
    },
  };
}

export async function liveStatus() {
  const status = await nseGet("/api/marketStatus", { ttl: 30_000 });
  const cm = (status.marketState || []).find((m) => m.market === "Capital Market") || status.marketState?.[0];
  const open = String(cm?.marketStatus || "").toLowerCase() === "open";
  return {
    status: open ? "open" : "closed",
    label: open ? "Market open" : "Market closed",
    as_of: new Date().toISOString(),
    next_session: cm?.tradeDate || null,
    nse: cm || null,
  };
}

export async function liveScreener() {
  const [highs, most, gainers] = await Promise.all([
    nseGet("/api/live-analysis-52Week?index=high"),
    nseGet("/api/live-analysis-most-active-securities?index=value"),
    nseGet("/api/live-analysis-variations?index=gainers"),
  ]);
  const rows = [];
  for (const r of highs.dataLtpGreater20 || []) {
    rows.push({
      symbol: r.symbol,
      name: r.comapnyName || r.symbol,
      sector: "",
      ltp: num(r.ltp),
      change_pct: num(r.pChange),
      pattern: "high_52w_breakout",
      stage: num(r.pChange) > 5 ? "extended" : "confirmed",
      pivot: num(r.prev52WHL),
      vol_ratio: null,
      rs_rank: null,
      delivery_pct: null,
    });
  }
  const gainerBag =
    gainers.NIFTY ||
    gainers.SecGtr20 ||
    gainers.data ||
    Object.values(gainers).find((v) => Array.isArray(v) && v[0]?.symbol) ||
    [];
  for (const r of gainerBag.slice(0, 25)) {
    if (rows.some((x) => x.symbol === r.symbol)) continue;
    rows.push({
      symbol: r.symbol,
      name: r.symbol,
      sector: "",
      ltp: num(r.ltp || r.lastPrice),
      change_pct: num(r.pChange),
      pattern: "near_pivot",
      stage: "forming",
      pivot: num(r.ltp || r.lastPrice),
      vol_ratio: null,
      rs_rank: null,
      delivery_pct: null,
    });
  }
  for (const r of (most.data || []).slice(0, 15)) {
    if (rows.some((x) => x.symbol === r.symbol)) continue;
    rows.push({
      symbol: r.symbol,
      name: r.symbol,
      sector: "",
      ltp: num(r.lastPrice),
      change_pct: num(r.pChange),
      pattern: "vcp",
      stage: "forming",
      pivot: num(r.lastPrice),
      vol_ratio: null,
      rs_rank: null,
      delivery_pct: null,
    });
  }
  const patterns = ["vcp", "ipo_base", "high_52w_breakout", "near_pivot"].map((code) => ({
    code,
    label: { vcp: "VCP", ipo_base: "IPO Base", high_52w_breakout: "52WH", near_pivot: "Pivot" }[code],
    count: rows.filter((r) => r.pattern === code).length,
  }));
  const stages = ["forming", "confirmed", "extended"].map((code) => ({
    code,
    count: rows.filter((r) => r.stage === code).length,
  }));
  return {
    data: { as_of: asOfDate(highs.timestamp || most.timestamp), facets: { patterns, stages }, rows },
    meta: { source: "NSE India", as_of: parseTs(highs.timestamp || most.timestamp), stale: true, job: "live", degraded_sources: [] },
  };
}

export async function liveSectors() {
  const all = await nseGet("/api/allIndices");
  const sectors = (all.data || [])
    .filter((x) => x.key === "SECTORAL INDICES")
    .map((x, i) => ({
      name: x.index,
      rank_1m: i + 1,
      rank_3m: i + 1,
      rank_delta: 0,
      ret_1m: num(x.perChange30d),
      ret_3m: num(x.percentChange),
      rs: null,
      rrg: { rs: num(x.last), rm: num(x.previousClose) },
      constituents: [],
    }))
    .sort((a, b) => (b.ret_1m ?? -999) - (a.ret_1m ?? -999))
    .map((s, i) => ({ ...s, rank_1m: i + 1 }));
  return {
    data: { as_of: asOfDate(all.timestamp), sectors },
    meta: { source: "NSE India", as_of: parseTs(all.timestamp), stale: true, job: "live", degraded_sources: [] },
  };
}

export async function liveIndices() {
  const all = await nseGet("/api/allIndices");
  const rows = (all.data || [])
    .filter((x) => ["INDICES ELIGIBLE IN DERIVATIVES", "BROAD MARKET INDICES", "SECTORAL INDICES"].includes(x.key))
    .map((x) => ({
      symbol: x.index,
      slug: String(x.index).replace(/[^a-zA-Z0-9]/g, "_"),
      category: x.key.replace(" INDICES", "").replace("INDICES ELIGIBLE IN DERIVATIVES", "Broad"),
      value: num(x.last),
      change_pct: num(x.percentChange),
    }));
  return {
    data: { as_of: asOfDate(all.timestamp), indices: rows },
    meta: { source: "NSE India", as_of: parseTs(all.timestamp), stale: true, job: "live", degraded_sources: [] },
  };
}

export async function liveNews() {
  const items = await nseGet("/api/corporate-announcements?index=equities");
  const list = (Array.isArray(items) ? items : []).map((n, i) => ({
    id: n.seq_id || i + 1,
    symbol: n.symbol,
    name: n.sm_name,
    headline: n.attchmntText || n.desc,
    category: n.desc || "Corporate",
    impact: "neutral",
    published_at: n.sort_date?.replace(" ", "T") + "+05:30" || n.an_dt,
    url: n.attchmntFile,
  }));
  return {
    data: { as_of: new Date().toISOString().slice(0, 10), items: list },
    meta: { source: "NSE corporate announcements", as_of: new Date().toISOString(), stale: false, job: "live", degraded_sources: [] },
  };
}

function parsePoi(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.includes(","));
  const body = lines.filter((l) => /^(Client|DII|FII|Pro),/.test(l));
  return body.map((line) => {
    const c = line.split(",");
    const long = num(c[1]);
    const short = num(c[2]);
    return { participant: c[0], long, short, net: long != null && short != null ? long - short : null };
  });
}

function poiUrlFor(date = new Date()) {
  // try last session-ish: use 11 Sep 2026 style from current IST minus weekend
  const d = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  if (d.getDay() === 0) d.setDate(d.getDate() - 2);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  // after 18:30 use today else previous weekday
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { url: `https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_${dd}${mm}${yyyy}.csv`, ymd: `${yyyy}-${mm}-${dd}` };
}

export async function liveInstitutional() {
  const deals = await nseGet("/api/snapshot-capital-market-largedeal");
  const bulk = (deals.BULK_DEALS_DATA || []).slice(0, 25).map((d) => ({
    date: flowDate(d.date || deals.as_on_date),
    symbol: d.symbol,
    name: d.name,
    side: String(d.buySell || "").toLowerCase() === "sell" ? "sell" : "buy",
    qty: num(d.qty),
    avg_price: num(d.watp),
    client: d.clientName,
    repeat_accumulation: false,
  }));
  let poi = { as_of: deals.as_on_date, rows: [], fii_index_ls_ratio: [] };
  try {
    const { url, ymd } = poiUrlFor();
    const csv = await archivesGet(url);
    const rows = parsePoi(csv);
    const fii = rows.find((r) => r.participant === "FII");
    poi = {
      as_of: ymd,
      rows,
      fii_index_ls_ratio: fii && fii.short ? [{ date: ymd, ratio: +(fii.long / fii.short).toFixed(2) }] : [],
    };
  } catch {
    /* file not up yet */
  }
  return {
    data: { as_of: flowDate(deals.as_on_date), bulk_deals: bulk, participant_oi: poi },
    meta: { source: "NSE large deals + participant OI", as_of: parseTs(deals.as_on_date), stale: true, job: "live", degraded_sources: [] },
  };
}

const quoteCache = new Map();

export async function rememberQuotes(rows) {
  for (const r of rows) {
    if (r.symbol && r.ltp != null) quoteCache.set(r.symbol, r);
  }
}

export function liveQuote(symbol) {
  const s = String(symbol || "").toUpperCase();
  return quoteCache.get(s) || seed.quote(s);
}

export async function refreshQuoteBook() {
  try {
    const [most, highs] = await Promise.all([
      nseGet("/api/live-analysis-most-active-securities?index=value"),
      nseGet("/api/live-analysis-52Week?index=high"),
    ]);
    rememberQuotes(
      (most.data || []).map((r) => ({
        symbol: r.symbol,
        name: r.symbol,
        ltp: num(r.lastPrice),
        change_pct: num(r.pChange),
      }))
    );
    rememberQuotes(
      (highs.dataLtpGreater20 || []).map((r) => ({
        symbol: r.symbol,
        name: r.comapnyName || r.symbol,
        ltp: num(r.ltp),
        change_pct: num(r.pChange),
      }))
    );
  } catch {
    /* ignore */
  }
}

export async function liveSearch(q) {
  const { nseSearch } = await import("./nseClient.js");
  try {
    if (!BHAV_ONLY) {
      const results = await nseSearch(q);
      if (results.length) return results;
    }
    return await bhavSearch(q);
  } catch {
    await refreshQuoteBook();
    const n = String(q || "").trim().toLowerCase();
    if (!n) return [];
    return [...quoteCache.values()]
      .filter((s) => s.symbol.toLowerCase().includes(n) || String(s.name || "").toLowerCase().includes(n))
      .slice(0, 8);
  }
}

const chartMem = new Map();

function defaultDays(tf) {
  if (tf === "1H") return 40;
  if (tf === "1M") return 800;
  return 400;
}

function maxDays(tf) {
  if (tf === "1H") return 90;
  return 3650;
}

async function dailyBars(slug, days) {
  if (BHAV_ONLY) return bhavDailyBars(slug, days);
  const { nseDailyBars } = await import("./nseClient.js");
  try {
    return await nseDailyBars(slug, days);
  } catch {
    return bhavDailyBars(slug, days);
  }
}

export async function liveChart(slug, tf = "1D", days) {
  const { nseIntradayBars, toMonthlyBars, withMovingAverages } = await import("./nseClient.js");
  const key = String(tf || "1D").toUpperCase();
  const want = Math.min(Math.max(Number(days) || defaultDays(key), 20), maxDays(key));
  const cacheKey = `${String(slug).toUpperCase()}|${key}`;
  const hit = chartMem.get(cacheKey);
  let pack;
  if (hit && hit.days >= want) {
    pack = hit.pack;
  } else if (key === "1H") {
    pack = await nseIntradayBars(slug, 60, want);
    chartMem.set(cacheKey, { days: want, pack });
  } else if (key === "1M") {
    const daily = await dailyBars(slug, want);
    pack = { ...daily, bars: toMonthlyBars(daily.bars), interval: "1M", source: `${daily.source} · monthly` };
    chartMem.set(cacheKey, { days: want, pack });
  } else {
    pack = { ...(await dailyBars(slug, want)), interval: "1D" };
    chartMem.set(cacheKey, { days: want, pack });
  }
  const last = pack.bars[pack.bars.length - 1];
  const prev = pack.bars[pack.bars.length - 2];
  const change_pct =
    last && prev?.close ? +(((last.close - prev.close) / prev.close) * 100).toFixed(2) : null;
  const change_abs = last && prev ? +(last.close - prev.close).toFixed(2) : null;
  return {
    data: {
      symbol: pack.symbol,
      name: pack.name,
      kind: pack.kind,
      as_of: typeof last.time === "number" ? new Date(last.time * 1000).toISOString().slice(0, 10) : last.time,
      interval: pack.interval || "1D",
      last_price: last.close,
      change_pct,
      change_abs,
      bars: pack.bars,
      ma: withMovingAverages(pack.bars),
      history_days: want,
      history_max: maxDays(key),
    },
    meta: {
      source: pack.source,
      as_of: `${last.time}T00:00:00+05:30`,
      stale: true,
      job: "live",
      degraded_sources: [],
    },
  };
}

export async function withFallback(liveFn, seedFn) {
  try {
    return await liveFn();
  } catch (err) {
    const out = typeof seedFn === "function" ? seedFn() : seedFn;
    if (out?.meta) {
      out.meta.degraded_sources = ["nse"];
      out.meta.source = `${out.meta.source} (NSE unavailable: ${err.message})`;
    }
    return out;
  }
}
