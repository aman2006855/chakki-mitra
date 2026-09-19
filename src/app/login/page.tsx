"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { API_BASE } from "@/lib/config";

function getToken(): string | null {
  try {
    return localStorage.getItem("chakki_mitra_token");
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api("/api/auth/session");
        const data = await res.json();
        if (data.auth) {
          const settingsRes = await api("/api/settings");
          const settings = await settingsRes.json();
          if (settings.isRegistered) {
            router.replace("/");
          } else {
            router.replace("/register");
          }
        }
      } catch {
        try {
          const lsSettings = localStorage.getItem("chakki_mitra_settings");
          if (lsSettings) {
            const settings = JSON.parse(lsSettings);
            if (settings.isRegistered) {
              router.replace("/");
            } else {
              router.replace("/register");
            }
          }
        } catch {}
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) {
      setErrorMsg("ईमेल और पासवर्ड दोनों डालें");
      return;
    }
    if (activeTab === "signup" && password !== confirmPassword) {
      setErrorMsg("पासवर्ड आपस में मेल नहीं खाते");
      return;
    }
    
    setLoading(true);
    try {
      const data = await api("/api/auth/email", {
        method: "POST",
        body: JSON.stringify({ email, password, action: activeTab }),
      }).then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      if (data.error) throw new Error(data.error);

      try {
        localStorage.setItem("chakki_mitra_token", data.token);
      } catch {}

      setTimeout(() => {
        if (data.isRegistered) {
          router.replace("/");
        } else {
          router.replace("/register");
        }
      }, 300);
    } catch (e: any) {
      console.error("[auth] error:", e);
      setErrorMsg(e.message);
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setActiveTab("login"); setErrorMsg(""); }}
              className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
                activeTab === "login" 
                  ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50/50" 
                  : "text-gray-500 hover:text-gray-700 bg-gray-50"
              }`}
            >
              लॉगिन (Login)
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setErrorMsg(""); }}
              className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
                activeTab === "signup" 
                  ? "text-orange-600 border-b-2 border-orange-600 bg-orange-50/50" 
                  : "text-gray-500 hover:text-gray-700 bg-gray-50"
              }`}
            >
              नया अकाउंट (Sign Up)
            </button>
          </div>

          <div className="p-6">
            <button
              onClick={() => { window.location.href = `${API_BASE}/api/auth/google/login`; }}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors group mb-5"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-semibold text-gray-700">Google से {activeTab === "login" ? "लॉगिन" : "साइन अप"} करें</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">या ईमेल का उपयोग करें</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="ईमेल (Email)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="पासवर्ड (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>
              {activeTab === "signup" && (
                <div>
                  <input
                    type="password"
                    placeholder="पासवर्ड की पुष्टि (Confirm Password)"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                  />
                </div>
              )}
              
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] shadow-md transition-all disabled:opacity-50"
              >
                {activeTab === "login" ? "लॉगिन करें" : "नया अकाउंट बनाएं"}
              </button>
            </form>
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
