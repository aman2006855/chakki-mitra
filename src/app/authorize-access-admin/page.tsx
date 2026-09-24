"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";
import { isNativePlatform } from "@/lib/capacitor";
import {
  ADMIN_TOKEN_KEY,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "@/lib/admin-api";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AuthorizeAccessAdminPage() {
  const [native] = useState(() => isNativePlatform());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getAdminToken()) setAuthed(true);
    setChecked(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setBusy(false);
        return;
      }
      setAdminToken(data.token);
      setAuthed(true);
      setPassword("");
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  function handleLogout() {
    clearAdminToken();
    setAuthed(false);
    setPassword("");
    setError("");
  }

  // APK/Capacitor se admin panel bilkul block — sirf web URL se
  if (native) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-gray-900">Web only</h1>
          <p className="text-sm text-gray-500 mt-2">
            Admin panel sirf browser me URL se access hota hai. App me available nahi hai.
          </p>
        </div>
      </main>
    );
  }

  if (!checked) return null;

  if (authed) {
    return <AdminShell onLogout={handleLogout} />;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-sm w-full">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🛡️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-sm text-gray-500 mt-1">Chakki Mitra — authorize access</p>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-1.5">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
            placeholder="••••••••"
            autoFocus
          />

          {error && (
            <div className="mt-3 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {busy ? "Verifying..." : "Authorize"}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
            Ye page sirf platform admin ke liye hai. Unauthorized access attempts log hote hain.
          </p>
        </form>
      </div>
    </main>
  );
}
