import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Spark, clsChange, num, pct } from "../lib";

export default function Pulse() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const [asOf, setAsOf] = useState("");
  useEffect(() => {
    function load() {
      api
        .pulse()
        .then((r) => {
          setData(r.data);
          setAsOf(r.meta?.as_of || r.data?.as_of || "");
        })
        .catch((e) => setErr(e.message));
    }
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (err) return <div className="page">{err}</div>;
  if (!data) return <div className="page muted">Loading Market Pulse…</div>;

  const { tiles, breadth, flows, vix, most_active, breakouts_52w } = data;
  const lastFlow = flows?.series?.[flows.series.length - 1];
  const combined = lastFlow ? lastFlow.fii_net + lastFlow.dii_net : 0;

  return (
    <div className="page">
      <div className="page-title">Market Pulse</div>
      <div className="page-sub">
        NSE India snapshot (refreshes every 60s). Last session {data.as_of}
        {asOf ? ` · ${asOf}` : ""}. Weekend/holiday prints stay unchanged until the next cash session.
      </div>

      <div className="grid-4" style={{ marginTop: 14 }}>
        {tiles.map((t) => (
          <Link key={t.symbol} className="card" to={`/chart/${t.symbol.replace(/\s+/g, "_")}`}>
            <div className="muted">{t.symbol}</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
              {num(t.value, 2)}
            </div>
            <div className={`tnum ${clsChange(t.change_pct)}`} style={{ fontSize: 13 }}>
              {num(t.change, 2)} ({pct(t.change_pct)})
            </div>
            <Spark values={t.spark} up={t.change_pct >= 0} />
          </Link>
        ))}
      </div>

      <div className="grid-3" style={{ marginTop: 10 }}>
        <div className="card">
          <h3>Market breadth</h3>
          <div className="muted">Advances vs declines · {(breadth.traded || 0).toLocaleString("en-IN")} names</div>
          <div style={{ marginTop: 12, height: 10, display: "flex", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${(breadth.advances / breadth.traded) * 100}%`, background: "#15803d" }} />
            <div style={{ width: `${(breadth.unchanged / breadth.traded) * 100}%`, background: "#c4c0cc" }} />
            <div style={{ flex: 1, background: "#b91c1c" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
            <span className="up">{breadth.advances} adv</span>
            <span className="muted">{breadth.unchanged} flat</span>
            <span className="down">{breadth.declines} dec</span>
          </div>
          <div className="muted" style={{ marginTop: 10 }}>
            A/D ratio {breadth.ad_ratio} — declining stocks roughly balanced — no clear direction today.
          </div>
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div>
              <div className="muted">Above 50 DMA</div>
              <div className="tnum">{breadth.pct_above_50dma == null ? "—" : `${breadth.pct_above_50dma}%`}</div>
            </div>
            <div>
              <div className="muted">Above 200 DMA</div>
              <div className="tnum">{breadth.pct_above_200dma == null ? "—" : `${breadth.pct_above_200dma}%`}</div>
            </div>
            <div>
              <div className="muted">New 52w highs</div>
              <div className="tnum">{breadth.new_52w_highs}</div>
            </div>
            <div>
              <div className="muted">New 52w lows</div>
              <div className="tnum">{breadth.new_52w_lows}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>FII / DII flow · NSE session</h3>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }} className="muted">
            <span>FII</span>
            <span>DII</span>
          </div>
          {(flows.series || []).map((s) => (
            <div key={s.date} style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13 }}>
              <span className="muted">{String(s.date).slice(5)}</span>
              <span className={clsChange(s.fii_net)}>FII {num(s.fii_net, 1)}</span>
              <span className={clsChange(s.dii_net)}>DII {num(s.dii_net, 1)}</span>
            </div>
          ))}
          {lastFlow && (
            <div className="card" style={{ marginTop: 12, padding: 10, background: "var(--bg)" }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {lastFlow.fii_net < 0 && lastFlow.dii_net > 0
                  ? "DII cushioning FII selling"
                  : lastFlow.fii_net > 0 && lastFlow.dii_net > 0
                    ? "Broad institutional buying"
                    : "Institutional flow"}
              </div>
              <div className="muted">
                FII {num(lastFlow.fii_net, 1)} cr · DII {num(lastFlow.dii_net, 1)} cr — combined {num(combined, 1)} cr.
              </div>
            </div>
          )}
          <div className="muted" style={{ marginTop: 10 }}>
            Latest NSE FII/DII report (₹ cr)
          </div>
        </div>

        <div className="card">
          <h3>Volatility</h3>
          <div className="muted">INDIA VIX · {vix?.band || "—"} band</div>
          <div className="tnum" style={{ fontSize: 32, fontWeight: 600, marginTop: 8 }}>
            {vix?.value ?? "—"}
          </div>
          <div className={`tnum ${clsChange(-(vix?.change || 0))}`}>{pct(vix?.change_pct)}</div>
          <div className="card" style={{ marginTop: 12, padding: 10, background: "var(--bg)" }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{vix?.verdict}</div>
            <div className="muted">{vix?.advice}</div>
          </div>
          <div className="faint" style={{ marginTop: 12 }}>
            {vix?.percentile_250d ?? "—"} vs 52w range · source: NSE INDIA VIX
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 10 }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px" }}>
            <h3>Most active by value</h3>
            <div className="muted">NSE cash most-active by value</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="right">LTP</th>
                <th className="right">Chg</th>
                <th className="right">Value ₹cr</th>
              </tr>
            </thead>
            <tbody>
              {most_active.map((r) => (
                <tr key={r.symbol}>
                  <td>
                    <Link to={`/chart/${r.symbol}`}>
                      <div style={{ fontWeight: 500 }}>{r.symbol}</div>
                      <div className="muted">{r.name}</div>
                    </Link>
                  </td>
                  <td className="right tnum">{num(r.ltp)}</td>
                  <td className={`right tnum ${clsChange(r.change_pct)}`}>{pct(r.change_pct)}</td>
                  <td className="right tnum">{num(r.turnover_cr, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px" }}>
            <h3>52-week high breakouts</h3>
            <div className="muted">NSE new 52-week highs (LTP ≥ ₹20)</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="right">LTP</th>
                <th className="right">Chg</th>
                <th className="right">Vol ratio</th>
              </tr>
            </thead>
            <tbody>
              {breakouts_52w.map((r) => (
                <tr key={r.symbol}>
                  <td>
                    <Link to={`/chart/${r.symbol}`}>
                      <div style={{ fontWeight: 500 }}>{r.symbol}</div>
                      <div className="muted">{r.name}</div>
                    </Link>
                  </td>
                  <td className="right tnum">{num(r.ltp)}</td>
                  <td className={`right tnum ${clsChange(r.change_pct)}`}>{pct(r.change_pct)}</td>
                  <td className="right tnum">{r.vol_ratio == null ? "—" : num(r.vol_ratio, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
