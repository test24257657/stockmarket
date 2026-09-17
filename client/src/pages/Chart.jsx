import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import TVChart from "../TVChart";
import { clsChange, num, pct } from "../lib";

const TIMEFRAMES = [
  { id: "1H", label: "1H" },
  { id: "1D", label: "1D" },
  { id: "1M", label: "1M" },
];

const START_DAYS = { "1H": 40, "1D": 400, "1M": 800 };
const NEXT_DAYS = { "1H": [40, 90], "1D": [400, 1000, 2200, 3650], "1M": [800, 2000, 3650] };

function nextWindow(tf, current) {
  const steps = NEXT_DAYS[tf] || NEXT_DAYS["1D"];
  return steps.find((d) => d > current) || null;
}

export default function Chart() {
  const { slug } = useParams();
  const [pack, setPack] = useState(null);
  const [fund, setFund] = useState(null);
  const [tf, setTf] = useState("1D");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [extending, setExtending] = useState(false);
  const daysRef = useRef(START_DAYS["1D"]);
  const inflight = useRef(false);

  useEffect(() => {
    setFund(null);
    if (/NIFTY|VIX|SENSEX/i.test(slug || "")) return;
    api.fundamentals(slug).then((r) => setFund(r.data)).catch(() => {});
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    daysRef.current = START_DAYS[tf] || 400;
    inflight.current = false;
    setPack(null);
    setBusy(true);
    setErr("");
    api
      .chart(slug, tf, daysRef.current)
      .then((r) => {
        if (!cancelled) setPack(r.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.detail || e.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, tf]);

  const onNeedOlder = useCallback(() => {
    const more = nextWindow(tf, daysRef.current);
    if (!more || inflight.current) return;
    inflight.current = true;
    setExtending(true);
    api
      .chart(slug, tf, more)
      .then((r) => {
        daysRef.current = r.data.history_days || more;
        setPack(r.data);
      })
      .catch(() => {})
      .finally(() => {
        inflight.current = false;
        setExtending(false);
      });
  }, [slug, tf]);

  async function watch() {
    try {
      await api.addWatch({ symbol: slug });
      setNote("Added to watchlist");
    } catch (e) {
      setNote(e.detail || "Could not add");
    }
  }

  if (err && !pack) return <div className="page">{err}</div>;
  if (!pack || busy) return <div className="page muted">Loading NSE chart…</div>;

  const last = pack.bars[pack.bars.length - 1];
  const prev = pack.bars[pack.bars.length - 2];
  const price = last?.close;
  const chg = last && prev?.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
  const vs = tf === "1H" ? "vs prev hour" : tf === "1M" ? "vs prev month" : "vs prev day";
  const label = tf === "1H" ? "1-hour candles" : tf === "1M" ? "monthly candles" : "daily candles";
  const canExtend = Boolean(nextWindow(tf, daysRef.current));

  return (
    <div className="page page-chart">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title">
            {pack.symbol} <span className="muted">{pack.name}</span>
          </div>
          <div className="tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
            {num(price)}{" "}
            <span className={`tnum ${clsChange(chg)}`} style={{ fontSize: 14 }}>
              {pct(chg)} <span className="muted">{vs}</span>
            </span>
          </div>
          <div className="muted">
            NSE {label} · {pack.bars.length} bars · SMA 20 / 50 / 200 · solid lines = support / resistance
            {extending ? " · loading older history…" : ""}
          </div>
        </div>
        <button className="btn" onClick={watch}>
          Add to watchlist
        </button>
      </div>
      {note && <div className="muted" style={{ marginTop: 8 }}>{note}</div>}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="tf-bar">
          {TIMEFRAMES.map((t) => (
            <button key={t.id} className={`tf-btn ${tf === t.id ? "on" : ""}`} onClick={() => setTf(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <TVChart
          bars={pack.bars}
          ma={pack.ma}
          intraday={tf === "1H"}
          onNeedOlder={onNeedOlder}
          canExtend={canExtend}
        />
      </div>
      {fund && (
        <div className="card" style={{ marginTop: 10 }}>
          <h3>Fundamentals</h3>
          <div className="muted">{fund.sector}</div>
          <div style={{ marginTop: 8, fontSize: 13, display: "grid", gap: 6 }}>
            {fund.pe != null && <div>P/E {fund.pe}</div>}
            {fund.pb != null && <div>P/B {fund.pb}</div>}
            {fund.week_high != null && <div>52w high {fund.week_high}</div>}
            {fund.week_low != null && <div>52w low {fund.week_low}</div>}
            {fund.isin && <div className="muted">{fund.isin}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
