const TOKEN_KEY = "swing_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.detail || `API ${res.status}`);
    err.status = res.status;
    err.detail = data?.detail;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  status: () => request("/market/status"),
  pulse: () => request("/pulse"),
  screener: () => request("/screener"),
  watchlist: () => request("/watchlist"),
  addWatch: (body) => request("/watchlist", { method: "POST", body: JSON.stringify(body) }),
  updateWatch: (id, body) => request(`/watchlist/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeWatch: (id) => request(`/watchlist/${id}`, { method: "DELETE" }),
  addAlert: (id, body) => request(`/watchlist/${id}/alerts`, { method: "POST", body: JSON.stringify(body) }),
  updateAlert: (id, body) => request(`/watchlist/alerts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  removeAlert: (id) => request(`/watchlist/alerts/${id}`, { method: "DELETE" }),
  sectors: () => request("/sectors"),
  indices: () => request("/indices"),
  news: () => request("/news"),
  institutional: () => request("/institutional"),
  chart: (slug, tf, days) => {
    const q = new URLSearchParams();
    if (tf) q.set("tf", tf);
    if (days) q.set("days", String(days));
    const qs = q.toString();
    return request(`/chart/${slug}${qs ? `?${qs}` : ""}`);
  },
  fundamentals: (slug) => request(`/fundamentals/${slug}`),
  fno: (slug) => request(`/fno/${slug}`),
  depth: (slug) => request(`/depth/${slug}`),
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
};
