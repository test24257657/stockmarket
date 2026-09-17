const AS_OF = "2026-09-11";
const META = {
  source: "seeded nightly artifacts",
  as_of: "2026-09-11T22:19:17+05:30",
  stale: true,
  job: "nightly",
  degraded_sources: [],
};

function envelope(data) {
  return { data, meta: META };
}

function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function series(seed, n, start, vol = 0.012) {
  const bars = [];
  let price = start;
  const t0 = Date.parse("2025-09-24T00:00:00+05:30");
  for (let i = 0; i < n; i++) {
    const r = ((hash(`${seed}-${i}`) % 10000) / 10000 - 0.48) * vol;
    const open = price;
    const close = Math.max(1, open * (1 + r));
    const high = Math.max(open, close) * (1 + ((hash(`${seed}-h${i}`) % 400) / 10000));
    const low = Math.min(open, close) * (1 - ((hash(`${seed}-l${i}`) % 400) / 10000));
    const volume = 800000 + (hash(`${seed}-v${i}`) % 12000000);
    const day = new Date(t0 + i * 86400000);
    const y = day.getUTCFullYear();
    const m = String(day.getUTCMonth() + 1).padStart(2, "0");
    const d = String(day.getUTCDate()).padStart(2, "0");
    bars.push({
      time: `${y}-${m}-${d}`,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return bars;
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

const UNIVERSE = [
  { symbol: "RELIANCE", name: "Reliance Industries Limited", ltp: 1257.5, change_pct: -1.3, sector: "Energy" },
  { symbol: "HDFCBANK", name: "HDFC Bank Limited", ltp: 708.25, change_pct: 2.08, sector: "Banks" },
  { symbol: "ICICIBANK", name: "ICICI Bank Limited", ltp: 1379.3, change_pct: -0.38, sector: "Banks" },
  { symbol: "TCS", name: "Tata Consultancy Services Limited", ltp: 3021.4, change_pct: 0.42, sector: "IT" },
  { symbol: "INFY", name: "Infosys Limited", ltp: 1488.6, change_pct: -0.21, sector: "IT" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Limited", ltp: 1882.0, change_pct: 0.91, sector: "Telecom" },
  { symbol: "SBIN", name: "State Bank of India", ltp: 812.4, change_pct: 1.15, sector: "Banks" },
  { symbol: "LT", name: "Larsen & Toubro Limited", ltp: 3610.0, change_pct: -0.55, sector: "Capital Goods" },
  { symbol: "TATAMOTORS", name: "Tata Motors Limited", ltp: 679.2, change_pct: 2.44, sector: "Auto" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Limited", ltp: 12840.0, change_pct: 0.33, sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Limited", ltp: 1712.5, change_pct: 0.18, sector: "Pharma" },
  { symbol: "GRANULES", name: "Granules India Limited", ltp: 909.3, change_pct: 1.12, sector: "Pharma" },
  { symbol: "PINELABS", name: "Pine Labs Limited", ltp: 202.17, change_pct: 16.75, sector: "Fintech" },
  { symbol: "PAYTM", name: "One 97 Communications Limited", ltp: 1807.5, change_pct: 3.94, sector: "Fintech" },
  { symbol: "RAYMOND", name: "Raymond Limited", ltp: 1002.8, change_pct: 17.44, sector: "Textiles" },
  { symbol: "BSE", name: "BSE Limited", ltp: 3384.0, change_pct: 2.36, sector: "Financial Services" },
  { symbol: "MOLBIO", name: "Molbio Diagnostics Limited", ltp: 1438.2, change_pct: -4.72, sector: "Pharma" },
  { symbol: "ESDS", name: "ESDS Software Solution Limited", ltp: 1740.4, change_pct: 10.0, sector: "IT" },
  { symbol: "DIGJAMLMTD", name: "Digjam Limited", ltp: 68.42, change_pct: 10.64, sector: "Textiles" },
  { symbol: "SMSPHARMA", name: "SMS Pharmaceuticals Limited", ltp: 463.45, change_pct: 11.02, sector: "Pharma" },
  { symbol: "RACLGEAR", name: "RACL Geartech Limited", ltp: 1756.7, change_pct: 10.61, sector: "Auto" },
  { symbol: "FILATEX", name: "Filatex India Limited", ltp: 87.41, change_pct: 14.64, sector: "Textiles" },
  { symbol: "AMDIND", name: "AMD Industries Limited", ltp: 64.03, change_pct: 14.26, sector: "Chemicals" },
  { symbol: "ANMOL", name: "Anmol India Limited", ltp: 16.87, change_pct: 9.97, sector: "Energy" },
  { symbol: "SPECTRUM", name: "Spectrum Electrical Industries Limited", ltp: 3022.5, change_pct: 5.0, sector: "Capital Goods" },
  { symbol: "SUPREMEENG", name: "Supreme Engineering Limited", ltp: 3.33, change_pct: 1.83, sector: "Capital Goods" },
  { symbol: "DHOOTTRANS", name: "Dhoot Transmission Limited", ltp: 1728.7, change_pct: 10.0, sector: "Auto" },
];

const INDEX_TILES = [
  {
    symbol: "NIFTY 50",
    value: 23431.5,
    change: -203.6,
    change_pct: -0.86,
    spark: [24317.15, 24383.6, 24774.3, 24614.9, 24624.65, 24636.0, 24570.65, 24583.8, 24471.7, 24435.95, 24395.85, 24366.0, 24287.65, 24154.9, 24078.3, 24231.85, 24252.0, 24219.05, 24334.55, 24207.75, 24090.85, 24175.65, 24080.4, 24055.8, 23914.45, 23873.45, 23897.7, 23779.15, 23635.1, 23431.5],
    as_of: "2026-09-09",
  },
  {
    symbol: "NIFTY BANK",
    value: 56295.55,
    change: -482.0,
    change_pct: -0.85,
    spark: [57147.5, 57264.85, 58247.95, 57907.2, 57739.95, 58063.65, 57746.45, 57686.95, 57446.25, 57885.85, 57635.25, 57491.1, 57497.8, 57262.4, 57239.75, 57495.9, 57761.95, 57525.95, 57514.2, 57783.75, 57509.95, 57496.3, 58024.95, 57409.6, 57172.0, 57380.6, 57369.65, 57088.3, 56777.55, 56295.55],
    as_of: "2026-09-09",
  },
  {
    symbol: "NIFTY 500",
    value: 22958.75,
    change: -147.35,
    change_pct: -0.64,
    spark: [23353.55, 23460.7, 23802.85, 23690.15, 23735.55, 23729.45, 23712.1, 23743.2, 23681.15, 23672.45, 23658.1, 23594.9, 23564.45, 23472.4, 23386.2, 23512.95, 23530.3, 23511.75, 23611.6, 23559.2, 23482.0, 23528.55, 23450.35, 23339.9, 23222.8, 23254.05, 23254.15, 23156.2, 23106.1, 22958.75],
    as_of: "2026-09-09",
  },
  {
    symbol: "INDIA VIX",
    value: 11.92,
    change: 0.69,
    change_pct: 6.14,
    spark: [12.16, 11.76, 11.93, 12.19, 12.06, 12.16, 12.16, 12.25, 11.86, 11.69, 11.42, 11.31, 11.33, 11.39, 11.32, 10.76, 11.2, 11.53, 11.08, 10.57, 11.07, 10.68, 11.19, 11.49, 11.59, 11.34, 10.68, 11.16, 11.23, 11.92],
    as_of: "2026-09-09",
  },
];

const CHART_INDEXES = {
  NIFTY_50: { name: "NIFTY 50", start: 24100 },
  NIFTY_BANK: { name: "NIFTY BANK", start: 57500 },
  NIFTY_500: { name: "NIFTY 500", start: 23400 },
  INDIA_VIX: { name: "INDIA VIX", start: 12.1 },
};

function pulse() {
  return envelope({
    as_of: AS_OF,
    tiles: INDEX_TILES,
    breadth: {
      date: AS_OF,
      advances: 1053,
      declines: 1808,
      unchanged: 51,
      traded: 2912,
      ad_ratio: 0.58,
      pct_above_50dma: 39.79,
      pct_above_200dma: 50.02,
      new_52w_highs: 11,
      new_52w_lows: 7,
    },
    flows: {
      series: [
        { date: "2026-09-09", fii_net: -582.99, dii_net: 1509.04 },
        { date: "2026-09-10", fii_net: -438.24, dii_net: 1025.85 },
        { date: "2026-09-11", fii_net: -930.9, dii_net: 1968.17 },
      ],
      fii_10_session_net: -1952.1,
      dii_10_session_net: 4503.1,
    },
    vix: {
      value: 11.92,
      change: 0.69,
      change_pct: 6.14,
      percentile_250d: 39.6,
      band: "low",
      verdict: "Low volatility — trend-friendly",
      advice: "Favour breakout continuation; wider stops unnecessary.",
    },
    most_active: [
      { symbol: "PINELABS", name: "Pine Labs Limited", ltp: 202.17, change_pct: 16.75, turnover_cr: 5309.3 },
      { symbol: "MOLBIO", name: "Molbio Diagnostics Limited", ltp: 1438.2, change_pct: -4.72, turnover_cr: 3417.1 },
      { symbol: "HDFCBANK", name: "HDFC Bank Limited", ltp: 708.25, change_pct: 2.08, turnover_cr: 2177.8 },
      { symbol: "PAYTM", name: "One 97 Communications Limited", ltp: 1807.5, change_pct: 3.94, turnover_cr: 1662.9 },
      { symbol: "RAYMOND", name: "Raymond Limited", ltp: 1002.8, change_pct: 17.44, turnover_cr: 1570.4 },
      { symbol: "BSE", name: "BSE Limited", ltp: 3384.0, change_pct: 2.36, turnover_cr: 1408.4 },
      { symbol: "ESDS", name: "ESDS Software Solution Limited", ltp: 1740.4, change_pct: 10.0, turnover_cr: 1274.3 },
      { symbol: "RELIANCE", name: "Reliance Industries Limited", ltp: 1257.5, change_pct: -1.3, turnover_cr: 1105.4 },
      { symbol: "ICICIBANK", name: "ICICI Bank Limited", ltp: 1379.3, change_pct: -0.38, turnover_cr: 974.6 },
      { symbol: "DHOOTTRANS", name: "Dhoot Transmission Limited", ltp: 1728.7, change_pct: 10.0, turnover_cr: 969.6 },
    ],
    breakouts_52w: [
      { symbol: "DIGJAMLMTD", name: "Digjam Limited", ltp: 68.42, change_pct: 10.64, vol_ratio: 11.9 },
      { symbol: "SMSPHARMA", name: "SMS Pharmaceuticals Limited", ltp: 463.45, change_pct: 11.02, vol_ratio: 11.2 },
      { symbol: "RACLGEAR", name: "RACL Geartech Limited", ltp: 1756.7, change_pct: 10.61, vol_ratio: 10.6 },
      { symbol: "FILATEX", name: "Filatex India Limited", ltp: 87.41, change_pct: 14.64, vol_ratio: 9.3 },
      { symbol: "AMDIND", name: "AMD Industries Limited", ltp: 64.03, change_pct: 14.26, vol_ratio: 7.3 },
      { symbol: "GRANULES", name: "Granules India Limited", ltp: 909.3, change_pct: 1.12, vol_ratio: 6.3 },
      { symbol: "ANMOL", name: "Anmol India Limited", ltp: 16.87, change_pct: 9.97, vol_ratio: 4.8 },
      { symbol: "RAYMOND", name: "Raymond Limited", ltp: 1002.8, change_pct: 17.44, vol_ratio: 4.8 },
      { symbol: "SPECTRUM", name: "Spectrum Electrical Industries Limited", ltp: 3022.5, change_pct: 5.0, vol_ratio: 4.6 },
      { symbol: "SUPREMEENG", name: "Supreme Engineering Limited", ltp: 3.33, change_pct: 1.83, vol_ratio: 4.5 },
    ],
  });
}

const PATTERNS = [
  { code: "vcp", label: "VCP" },
  { code: "ipo_base", label: "IPO Base" },
  { code: "high_52w_breakout", label: "52WH" },
  { code: "near_pivot", label: "Pivot" },
];
const STAGES = ["forming", "confirmed", "extended"];

function screener() {
  const rows = UNIVERSE.map((s, i) => {
    const pattern = PATTERNS[i % PATTERNS.length].code;
    const stage = STAGES[i % STAGES.length];
    const pivot = +(s.ltp * (stage === "forming" ? 1.02 : stage === "extended" ? 0.93 : 0.99)).toFixed(2);
    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      ltp: s.ltp,
      change_pct: s.change_pct,
      pattern,
      stage,
      pivot,
      vol_ratio: +((1.1 + (hash(s.symbol) % 900) / 100).toFixed(2)),
      rs_rank: 20 + (hash(s.symbol + "rs") % 80),
      delivery_pct: 20 + (hash(s.symbol + "d") % 60),
    };
  });
  return envelope({
    as_of: AS_OF,
    facets: {
      patterns: PATTERNS.map((p) => ({
        ...p,
        count: rows.filter((r) => r.pattern === p.code).length,
      })),
      stages: STAGES.map((code) => ({
        code,
        count: rows.filter((r) => r.stage === code).length,
      })),
    },
    rows,
  });
}

function sectors() {
  const names = [...new Set(UNIVERSE.map((s) => s.sector))];
  const list = names.map((name, i) => {
    const members = UNIVERSE.filter((s) => s.sector === name);
    const ret_1m = +(((hash(name) % 1600) / 100 - 8).toFixed(2));
    const ret_3m = +(((hash(name + "3") % 2400) / 100 - 10).toFixed(2));
    return {
      name,
      rank_1m: i + 1,
      rank_3m: ((i + 3) % names.length) + 1,
      rank_delta: (i % 3) - 1,
      ret_1m,
      ret_3m,
      rs: 40 + (hash(name) % 55),
      rrg: { rs: 90 + (hash(name) % 30), rm: 95 + (hash(name + "r") % 20) },
      constituents: members.map((m) => ({
        symbol: m.symbol,
        name: m.name,
        ltp: m.ltp,
        change_pct: m.change_pct,
      })),
    };
  });
  list.sort((a, b) => b.ret_1m - a.ret_1m);
  list.forEach((s, i) => {
    s.rank_1m = i + 1;
  });
  return envelope({ as_of: AS_OF, sectors: list });
}

function indices() {
  const rows = [
    { symbol: "NIFTY 50", slug: "NIFTY_50", category: "Broad", value: 23431.5, change_pct: -0.86 },
    { symbol: "NIFTY BANK", slug: "NIFTY_BANK", category: "Broad", value: 56295.55, change_pct: -0.85 },
    { symbol: "NIFTY 500", slug: "NIFTY_500", category: "Broad", value: 22958.75, change_pct: -0.64 },
    { symbol: "INDIA VIX", slug: "INDIA_VIX", category: "Volatility", value: 11.92, change_pct: 6.14 },
    { symbol: "NIFTY IT", slug: "NIFTY_IT", category: "Sector", value: 34820.1, change_pct: 0.22 },
    { symbol: "NIFTY AUTO", slug: "NIFTY_AUTO", category: "Sector", value: 25110.4, change_pct: 1.05 },
    { symbol: "NIFTY PHARMA", slug: "NIFTY_PHARMA", category: "Sector", value: 22140.8, change_pct: 0.41 },
    { symbol: "NIFTY ENERGY", slug: "NIFTY_ENERGY", category: "Sector", value: 34102.0, change_pct: -0.72 },
    { symbol: "NIFTY FMCG", slug: "NIFTY_FMCG", category: "Sector", value: 54880.3, change_pct: -0.18 },
    { symbol: "NIFTY METAL", slug: "NIFTY_METAL", category: "Sector", value: 9340.6, change_pct: 1.88 },
  ];
  return envelope({ as_of: AS_OF, indices: rows });
}

function news() {
  const items = [
    { symbol: "RELIANCE", headline: "Jio platforms capacity expansion approved by board", category: "Corporate", impact: "positive", published_at: "2026-09-11T10:20:00+05:30" },
    { symbol: "HDFCBANK", headline: "RBI keeps CRR unchanged; private banks extend gains", category: "Macro", impact: "positive", published_at: "2026-09-11T11:05:00+05:30" },
    { symbol: "PINELABS", headline: "Merchant acquiring volumes jump 28% QoQ", category: "Results", impact: "positive", published_at: "2026-09-11T12:40:00+05:30" },
    { symbol: "RAYMOND", headline: "Realty demerger timeline confirmed; listing window in Q3", category: "Corporate", impact: "neutral", published_at: "2026-09-11T13:15:00+05:30" },
    { symbol: "MOLBIO", headline: "US FDA observation on diagnostic kit plant", category: "Regulatory", impact: "negative", published_at: "2026-09-11T14:02:00+05:30" },
    { symbol: "GRANULES", headline: "US formulations ANDA approval for metformin XR", category: "Regulatory", impact: "positive", published_at: "2026-09-11T15:10:00+05:30" },
    { symbol: "TATAMOTORS", headline: "PV wholesale volumes beat street by 6%", category: "Results", impact: "positive", published_at: "2026-09-10T18:30:00+05:30" },
    { symbol: "INFY", headline: "Large European insurer signs 5-year deal", category: "Corporate", impact: "positive", published_at: "2026-09-10T16:45:00+05:30" },
  ].map((n, i) => ({
    id: i + 1,
    ...n,
    name: UNIVERSE.find((u) => u.symbol === n.symbol)?.name || n.symbol,
  }));
  return envelope({ as_of: AS_OF, items });
}

function institutional() {
  return envelope({
    as_of: AS_OF,
    bulk_deals: [
      { date: AS_OF, symbol: "PINELABS", name: "Pine Labs Limited", side: "buy", qty: 4200000, avg_price: 198.4, client: "Quant Mutual Fund", repeat_accumulation: true },
      { date: AS_OF, symbol: "RAYMOND", name: "Raymond Limited", side: "buy", qty: 890000, avg_price: 976.2, client: "Societe Generale", repeat_accumulation: false },
      { date: "2026-09-10", symbol: "GRANULES", name: "Granules India Limited", side: "buy", qty: 1250000, avg_price: 894.0, client: "Fidelity", repeat_accumulation: true },
      { date: "2026-09-10", symbol: "MOLBIO", name: "Molbio Diagnostics Limited", side: "sell", qty: 310000, avg_price: 1490.5, client: "Prop Desk A", repeat_accumulation: false },
    ],
    participant_oi: {
      as_of: AS_OF,
      rows: [
        { participant: "FII", long: 182340, short: 214550, net: -32210 },
        { participant: "DII", long: 98620, short: 54110, net: 44510 },
        { participant: "Pro", long: 76440, short: 80120, net: -3680 },
        { participant: "Client", long: 301220, short: 287880, net: 13340 },
      ],
      fii_index_ls_ratio: [
        { date: "2026-09-07", ratio: 0.92 },
        { date: "2026-09-08", ratio: 0.88 },
        { date: "2026-09-09", ratio: 0.86 },
        { date: "2026-09-10", ratio: 0.84 },
        { date: "2026-09-11", ratio: 0.85 },
      ],
    },
  });
}

function slugify(symbol) {
  return String(symbol).replace(/[^a-zA-Z0-9]/g, "_");
}

function findInstrument(slug) {
  const raw = String(slug || "").toUpperCase();
  const stock = UNIVERSE.find((s) => s.symbol === raw || slugify(s.symbol) === raw);
  if (stock) return { kind: "stock", ...stock };
  const idx = CHART_INDEXES[raw] || Object.entries(CHART_INDEXES).find(([k, v]) => slugify(v.name) === raw);
  if (idx) {
    if (Array.isArray(idx)) return { kind: "index", symbol: idx[1].name, name: idx[1].name, start: idx[1].start };
    return { kind: "index", symbol: idx.name, name: idx.name, start: idx.start };
  }
  const fromIndexList = indices().data.indices.find((i) => i.slug === raw);
  if (fromIndexList) {
    return { kind: "index", symbol: fromIndexList.symbol, name: fromIndexList.symbol, start: fromIndexList.value };
  }
  return null;
}

function chart(slug) {
  const inst = findInstrument(slug);
  if (!inst) return null;
  const start = inst.ltp || inst.start || 100;
  const bars = series(inst.symbol, 252, start * 0.92, inst.symbol.includes("VIX") ? 0.03 : 0.014);
  bars[bars.length - 1].close = inst.ltp || bars[bars.length - 1].close;
  return envelope({
    symbol: inst.symbol,
    name: inst.name,
    kind: inst.kind,
    as_of: AS_OF,
    bars,
    ma: {
      sma_20: sma(bars, 20),
      sma_50: sma(bars, 50),
      sma_200: sma(bars, 200),
    },
  });
}

function fundamentals(slug) {
  const inst = findInstrument(slug);
  if (!inst || inst.kind !== "stock") return null;
  return envelope({
    symbol: inst.symbol,
    name: inst.name,
    sector: inst.sector,
    market_cap_cr: 12000 + (hash(inst.symbol) % 800000),
    pe: +(12 + (hash(inst.symbol + "pe") % 4000) / 100).toFixed(1),
    pb: +(1 + (hash(inst.symbol + "pb") % 1200) / 100).toFixed(2),
    roe: +(8 + (hash(inst.symbol + "roe") % 2800) / 100).toFixed(1),
    debt_equity: +((hash(inst.symbol + "de") % 180) / 100).toFixed(2),
    promoter: 40 + (hash(inst.symbol + "pr") % 35),
  });
}

function fno(slug) {
  const inst = findInstrument(slug);
  const eligible = new Set(["RELIANCE", "HDFCBANK", "ICICIBANK", "TCS", "INFY", "TATAMOTORS", "SBIN", "BHARTIARTL"]);
  if (!inst || !eligible.has(inst.symbol)) return null;
  return envelope({
    symbol: inst.symbol,
    expiry: "2026-09-24",
    futures_ltp: +(inst.ltp * 1.002).toFixed(2),
    basis: +((inst.ltp * 0.002).toFixed(2)),
    oi: 2400000 + (hash(inst.symbol) % 4000000),
    oi_change_pct: +(((hash(inst.symbol + "oi") % 1600) / 100 - 8).toFixed(2)),
    pcr: +((0.6 + (hash(inst.symbol + "pcr") % 80) / 100).toFixed(2)),
  });
}

function depth(slug) {
  const inst = findInstrument(slug);
  if (!inst) return null;
  const mid = inst.ltp || inst.start || 100;
  const bids = Array.from({ length: 5 }, (_, i) => ({
    price: +(mid * (1 - 0.0008 * (i + 1))).toFixed(2),
    qty: 1200 + hash(inst.symbol + "b" + i) % 18000,
  }));
  const asks = Array.from({ length: 5 }, (_, i) => ({
    price: +(mid * (1 + 0.0008 * (i + 1))).toFixed(2),
    qty: 1100 + hash(inst.symbol + "a" + i) % 16000,
  }));
  return envelope({ symbol: inst.symbol, bids, asks });
}

function quote(symbol) {
  const inst = UNIVERSE.find((s) => s.symbol === String(symbol).toUpperCase());
  return inst || null;
}

function search(q) {
  const n = String(q || "").trim().toLowerCase();
  if (!n) return [];
  return UNIVERSE.filter((s) => s.symbol.toLowerCase().includes(n) || s.name.toLowerCase().includes(n) || s.sector.toLowerCase().includes(n)).slice(0, 8);
}

function marketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const open = day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
  const next = new Date(ist);
  if (day === 6) next.setDate(next.getDate() + 2);
  else if (day === 0) next.setDate(next.getDate() + 1);
  else if (!open && mins > 15 * 60 + 30) next.setDate(next.getDate() + (day === 5 ? 3 : 1));
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return {
    status: open ? "open" : "closed",
    label: open ? "Market open" : "Market closed",
    as_of: now.toISOString(),
    next_session: `${y}-${m}-${d}`,
  };
}

export {
  pulse,
  screener,
  sectors,
  indices,
  news,
  institutional,
  chart,
  fundamentals,
  fno,
  depth,
  quote,
  search,
  marketStatus,
  UNIVERSE,
  slugify,
};
