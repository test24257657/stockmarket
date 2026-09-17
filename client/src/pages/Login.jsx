import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("admin123@gmail.com");
  const [password, setPassword] = useState("admin@1234567890");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(email, password);
      nav(loc.state?.from || "/pulse", { replace: true });
    } catch (ex) {
      setErr(ex.detail || "Incorrect email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <div className="brand" style={{ padding: 0, marginBottom: 16 }}>
          <div className="brand-mark" />
          <div className="brand-name">Swing Terminal</div>
        </div>
        <div className="page-title">Sign in</div>
        <div className="page-sub">Post-close NSE swing terminal — pulse, setups, watchlist alerts.</div>
        <div style={{ marginTop: 16 }}>
          <div className="muted">Email</div>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="muted">Password</div>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy}>
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
