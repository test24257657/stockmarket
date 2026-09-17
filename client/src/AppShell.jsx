import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";

const NAV = [
  { to: "/pulse", label: "Market Pulse" },
  { to: "/screener", label: "Screener" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/sectors", label: "Sector Rotation" },
  { to: "/indices", label: "Indices" },
  { to: "/news", label: "News" },
  { to: "/institutional", label: "Institutional" },
];

export default function AppShell() {
  const { email, logout } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.status().then(setStatus).catch(() => {});
    const t = setInterval(() => api.status().then(setStatus).catch(() => {}), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      api.search(q).then((r) => setHits(r.results || [])).catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" />
          <div className="brand-name">Swing Terminal</div>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setOpen(false)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn ghost sm menu-btn" onClick={() => setOpen((v) => !v)}>
            Menu
          </button>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any NSE stock or index…" />
          {hits.length > 0 && (
            <div className="search-pop">
              {hits.map((h) => (
                <Link
                  key={`${h.kind}-${h.symbol}`}
                  to={`/chart/${h.kind === "index" ? h.symbol.replace(/\s+/g, "_") : h.symbol}`}
                  onClick={() => {
                    setQ("");
                    setHits([]);
                  }}
                >
                  <strong>{h.symbol}</strong>
                  <div className="muted">
                    {h.name}
                    {h.kind === "index" ? " · index" : ""}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <span className="pill">
            <span className={`dot ${status?.status || "closed"}`} />
            {status?.label || "Market closed"}
          </span>
          <span className="muted" style={{ fontFamily: "ui-monospace, monospace" }}>
            {status?.nse?.tradeDate ? `NSE ${status.nse.tradeDate}` : status?.as_of ? `as of ${new Date(status.as_of).toLocaleString("en-IN")}` : "waiting for NSE"}
          </span>
          <span className="muted">{email}</span>
          <button
            className="btn ghost sm"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            Sign out
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
