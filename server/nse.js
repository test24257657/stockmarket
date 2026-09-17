const BASE = "https://www.nseindia.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let cookie = "";
let cookieAt = 0;
const cache = new Map();

function headerLines(res) {
  const getSet = res.headers.getSetCookie?.() || [];
  if (getSet.length) return getSet;
  const raw = res.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function mergeCookies(setCookieHeaders) {
  const jar = new Map();
  for (const part of cookie.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [k, ...rest] = part.split("=");
    jar.set(k, rest.join("="));
  }
  for (const line of setCookieHeaders) {
    const pair = line.split(";")[0];
    const [k, ...rest] = pair.split("=");
    if (k) jar.set(k.trim(), rest.join("="));
  }
  cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function warmup() {
  const stale = Date.now() - cookieAt > 10 * 60 * 1000;
  if (cookie && !stale) return;
  const res = await fetch(`${BASE}/api/allIndices`, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${BASE}/`,
    },
  });
  mergeCookies(headerLines(res));
  cookieAt = Date.now();
  await res.arrayBuffer();
}

async function nseGet(path, { ttl = 60_000 } = {}) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  await warmup();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${BASE}/market-data/live-market-indices`,
      Cookie: cookie,
    },
  });
  mergeCookies(headerLines(res));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NSE ${res.status} ${path}: ${text.slice(0, 80)}`);
  }
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

async function archivesGet(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/csv,*/*", Referer: `${BASE}/` },
  });
  if (!res.ok) throw new Error(`archives ${res.status}`);
  return res.text();
}

export { nseGet, archivesGet, BASE };
