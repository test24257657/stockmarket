import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { clsChange, num, pct } from "../lib";

export default function Sectors() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.sectors().then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="page muted">Loading sectors…</div>;

  return (
    <div className="page">
      <div className="page-title">Sector Rotation</div>
      <div className="page-sub">1M / 3M ranking, rank deltas, and constituents. Close of {data.as_of}.</div>
      <div className="card" style={{ marginTop: 14, padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Sector</th>
              <th className="right">1M</th>
              <th className="right">3M</th>
              <th className="right">Rank 1M</th>
              <th className="right">Δ</th>
              <th className="right">RS</th>
            </tr>
          </thead>
          <tbody>
            {data.sectors.map((s) => (
              <Fragment key={s.name}>
                <tr onClick={() => setOpen(open === s.name ? null : s.name)} style={{ cursor: "pointer" }}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td className={`right tnum ${clsChange(s.ret_1m)}`}>{pct(s.ret_1m)}</td>
                  <td className={`right tnum ${clsChange(s.ret_3m)}`}>{pct(s.ret_3m)}</td>
                  <td className="right tnum">{s.rank_1m}</td>
                  <td className={`right tnum ${clsChange(s.rank_delta)}`}>{s.rank_delta > 0 ? `+${s.rank_delta}` : s.rank_delta}</td>
                  <td className="right tnum">{s.rs}</td>
                </tr>
                {open === s.name &&
                  s.constituents.map((c) => (
                    <tr key={c.symbol}>
                      <td colSpan={2}>
                        <Link to={`/chart/${c.symbol}`}>
                          {c.symbol} <span className="muted">{c.name}</span>
                        </Link>
                      </td>
                      <td className="right tnum">{num(c.ltp)}</td>
                      <td className={`right tnum ${clsChange(c.change_pct)}`} colSpan={3}>
                        {pct(c.change_pct)}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
