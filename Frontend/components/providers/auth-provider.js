"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  decodeTokenExpiry,
  getStoredUser,
  getToken,
  isTokenExpired,
  setSession,
  setStoredUser,
} from "@/lib/auth-storage";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { getCurrentUser, loginWithGoogle } from "@/lib/api/auth";

const AuthContext = createContext(null);

const normalizeUser = (u) => (u ? { ...u, id: u.id || u._id } : null);

export function AuthProvider({ children }) {
  const router = useRouter();
  // status: "loading" | "authenticated" | "unauthenticated"
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  const endSession = useCallback(
    (reason) => {
      clearSession();
      setUser(null);
      setExpiresAt(null);
      setStatus("unauthenticated");
      router.replace(reason ? `/login?reason=${reason}` : "/login");
    },
    [router]
  );

  // Any 401 from the API signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession("expired"));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Restore the session on first load, then verify it with the backend.
  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    if (!token || isTokenExpired(token)) {
      if (token) clearSession();
      Promise.resolve().then(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => {
      if (cancelled) return;
      setUser(normalizeUser(getStoredUser()));
      setExpiresAt(decodeTokenExpiry(token));
      setStatus("authenticated");
    });

    getCurrentUser()
      .then(({ user: fresh }) => {
        if (cancelled || !fresh) return;
        const normalized = normalizeUser(fresh);
        setUser(normalized);
        setStoredUser(normalized);
      })
      .catch(() => {
        /* 401 is handled globally; other errors keep the cached profile */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sign out automatically when the JWT expires while the app is open.
  useEffect(() => {
    if (status !== "authenticated" || !expiresAt) return undefined;
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      Promise.resolve().then(() => endSession("expired"));
      return undefined;
    }
    // setTimeout caps at ~24.8 days; JWTs here live 7 days.
    const timer = setTimeout(() => endSession("expired"), ms);
    return () => clearTimeout(timer);
  }, [status, expiresAt, endSession]);

  const login = useCallback(async (credential) => {
    const data = await loginWithGoogle(credential);
    if (!data?.token) throw new Error("The server did not return a session token.");
    const normalized = normalizeUser(data.user);
    setSession({ token: data.token, user: normalized });
    setUser(normalized);
    setExpiresAt(decodeTokenExpiry(data.token));
    setStatus("authenticated");
    return normalized;
  }, []);

  const logout = useCallback(() => endSession(null), [endSession]);

  const value = useMemo(
    () => ({ status, user, expiresAt, login, logout }),
    [status, user, expiresAt, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
