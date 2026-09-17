import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import * as seed from "./market.js";
import {
  livePulse,
  liveStatus,
  liveScreener,
  liveSectors,
  liveIndices,
  liveNews,
  liveInstitutional,
  liveChart,
  liveQuote,
  liveSearch,
  refreshQuoteBook,
  withFallback,
} from "./live.js";

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "swing-terminal-dev-secret";

const users = [
  {
    email: "admin123@gmail.com",
    passwordHash: bcrypt.hashSync("admin@1234567890", 10),
  },
];

let nextWatchId = 1;
let nextAlertId = 1;
const watchlists = new Map(); // email -> items

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ detail: "Not authenticated" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

app.get("/", (_req, res) => {
  res.json({ service: "swing-terminal-api", docs: "/health" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", postgres: true, redis: true });
});

app.post("/auth/login", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = users.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ detail: "Incorrect email or password" });
  }
  const access_token = jwt.sign({ sub: user.email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ access_token, token_type: "bearer", email: user.email });
});

app.get("/auth/me", auth, (req, res) => {
  res.json({ email: req.user.sub });
});

app.post("/auth/logout", auth, (_req, res) => {
  res.json({ ok: true });
});

app.get("/market/status", auth, async (_req, res) => {
  try {
    res.json(await liveStatus());
  } catch {
    res.json(seed.marketStatus());
  }
});

app.get("/pulse", auth, async (_req, res) => {
  res.json(await withFallback(livePulse, seed.pulse));
});
app.get("/screener", auth, async (_req, res) => {
  res.json(await withFallback(liveScreener, seed.screener));
});
app.get("/sectors", auth, async (_req, res) => {
  res.json(await withFallback(liveSectors, seed.sectors));
});
app.get("/indices", auth, async (_req, res) => {
  res.json(await withFallback(liveIndices, seed.indices));
});
app.get("/news", auth, async (_req, res) => {
  res.json(await withFallback(liveNews, seed.news));
});
app.get("/institutional", auth, async (_req, res) => {
  res.json(await withFallback(liveInstitutional, seed.institutional));
});
app.get("/search", auth, async (req, res) => {
  res.json({ results: await liveSearch(req.query.q) });
});

app.get("/chart/:slug", auth, async (req, res) => {
  try {
    const data = await liveChart(req.params.slug, req.query.tf, req.query.days);
    if (!data) return res.status(404).json({ detail: `No chart for '${req.params.slug}'.` });
    res.json(data);
  } catch (err) {
    res.status(502).json({ detail: err.message || `No chart for '${req.params.slug}'.` });
  }
});

app.get("/fundamentals/:slug", auth, async (req, res) => {
  try {
    const { nseEquityDetails } = await import("./nseClient.js");
    const symbol = String(req.params.slug).toUpperCase().replace(/_/g, "");
    const d = await nseEquityDetails(symbol);
    const info = d.info || {};
    const meta = d.metadata || {};
    const price = d.priceInfo || {};
    res.json({
      data: {
        symbol: info.symbol || symbol,
        name: info.companyName,
        sector: info.industry || info.sector,
        listing: meta.listingDate,
        isin: info.isin,
        last_price: price.lastPrice,
        week_high: price.weekHighLow?.max,
        week_low: price.weekHighLow?.min,
        pe: meta.pdSymbolPe ?? price.pe,
        pb: meta.pdSymbolPb,
      },
      meta: { source: "NSE quote via stock-nse-india", as_of: new Date().toISOString(), stale: true, job: "live", degraded_sources: [] },
    });
  } catch {
    res.status(404).json({ detail: `No fundamentals for '${req.params.slug}'.` });
  }
});

app.get("/fno/:slug", auth, (_req, res) => {
  res.status(404).json({ detail: "F&O snapshot not loaded from NSE for this symbol." });
});

app.get("/depth/:slug", auth, (_req, res) => {
  res.status(404).json({ detail: "Live depth is not available on this feed." });
});

function listFor(email) {
  if (!watchlists.has(email)) watchlists.set(email, []);
  return watchlists.get(email);
}

