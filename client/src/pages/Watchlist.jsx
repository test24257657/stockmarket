import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { clsChange, num, pct } from "../lib";

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [kind, setKind] = useState("price_above");
  const [threshold, setThreshold] = useState("");

  async function load() {
    const r = await api.watchlist();
    setItems(r.data);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function add(e) {
    e.preventDefault();
    setErr("");
    try {
      await api.addWatch({ symbol, entry_price: entry ? Number(entry) : null });
      setSymbol("");
      setEntry("");
      await load();
    } catch (ex) {
      setErr(ex.detail || "Could not add symbol.");
    }
  }

  async function addAlert(id) {
    await api.addAlert(id, { kind, threshold: Number(threshold) });
    setThreshold("");
    await load();
  }

  return (
    <div className="page">
      <div className="page-title">Watchlist</div>
      <div className="page-sub">Symbols you're tracking, with entry price and EOD alerts.</div>

      <form className="card" onSubmit={add} style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 8 }}>
        <div>
          <div className="muted">Symbol</div>
          <input className="input" placeholder="TATAMOTORS" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </div>
        <div>
          <div className="muted">Entry price (optional)</div>
          <input className="input" value={entry} onChange={(e) => setEntry(e.target.value)} />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button className="btn">Add</button>
        </div>
      </form>
      {err && <div className="err">{err}</div>}

      {items.length === 0 && (
        <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
          <div>Nothing on the watchlist yet</div>
          <Link to="/screener" className="btn" style={{ display: "inline-flex", marginTop: 10, alignItems: "center" }}>
            Open screener
          </Link>
        </div>
      )}

      <div className="card" style={{ marginTop: 12, padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th className="right">LTP</th>
              <th className="right">Chg</th>
              <th className="right">Entry</th>
              <th className="right">Unrealised</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const pnl = it.entry_price && it.ltp ? ((it.ltp - it.entry_price) / it.entry_price) * 100 : null;
              return (
                <Fragment key={it.id}>
                  <tr>
                    <td>
                      <Link to={`/chart/${it.symbol}`}>
                        <div style={{ fontWeight: 500 }}>{it.symbol}</div>
                        <div className="muted">{it.name}</div>
                      </Link>
                      <div className="faint">{it.alerts.length ? `${it.alerts.length} alerts` : "no alerts"}</div>
                    </td>
                    <td className="right tnum">{num(it.ltp)}</td>
                    <td className={`right tnum ${clsChange(it.change_pct)}`}>{pct(it.change_pct)}</td>
                    <td className="right tnum">{it.entry_price ? num(it.entry_price) : "—"}</td>
                    <td className={`right tnum ${clsChange(pnl)}`}>{pnl == null ? "—" : pct(pnl)}</td>
                    <td className="right">
                      <button className="btn ghost sm" onClick={() => setOpen(open === it.id ? null : it.id)}>
                        edit alerts
                      </button>{" "}
                      <button
                        className="btn ghost sm"
                        onClick={async () => {
                          await api.removeWatch(it.id);
                          await load();
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  {open === it.id && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--bg)" }}>
                        <div className="muted">ALERTS · {it.symbol}</div>
                        {it.alerts.length === 0 && <div className="muted">No alerts yet.</div>}
                        {it.alerts.map((a) => (
                          <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, fontSize: 13 }}>
                            <span>
                              {a.kind === "price_above" ? "Alert if price rises above" : "Alert if price falls below"} {num(a.threshold)}
                            </span>
                            {a.triggered_at && (
                              <span className="chip up">
                                triggered {a.triggered_at} @ {num(a.triggered_price)}
                              </span>
                            )}
                            <button className="btn ghost sm" onClick={async () => { await api.removeAlert(a.id); await load(); }}>
                              ×
                            </button>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <select className="input" style={{ width: 220 }} value={kind} onChange={(e) => setKind(e.target.value)}>
                            <option value="price_above">Alert if price rises above</option>
                            <option value="price_below">Alert if price falls below</option>
                          </select>
                          <input className="input" style={{ width: 140 }} value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="Threshold" />
                          <button className="btn sm" type="button" onClick={() => addAlert(it.id)}>
                            Add alert
                          </button>
                        </div>
                        <div className="faint" style={{ marginTop: 8 }}>
                          evaluated once nightly against that session's high/low — not live intraday
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
