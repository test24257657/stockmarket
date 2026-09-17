import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { clsChange, num, pct } from "../lib";

export default function Indices() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.indices().then((r) => setData(r.data));
  }, []);
  if (!data) return <div className="page muted">Loading indices…</div>;
  return (
    <div className="page">
      <div className="page-title">Indices</div>
      <div className="page-sub">Broad-market and sector indices. Close of {data.as_of}.</div>
      <div className="grid-3" style={{ marginTop: 14 }}>
        {data.indices.map((i) => (
          <Link key={i.slug} className="card" to={`/chart/${i.slug}`}>
            <div className="muted">{i.category}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{i.symbol}</div>
            <div className="tnum" style={{ fontSize: 22, marginTop: 8 }}>
              {num(i.value, 2)}
            </div>
            <div className={`tnum ${clsChange(i.change_pct)}`}>{pct(i.change_pct)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
