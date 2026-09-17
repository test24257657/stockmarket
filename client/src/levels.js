/**
 * Same S/R as Swing Terminal:
 * 3-bar swing highs/lows, merge within 1.5%, keep top 3 by touch count.
 */
const LOOK = 3;
const MERGE_PCT = 1.5;
const MAX_LEVELS = 3;
const SESSION_WINDOW = 252;

function cluster(values, mergePct) {
  const sorted = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const price of sorted) {
    const last = groups.at(-1);
    const avg = last ? last.reduce((s, x) => s + x, 0) / last.length : null;
    if (last && avg != null && 100 * Math.abs(price / avg - 1) <= mergePct) last.push(price);
    else groups.push([price]);
  }
  return groups.map((g) => ({
    price: g.reduce((s, x) => s + x, 0) / g.length,
    touches: g.length,
  }));
}

export function supportResistance(bars) {
  const window = (bars || []).slice(-SESSION_WINDOW);
  if (window.length < 2 * LOOK + 1) return { resistance: [], support: [] };

  const close = window[window.length - 1].close;
  if (close == null) return { resistance: [], support: [] };

  const highs = [];
  const lows = [];
  for (let i = LOOK; i < window.length - LOOK; i++) {
    const high = window[i].high;
    const low = window[i].low;
    if (high == null || low == null) continue;
    const slice = window.slice(i - LOOK, i + LOOK + 1);
    const peak = Math.max(...slice.map((b) => (b.high != null ? b.high : -Infinity)));
    const trough = Math.min(...slice.map((b) => (b.low != null ? b.low : Infinity)));
    if (high === peak) highs.push(high);
    if (low === trough) lows.push(low);
  }

  const resistance = cluster(
    highs.filter((p) => p > close),
    MERGE_PCT
  )
    .sort((a, b) => b.touches - a.touches || a.price - b.price)
    .slice(0, MAX_LEVELS)
    .map((g) => ({
      label: `R · ${g.touches}×`,
      type: "resistance",
      price: +g.price.toFixed(2),
      hits: g.touches,
    }));

  const support = cluster(
    lows.filter((p) => p < close),
    MERGE_PCT
  )
    .sort((a, b) => b.touches - a.touches || b.price - a.price)
    .slice(0, MAX_LEVELS)
    .map((g) => ({
      label: `S · ${g.touches}×`,
      type: "support",
      price: +g.price.toFixed(2),
      hits: g.touches,
    }));

  return { resistance, support };
}
