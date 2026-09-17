import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { clsChange, num, pct } from "../lib";

const TIPS = {
  vcp: "Volatility Contraction Pattern — successive pullbacks each shallower than the last.",
  ipo_base: "First base built after listing — sideways range with listing-day high as resistance.",
  high_52w_breakout: "Close above the highest close of the trailing 52 weeks on volume.",
  near_pivot: "Within 3% of the pattern pivot — the buy trigger, not yet crossed.",
};

export default function Screener() {
  const [pack, setPack] = useState(null);
  const [pattern, setPattern] = useState("");
  const [stage, setStage] = useState("");
  const [view, setView] = useState("table");

  useEffect(() => {
    api.screener().then((r) => setPack(r.data));
  }, []);

  const rows = useMemo(() => {
    if (!pack) return [];
    return pack.rows.filter((r) => (!pattern || r.pattern === pattern) && (!stage || r.stage === stage));
  }, [pack, pattern, stage]);

  if (!pack) return <div className="page muted">Loading screener…</div>;

  return (
    <div className="page">
      <div className="page-title">Screener</div>
      <div className="page-sub">Setup-pattern matches from tonight's run. Close of {pack.as_of}.</div>
      <div className="grid-2" style={{ marginTop: 14, gridTemplateColumns: "240px 1fr" }}>
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13 }}>Setup patterns</div>
          <div className="filters" style={{ marginTop: 8 }}>
            {pack.facets.patterns.map((p) => (
              <button key={p.code} className={`filter-btn ${pattern === p.code ? "on" : ""}`} onClick={() => setPattern(pattern === p.code ? "" : p.code)} title={TIPS[p.code]}>
                <span>{p.label}</span>
                <span className="muted tnum">{p.count}</span>
              </button>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 16, letterSpacing: "0.06em" }}>
            BREAKOUT STAGE
          </div>
          <div className="filters" style={{ marginTop: 8 }}>
            {pack.facets.stages.map((s) => (
              <button key={s.code} className={`filter-btn ${stage === s.code ? "on" : ""}`} onClick={() => setStage(stage === s.code ? "" : s.code)}>
                <span style={{ textTransform: "capitalize" }}>{s.code}</span>
                <span className="muted tnum">{s.count}</span>
              </button>
            ))}
          </div>
          <button
            className="btn ghost sm"
            style={{ marginTop: 12 }}
            onClick={() => {
              setPattern("");
              setStage("");
            }}
          >
            Clear filters
          </button>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="muted">{rows.length} matches</div>
            <div>
              <button className={`btn ghost sm ${view === "table" ? "" : ""}`} onClick={() => setView("table")}>
                Table
              </button>{" "}
              <button className="btn ghost sm" onClick={() => setView("cards")}>
                Cards
              </button>
            </div>
          </div>
          {rows.length === 0 && <div className="card muted">No stock matches these filters</div>}
          {view === "table" ? (
            <div className="card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Pattern</th>
                    <th>Stage</th>
                    <th className="right">LTP</th>
                    <th className="right">Chg</th>
                    <th className="right">Vol</th>
                    <th className="right">RS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.symbol}>
                      <td>
                        <Link to={`/chart/${r.symbol}`}>
                          <div style={{ fontWeight: 500 }}>{r.symbol}</div>
                          <div className="muted">{r.name}</div>
                        </Link>
                      </td>
                      <td>
                        <span className="chip accent">{r.pattern.replaceAll("_", " ")}</span>
                      </td>
                      <td>
                        <span className="chip">{r.stage}</span>
                      </td>
                      <td className="right tnum">{num(r.ltp)}</td>
                      <td className={`right tnum ${clsChange(r.change_pct)}`}>{pct(r.change_pct)}</td>
                      <td className="right tnum">{num(r.vol_ratio, 1)}×</td>
                      <td className="right tnum">{r.rs_rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid-3">
              {rows.map((r) => (
                <Link key={r.symbol} className="card" to={`/chart/${r.symbol}`}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{r.symbol}</strong>
                    <span className={`tnum ${clsChange(r.change_pct)}`}>{pct(r.change_pct)}</span>
                  </div>
                  <div className="muted">{r.name}</div>
                  <div className="tnum" style={{ marginTop: 8, fontSize: 18 }}>
                    {num(r.ltp)}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <span className="chip accent">{r.pattern.replaceAll("_", " ")}</span>
                    <span className="chip">{r.stage}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