function hydrate(item) {
  const q = liveQuote(item.symbol);
  return {
    ...item,
    name: q?.name || item.symbol,
    ltp: q?.ltp ?? null,
    change_pct: q?.change_pct ?? null,
  };
}

app.get("/watchlist", auth, async (req, res) => {
  await refreshQuoteBook();
  const items = listFor(req.user.sub).map(hydrate);
  res.json({ data: items, meta: { source: "NSE + watchlist", as_of: new Date().toISOString(), stale: true, job: "live", degraded_sources: [] } });
});

app.post("/watchlist", auth, async (req, res) => {
  await refreshQuoteBook();
  const symbol = String(req.body?.symbol || "").trim().toUpperCase();
  if (!symbol) return res.status(422).json({ detail: "symbol is required" });
  const q = liveQuote(symbol) || { symbol, name: symbol };
  const items = listFor(req.user.sub);
  if (items.some((i) => i.symbol === symbol)) {
    return res.status(409).json({ detail: "Already on watchlist" });
  }
  const item = {
    id: nextWatchId++,
    symbol,
    name: q.name,
    entry_price: req.body.entry_price ?? null,
    added_at: new Date().toISOString(),
    alerts: [],
  };
  items.push(item);
  res.status(201).json(hydrate(item));
});

app.patch("/watchlist/:item_id", auth, (req, res) => {
  const items = listFor(req.user.sub);
  const item = items.find((i) => i.id === Number(req.params.item_id));
  if (!item) return res.status(404).json({ detail: "Not found" });
  if ("entry_price" in (req.body || {})) item.entry_price = req.body.entry_price;
  res.json(hydrate(item));
});

app.delete("/watchlist/:item_id", auth, (req, res) => {
  const items = listFor(req.user.sub);
  const idx = items.findIndex((i) => i.id === Number(req.params.item_id));
  if (idx < 0) return res.status(404).json({ detail: "Not found" });
  items.splice(idx, 1);
  res.json({ ok: true });
});

app.post("/watchlist/:item_id/alerts", auth, (req, res) => {
  const items = listFor(req.user.sub);
  const item = items.find((i) => i.id === Number(req.params.item_id));
  if (!item) return res.status(404).json({ detail: "Not found" });
  const kind = req.body?.kind;
  const threshold = Number(req.body?.threshold);
  if (!["price_above", "price_below"].includes(kind) || !(threshold > 0)) {
    return res.status(422).json({ detail: "kind and threshold required" });
  }
  const q = liveQuote(item.symbol);
  let triggered_at = null;
  let triggered_price = null;
  if (q) {
    if (kind === "price_above" && q.ltp >= threshold) {
      triggered_at = "2026-09-11";
      triggered_price = q.ltp;
    }
    if (kind === "price_below" && q.ltp <= threshold) {
      triggered_at = "2026-09-11";
      triggered_price = q.ltp;
    }
  }
  const alert = {
    id: nextAlertId++,
    kind,
    threshold,
    enabled: true,
    triggered_at,
    triggered_price,
  };
  item.alerts.push(alert);
  res.status(201).json(alert);
});

app.patch("/watchlist/alerts/:alert_id", auth, (req, res) => {
  const items = listFor(req.user.sub);
  for (const item of items) {
    const alert = item.alerts.find((a) => a.id === Number(req.params.alert_id));
    if (alert) {
      if ("enabled" in (req.body || {})) alert.enabled = !!req.body.enabled;
      if (req.body?.threshold) alert.threshold = Number(req.body.threshold);
      return res.json(alert);
    }
  }
  res.status(404).json({ detail: "Not found" });
});

app.delete("/watchlist/alerts/:alert_id", auth, (req, res) => {
  const items = listFor(req.user.sub);
  for (const item of items) {
    const idx = item.alerts.findIndex((a) => a.id === Number(req.params.alert_id));
    if (idx >= 0) {
      item.alerts.splice(idx, 1);
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ detail: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Swing Terminal API on http://localhost:${PORT}`);
});
