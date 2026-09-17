import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { clsChange, num } from "../lib";

export default function Institutional() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.institutional().then((r) => setData(r.data));
  }, []);
  if (!data) return <div className="page muted">Loading institutional…</div>;
  return (
    <div className="page">
      <div className="page-title">Institutional</div>
      <div className="page-sub">Bulk/block deals and participant-wise open interest. Close of {data.as_of}.</div>
      <div className="card" style={{ marginTop: 14, padding: 0 }}>
        <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13 }}>Bulk / block deals</div>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Client</th>
              <th className="right">Qty</th>
              <th className="right">Avg</th>
            </tr>
          </thead>
          <tbody>
            {data.bulk_deals.map((d, i) => (
              <tr key={i}>
                <td>{d.date}</td>
                <td>
                  <Link to={`/chart/${d.symbol}`}>
                    {d.symbol}
                    {d.repeat_accumulation && <span className="chip accent">repeat</span>}
                  </Link>
                </td>
                <td className={d.side === "buy" ? "up" : "down"}>{d.side}</td>
                <td>{d.client}</td>
                <td className="right tnum">{d.qty.toLocaleString("en-IN")}</td>
                <td className="right tnum">{num(d.avg_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 10, padding: 0 }}>
        <div style={{ padding: "12px 16px", fontWeight: 600, fontSize: 13 }}>Participant OI</div>
        <table className="table">
          <thead>
            <tr>
              <th>Participant</th>
              <th className="right">Long</th>
              <th className="right">Short</th>
              <th className="right">Net</th>
            </tr>
          </thead>
          <tbody>
            {data.participant_oi.rows.map((r) => (
              <tr key={r.participant}>
                <td>{r.participant}</td>
                <td className="right tnum">{r.long.toLocaleString("en-IN")}</td>
                <td className="right tnum">{r.short.toLocaleString("en-IN")}</td>
                <td className={`right tnum ${clsChange(r.net)}`}>{r.net.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 16 }} className="muted">
          FII index futures L/S ratio: {data.participant_oi.fii_index_ls_ratio.map((x) => `${x.date.slice(5)} ${x.ratio}`).join(" · ")}
        </div>
      </div>
    </div>
  );
}
