"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin-api";

export function SecuritySection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet("/api/admin/security")
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  if (loading) return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />;
  if (error)
    return (
      <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
        ⚠️ {error}
      </div>
    );
  if (!data) return null;

  const s = data.summary || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Active keys" value={s.totalKeys} />
        <Card label="Login lockouts" value={s.loginLockouts} accent />
        <Card label="Admin fails" value={s.adminLoginFails} />
        <Card label="OTP abuse / auth" value={`${s.otpAbuse}/${s.authThrottle}`} />
      </div>

      <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs px-4 py-2.5 rounded-xl">
        {data.note}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2.5">Key (masked)</th>
              <th className="px-2 py-2.5">Type</th>
              <th className="px-2 py-2.5">Count</th>
              <th className="px-4 py-2.5">Window start</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((r: any, i: number) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-gray-700">{r.keyMasked}</td>
                <td className="px-2 py-2 text-gray-500">{r.keyPrefix}</td>
                <td className="px-2 py-2 font-bold">{r.count}</td>
                <td className="px-4 py-2 text-gray-400">
                  {r.windowStart
                    ? new Date(r.windowStart).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                    : "—"}
                </td>
              </tr>
            ))}
            {!data.items?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No active rate limits
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-[11px] text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-orange-600" : ""}`}>{value}</div>
    </div>
  );
}
