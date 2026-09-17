import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function News() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.news().then((r) => setData(r.data));
  }, []);
  if (!data) return <div className="page muted">Loading news…</div>;
  return (
    <div className="page">
      <div className="page-title">News</div>
      <div className="page-sub">Corporate announcements for the interesting-symbol universe, classified by likely impact.</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {data.items.map((n) => (
          <div className="card" key={n.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link to={`/chart/${n.symbol}`} style={{ fontWeight: 600 }}>
                {n.symbol}
              </Link>
              <span className="chip">{n.category}</span>
              <span className={`chip ${n.impact === "positive" ? "up" : n.impact === "negative" ? "down" : ""}`}>{n.impact}</span>
              <span className="muted">{n.published_at.replace("T", " ").slice(0, 16)}</span>
            </div>
            <div style={{ marginTop: 6 }}>{n.headline}</div>
            <div className="muted">{n.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
