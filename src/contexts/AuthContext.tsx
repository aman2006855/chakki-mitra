"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/config";

interface AuthContextType {
  user: { userId: number; name: string; isRegistered: boolean; shopName: string } | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  saveSession: (userId: number, name: string, token: string, isRegistered?: boolean, shopName?: string) => void;
}

const TOKEN_KEY = "chakki_mitra_token";

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
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
      // Google OAuth redirect se aaya ?token= (web flow) — save karke URL saaf karo
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlToken = params.get("token");
          if (urlToken && urlToken.split(".").length === 3) {
            setToken(urlToken);
            window.history.replaceState({}, "", window.location.pathname);
          }
        }
      } catch {}
      const token = getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      let settingsData: any;
      try {
        settingsData = await api("/api/settings").then((r) => (r.ok ? r.json() : null));
      } catch {
        settingsData = null;
      }

      if (!settingsData) {
        try {
          const lsSettings = localStorage.getItem("chakki_mitra_settings");
          settingsData = lsSettings ? JSON.parse(lsSettings) : { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
        } catch {
          settingsData = { isRegistered: false, shopName: "", shopPhone: "", attaRate: "5", daliaRate: "8" };
        }
      }

      // Decode userId from JWT token
      let userId = 0;
      let name = "";
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.userId;
        name = payload.name || "";
      } catch {}

      const isReg = settingsData.isRegistered ?? false;
      setUser({
        userId,
        name,
        isRegistered: Boolean(isReg),
        shopName: settingsData.shopName || "",
      });
    } catch {
      setUser(null);
    }
    setLoading(false);
  }

  function login() {
    // APK: system browser + deep-link flow (WebView redirect browser par atka deta hai)
    if (typeof window !== "undefined") {
      const Capacitor = (window as any).Capacitor;
      if (Capacitor?.isNativePlatform?.() === true) {
        import("@/lib/native-auth").then(({ loginWithGoogleNative }) => {
          loginWithGoogleNative(
            saveSession,
            (registered) => {
              window.location.replace(registered ? "/" : "/register");
            },
            () => {
              window.location.href = `${API_BASE}/api/auth/google/login?platform=android`;
            }
          );
        });
        return;
      }
    }
    window.location.href = `${API_BASE}/api/auth/google/login`;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  function saveSession(userId: number, name: string, token: string, isRegistered: boolean = false, shopName: string = "") {
    setToken(token);
    setUser({ userId, name, isRegistered, shopName });
    setLoading(false);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, saveSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
