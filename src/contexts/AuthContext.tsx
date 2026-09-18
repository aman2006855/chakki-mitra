"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  user: { userId: number; name: string; isRegistered: boolean; shopName: string } | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  saveSession: (userId: number, name: string) => void;
}

const SESSION_KEY = "chakki_mitra_session";

function readSessionFromStorage() {
  try {
    const cookieVal = document.cookie;
    if (cookieVal.includes("session=")) {
      const match = cookieVal.match(/session=([^;]+)/);
      if (match) return JSON.parse(decodeURIComponent(match[1]));
    }
  } catch {}
  try {
    const ls = localStorage.getItem(SESSION_KEY);
    if (ls) return JSON.parse(ls);
  } catch {}
  return null;
}

function writeSessionToStorage(session: { userId: number; name: string }) {
  // Write to both cookie and localStorage for redundancy
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `session=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

function clearSession() {
  document.cookie = "session=; path=/; max-age=0";
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ userId: number; name: string; isRegistered: boolean; shopName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // First check localStorage/cookie for session
      const storedSession = readSessionFromStorage();
      if (!storedSession) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Now check with server for settings/registration
      let settingsData: any;
      try {
        const settingsRes = await fetch("/api/settings", { credentials: "same-origin" });
        if (settingsRes.ok) {
          settingsData = await settingsRes.json();
        } else {
          // If API fails, try localStorage for settings
          try {
            const lsSettings = localStorage.getItem("chakki_mitra_settings");
            settingsData = lsSettings ? JSON.parse(lsSettings) : { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
          } catch {
            settingsData = { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
          }
        }
      } catch {
        try {
          const lsSettings = localStorage.getItem("chakki_mitra_settings");
          settingsData = lsSettings ? JSON.parse(lsSettings) : { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
        } catch {
          settingsData = { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
        }
      }

      const isReg = settingsData.isRegistered ?? false;
      setUser({
        userId: storedSession.userId,
        name: storedSession.name || "",
        isRegistered: Boolean(isReg),
        shopName: settingsData.shopName || "",
      });
    } catch (e) {
      console.error("[AuthProvider] error:", e);
      setUser(null);
    }
    setLoading(false);
  }

  function login() {
    window.location.href = "/api/auth/google/login";
  }

  function logout() {
    clearSession();
    setUser(null);
    window.location.href = "/login";
  }

  function saveSession(userId: number, name: string) {
    writeSessionToStorage({ userId, name });
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, saveSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export { readSessionFromStorage, writeSessionToStorage, clearSession };
