import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, ColorType, HistogramSeries, LineSeries, createChart } from "lightweight-charts";
import { supportResistance } from "./levels";
import { clsChange, num, pct } from "./lib";

function formatTime(t, intraday) {
  if (t == null) return "";
  if (typeof t === "number") {
    return new Date(t * 1000).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const d = new Date(`${t}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return String(t);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeBars(bars) {
  const byTime = new Map();
  const seen = new Set();
  const candleData = [];
  for (const b of bars || []) {
    const t = b.time;
    if (t == null || seen.has(t)) continue;
    seen.add(t);
    candleData.push({ time: t, open: b.open, high: b.high, low: b.low, close: b.close });
    byTime.set(t, b);
  }
  candleData.sort((a, b) => (a.time < b.time ? -1 : 1));
  const prevClose = new Map();
  for (let i = 1; i < candleData.length; i++) {
    prevClose.set(candleData[i].time, candleData[i - 1].close);
  }
  return { candleData, byTime, prevClose };
}

const DEFAULT_H = () => Math.round(window.innerHeight * 0.7);
const VIEWPORT = 90;
const EDGE = 12;

export default function TVChart({ bars, ma, intraday, onNeedOlder, canExtend }) {
  const host = useRef(null);
  const wrap = useRef(null);
  const engine = useRef(null);
  const lines = useRef([]);
  const firstPaint = useRef(true);
  const [tip, setTip] = useState(null);
  const [levels, setLevels] = useState({ resistance: [], support: [] });
  const [height, setHeight] = useState(DEFAULT_H);

  useEffect(() => {
    const onWin = () => setHeight((h) => Math.min(h, Math.round(window.innerHeight * 0.92)));
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, []);

  function startResize(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const move = (ev) => {
      const next = startH + (ev.clientY - startY);
      setHeight(Math.max(280, Math.min(Math.round(window.innerHeight * 0.92), next)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    firstPaint.current = true;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#5c5668",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "#f0eef6" },
        horzLines: { color: "#f0eef6" },
      },
      rightPriceScale: { borderColor: "#e4e2ea" },
      timeScale: {
        borderColor: "#e4e2ea",
        timeVisible: !!intraday,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#15803d",
      downColor: "#b91c1c",
      borderUpColor: "#15803d",
      borderDownColor: "#b91c1c",
      wickUpColor: "#15803d",
      wickDownColor: "#b91c1c",
    });
    const sma20 = chart.addSeries(LineSeries, { color: "#7c3aed", lineWidth: 2, priceLineVisible: false });
    const sma50 = chart.addSeries(LineSeries, { color: "#2563eb", lineWidth: 1, priceLineVisible: false });
    const sma200 = chart.addSeries(LineSeries, { color: "#c2410c", lineWidth: 1, priceLineVisible: false });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    engine.current = { chart, candles, sma20, sma50, sma200, volume };
    return () => {
      engine.current = null;
      lines.current = [];
      chart.remove();
    };
  }, [intraday]);

  useEffect(() => {
    const api = engine.current;
    const el = host.current;
    if (!api || !el || !bars?.length) return;

    const { candleData, byTime, prevClose } = normalizeBars(bars);
    if (!candleData.length) return;

    const keep = api.chart.timeScale().getVisibleRange();
    try {
      api.candles.setData(candleData);
    } catch {
      return;
    }

    const times = new Set(candleData.map((b) => b.time));
    const line = (series, pts) => {
      series.setData((pts || []).filter((p) => times.has(p.time)).map((p) => ({ time: p.time, value: p.value })));
    };
    line(api.sma20, ma?.sma_20);
    line(api.sma50, ma?.sma_50);
    line(api.sma200, ma?.sma_200);
    api.volume.setData(
      candleData.map((b) => ({
        time: b.time,
        value: byTime.get(b.time)?.volume || 0,
        color: b.close >= b.open ? "rgba(21,128,61,0.35)" : "rgba(185,28,28,0.35)",
      }))
    );

    for (const pl of lines.current) {
      try {
        api.candles.removePriceLine(pl);
      } catch {
        /* already gone */
      }
    }
    lines.current = [];
    const { resistance, support } = supportResistance(candleData);
    setLevels({ resistance, support });
    for (const lv of resistance) {
      lines.current.push(
        api.candles.createPriceLine({
          price: lv.price,
          color: "#9a3412",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: lv.label,
        })
      );
    }
    for (const lv of support) {
      lines.current.push(
        api.candles.createPriceLine({
          price: lv.price,
          color: "#1e3a8a",
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: lv.label,
        })
      );
    }

    if (firstPaint.current) {
      const n = candleData.length;
      const from = Math.max(0, n - VIEWPORT);
      api.chart.timeScale().setVisibleLogicalRange({ from, to: n + 2 });
      firstPaint.current = false;
    } else if (keep) {
      api.chart.timeScale().setVisibleRange(keep);
    }

    const timeKey = (t) => {
      if (t && typeof t === "object" && t.year) {
        return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
      }
      return t;
    };

    const onMove = (param) => {
      if (!param?.point || !param.time || !wrap.current) {
        setTip(null);
        return;
      }
      const key = timeKey(param.time);
      const bar = byTime.get(key);
      if (!bar) {
        setTip(null);
        return;
      }
      const prev = prevClose.get(key);
      const chg = prev ? ((bar.close - prev) / prev) * 100 : ((bar.close - bar.open) / bar.open) * 100;
      const box = wrap.current.getBoundingClientRect();
      let left = param.point.x + 16;
      let top = param.point.y + 12;
      if (left > box.width - 200) left = param.point.x - 188;
      if (top > box.height - 160) top = param.point.y - 140;
      setTip({
        left,
        top,
        time: formatTime(key, intraday),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        chg,
      });
    };

    const onRange = (range) => {
      if (!range || !canExtend || !onNeedOlder) return;
      if (range.from <= EDGE) onNeedOlder();
    };

    api.chart.subscribeCrosshairMove(onMove);
    api.chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => {
      api.chart.unsubscribeCrosshairMove(onMove);
      api.chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
    };
  }, [bars, ma, intraday, onNeedOlder, canExtend]);

  if (!bars?.length) return <div className="muted">No NSE history for this symbol.</div>;
  return (
    <div className="tv-wrap" ref={wrap}>
      <div ref={host} className="tv-chart" style={{ height }} />
      <button type="button" className="tv-resize" aria-label="Resize chart" onMouseDown={startResize} />
      {(levels.resistance.length > 0 || levels.support.length > 0) && (
        <div className="sr-legend">
          {levels.resistance.map((lv) => (
            <span key={`${lv.label}-${lv.price}`} className="sr-r">
              {lv.label} {num(lv.price)}
            </span>
          ))}
          {levels.support.map((lv) => (
            <span key={`${lv.label}-${lv.price}`} className="sr-s">
              {lv.label} {num(lv.price)}
            </span>
          ))}
        </div>
      )}
      {tip && (
        <div className="tv-tip" style={{ left: tip.left, top: tip.top }}>
          <div className="tv-tip-date">{tip.time}</div>
          <div>
            O <span className="tnum">{num(tip.open)}</span>
          </div>
          <div>
            H <span className="tnum">{num(tip.high)}</span>
          </div>
          <div>
            L <span className="tnum">{num(tip.low)}</span>
          </div>
          <div>
            C <span className="tnum">{num(tip.close)}</span>
          </div>
          <div className={clsChange(tip.chg)}>Chg {pct(tip.chg)}</div>
          <div className="muted">Vol {Number(tip.volume || 0).toLocaleString("en-IN")}</div>
        </div>
      )}
    </div>
  );
}
