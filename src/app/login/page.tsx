"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function getToken(): string | null {
  try {
    return localStorage.getItem("chakki_mitra_token");
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { saveSession, login } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [view, setView] = useState<"main" | "forgot">("main");
  const [lastAuth, setLastAuth] = useState<string>("");
  // signup OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  // forgot password
  const [fEmail, setFEmail] = useState("");
  const [fOtpSent, setFOtpSent] = useState(false);
  const [fCode, setFCode] = useState("");
  const [fNewPass, setFNewPass] = useState("");
  const [fBusy, setFBusy] = useState(false);

  const rememberAuth = (m: string) => {
    setLastAuth(m);
    try { localStorage.setItem("chakki_mitra_last_auth", m); } catch {}
  };

  const lastBadge = (m: string) =>
    lastAuth === m ? (
      <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow z-10">✓ Last used • पिछली बार</span>
    ) : null;

  useEffect(() => {
    try { setLastAuth(localStorage.getItem("chakki_mitra_last_auth") || ""); } catch {}
    const token = getToken();
    if (token) {
      router.replace("/");
      return;
    }
    setAuthChecked(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const form = e.target as HTMLFormElement;
    const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;
    const finalEmail = email || emailInput?.value || "";
    const finalPassword = password || passwordInput?.value || "";

    if (!finalEmail || !finalPassword) {
      setErrorMsg("ईमेल और पासवर्ड दोनों डालें");
      return;
    }

    // Signup: pehle OTP bhejo, phir OTP ke saath account banao
    if (activeTab === "signup") {
      if (finalPassword !== confirmPassword) {
        setErrorMsg("पासवर्ड आपस में मेल नहीं खाते");
        return;
      }
      if (!otpSent) {
        setOtpSending(true);
        try {
          const res = await api("/api/auth/otp/send", {
            method: "POST",
            body: JSON.stringify({ email: finalEmail, purpose: "signup" }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "OTP nahi bheja gaya");
          setOtpSent(true);
          setInfoMsg(`📩 OTP ${finalEmail} par bheja gaya! 10 min me use karo.`);
        } catch (er: any) {
          setErrorMsg(er.message || "OTP nahi bheja gaya");
        }
        setOtpSending(false);
        return;
      }
      if (!otp || otp.length !== 6) {
        setErrorMsg("6-digit OTP dalo");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api("/api/auth/email", {
        method: "POST",
        body: JSON.stringify({
          email: finalEmail,
          password: finalPassword,
          action: activeTab,
          ...(activeTab === "signup" ? { otp } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      if (data.error) throw new Error(data.error);

      rememberAuth("email");
      saveSession(data.userId, data.name || "", data.token, data.isRegistered, "");

      setTimeout(() => {
        if (data.isRegistered) {
          router.replace("/");
        } else {
          router.replace("/register");
        }
      }, 300);
    } catch (e: any) {
      console.error("[auth] error:", e);
      setErrorMsg(e.message || "लॉगिन में समस्या हुई");
      setSubmitting(false);
    }
  };

  const handleForgotSend = async () => {
    setErrorMsg("");
    if (!fEmail) { setErrorMsg("Email dalo"); return; }
    setFBusy(true);
    try {
      const res = await api("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ email: fEmail, purpose: "reset" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "OTP nahi bheja gaya");
      setFOtpSent(true);
      setInfoMsg(`📩 OTP ${fEmail} par bheja gaya!`);
    } catch (e: any) {
      setErrorMsg(e.message || "OTP nahi bheja gaya");
    }
    setFBusy(false);
  };

  const handleForgotReset = async () => {
    setErrorMsg("");
    if (!fCode || fCode.length !== 6) { setErrorMsg("6-digit OTP dalo"); return; }
    if (!fNewPass || fNewPass.length < 6) { setErrorMsg("Naya password min 6 character ka ho"); return; }
    setFBusy(true);
    try {
      const res = await api("/api/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ email: fEmail, code: fCode, newPassword: fNewPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset nahi ho paya");
      setView("main");
      setActiveTab("login");
      setFOtpSent(false); setFCode(""); setFNewPass(""); setFEmail("");
      setInfoMsg("✅ Password reset ho gaya! Ab login karo.");
    } catch (e: any) {
      setErrorMsg(e.message || "Reset nahi ho paya");
    }
    setFBusy(false);
  };

  if (!authChecked) {
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
          {view === "forgot" ? (
            <div className="p-6">
              <button type="button" onClick={() => { setView("main"); setErrorMsg(""); setInfoMsg(""); }} className="text-xs text-orange-600 font-semibold mb-4">← Wapas / Back</button>
              <h2 className="text-lg font-bold text-gray-900 mb-1">🔑 Forgot Password?</h2>
              <p className="text-xs text-gray-500 mb-4">Email par OTP ayega, phir naya password set karo.</p>
              {!fOtpSent ? (
                <div className="space-y-4">
                  <input type="email" placeholder="ईमेल (Email)" value={fEmail} onChange={(e) => setFEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors" />
                  <button type="button" onClick={handleForgotSend} disabled={fBusy} className="w-full flex items-center justify-center py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50">
                    {fBusy ? "Bhej rahe hain..." : "📩 OTP Bhejo"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input inputMode="numeric" placeholder="6-digit OTP" value={fCode} onChange={(e) => setFCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-gray-50/50 text-center tracking-[0.5em] font-bold" />
                  <input type="password" placeholder="Naya password (min 6)" value={fNewPass} onChange={(e) => setFNewPass(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-gray-50/50" />
                  <button type="button" onClick={handleForgotReset} disabled={fBusy} className="w-full flex items-center justify-center py-3.5 rounded-xl bg-green-500 text-white font-bold active:bg-green-600 transition-all disabled:opacity-50">
                    {fBusy ? "Ruko..." : "✅ Password Reset Karo"}
                  </button>
                  <button type="button" onClick={handleForgotSend} disabled={fBusy} className="w-full text-center text-xs text-orange-600 font-semibold">OTP dobara bhejo</button>
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 mt-4">{errorMsg}</div>
              )}
              {infoMsg && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100 mt-4">{infoMsg}</div>
              )}
            </div>
          ) : (
          <>
          
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
            <div className="relative mb-5">
              {lastBadge("google")}
            <button
              onClick={() => { rememberAuth("google"); login(); }}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors group"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-semibold text-gray-700">Google से {activeTab === "login" ? "लॉगिन" : "साइन अप"} करें</span>
            </button>
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">या ईमेल का उपयोग करें</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="ईमेल (Email)"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="पासवर्ड (Password)"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                />
              </div>
              {activeTab === "signup" && (
                <div>
                    <input
                      type="password"
                      name="new-password"
                      placeholder="पासवर्ड की पुष्टि (Confirm Password)"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors"
                  />
                </div>
              )}
              
              {activeTab === "signup" && otpSent && (
                <div>
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">📩 OTP email par bheja gaya! Neeche dalo.</p>
                  <input
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 bg-gray-50/50 focus:bg-white transition-colors text-center tracking-[0.5em] font-bold"
                  />
                </div>
              )}
              
              {errorMsg && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              {infoMsg && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100">
                  <p>{infoMsg}</p>
                </div>
              )}

              <div className="relative">
                {lastBadge("email")}
              <button
                type="submit"
                disabled={submitting || otpSending}
                className="w-full flex items-center justify-center py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] shadow-md transition-all disabled:opacity-50"
              >
                {submitting || otpSending
                  ? "लोड हो रहा है..."
                  : activeTab === "login"
                    ? "लॉगिन करें"
                    : otpSent
                      ? "✅ Verify & Account Banao"
                      : "📩 OTP Bhejo"}
              </button>
              </div>
              {activeTab === "login" && (
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setErrorMsg(""); setInfoMsg(""); }}
                  className="w-full text-center text-xs text-orange-600 font-semibold mt-1"
                >
                  🔑 Forgot password? / पासवर्ड भूले?
                </button>
              )}
            </form>
          </div>
          </>
          )}
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
