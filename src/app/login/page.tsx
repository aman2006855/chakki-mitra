"use client";

import { useState, useEffect } from "react";

function setSession(userId: number, name: string) {
  const session = JSON.stringify({ userId, name });
  const encoded = encodeURIComponent(session);
  document.cookie = `session=${encoded}; path=/; max-age=2592000; SameSite=Lax`;
  try { localStorage.setItem("chakki_mitra_session", session); } catch {}
}

function hasSession() {
  try {
    if (document.cookie.includes("session=")) return true;
    if (localStorage.getItem("chakki_mitra_session")) return true;
  } catch {}
  return false;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkAuth() {
      if (!hasSession()) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        const data = await res.json();
        if (data.auth) {
          const settingsRes = await fetch("/api/settings", { credentials: "same-origin" });
          const settings = await settingsRes.json();
          if (settings.isRegistered) {
            window.location.href = "/";
          } else {
            window.location.href = "/register";
          }
        }
      } catch {
        try {
          const lsSettings = localStorage.getItem("chakki_mitra_settings");
          if (lsSettings) {
            const settings = JSON.parse(lsSettings);
            if (settings.isRegistered) {
              window.location.href = "/";
            } else {
              window.location.href = "/register";
            }
          }
        } catch {}
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("ईमेल और पासवर्ड दोनों डालें");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      
      setSession(data.userId, data.name);
      
      setTimeout(() => {
        if (data.isRegistered) {
          window.location.href = "/";
        } else {
          window.location.href = "/register";
        }
      }, 300);
    } catch (e: any) {
      console.error("[login] error:", e);
      setErrorMsg(e.message === "Invalid password" ? "पासवर्ड गलत है" : "लॉगिन विफल रहा");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400">
        <div className="text-white text-center animate-pulse">
          <div className="text-6xl mb-4">🌾</div>
          <h1 className="text-3xl font-bold">चक्की मित्र</h1>
          <p className="text-orange-100 mt-2">लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-5xl">🌾</span>
          </div>
          <h1 className="text-3xl font-bold text-white">चक्की मित्र</h1>
          <p className="text-orange-100 mt-1">आटा चक्की का डिजिटल बहीखाता</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">लॉगिन करें</h2>
          <p className="text-sm text-gray-500 text-center mb-6">अपने खाते में प्रवेश करें</p>

          <button
            onClick={() => { window.location.href = "/api/auth/google/login"; }}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors group mb-4"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-semibold text-gray-700">Google से लॉगिन करें</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">या</span></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="ईमेल (Email)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="पासवर्ड (Password)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900"
              />
            </div>
            
            {errorMsg && (
              <p className="text-red-500 text-sm text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 active:bg-orange-800 transition-colors disabled:opacity-50"
            >
              ईमेल से लॉगिन / रजिस्टर करें
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              नया अकाउंट बनाने के लिए अपना ईमेल और पासवर्ड डालकर बटन दबाएं
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl mb-1">📖</div>
            <p className="text-xs text-orange-100">डिजिटल बहीखाता</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📱</div>
            <p className="text-xs text-orange-100">WhatsApp रिमाइंडर</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📊</div>
            <p className="text-xs text-orange-100">बिक्री रिपोर्ट</p>
          </div>
        </div>
      </div>
    </div>
  );
}
