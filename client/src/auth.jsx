import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((m) => setEmail(m.email))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  async function login(e, p) {
    const out = await api.login(e, p);
    setToken(out.access_token);
    setEmail(out.email);
  }

  function logout() {
    api.logout().catch(() => {});
    setToken(null);
    setEmail(null);
  }

  return <AuthCtx.Provider value={{ email, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
