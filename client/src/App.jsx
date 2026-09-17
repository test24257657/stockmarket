import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import AppShell from "./AppShell";
import Login from "./pages/Login";
import Pulse from "./pages/Pulse";
import Screener from "./pages/Screener";
import Watchlist from "./pages/Watchlist";
import Sectors from "./pages/Sectors";
import Indices from "./pages/Indices";
import News from "./pages/News";
import Institutional from "./pages/Institutional";
import Chart from "./pages/Chart";

function Guard({ children }) {
  const { email, ready } = useAuth();
  if (!ready) return <div className="page muted">Loading…</div>;
  if (!email) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { email, ready } = useAuth();
  if (!ready) return <div className="page muted">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={email ? <Navigate to="/pulse" replace /> : <Login />} />
      <Route
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route path="/" element={<Navigate to="/pulse" replace />} />
        <Route path="/pulse" element={<Pulse />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/sectors" element={<Sectors />} />
        <Route path="/indices" element={<Indices />} />
        <Route path="/news" element={<News />} />
        <Route path="/institutional" element={<Institutional />} />
        <Route path="/chart/:slug" element={<Chart />} />
      </Route>
      <Route path="*" element={<Navigate to="/pulse" replace />} />
    </Routes>
  );
}
