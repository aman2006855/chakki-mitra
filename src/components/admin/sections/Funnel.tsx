"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin-api";

export function FunnelSection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet("/api/admin/funnel")
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

  const f = data.funnel || {};
  const total = Math.max(1, f.totalAccounts || 1);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  const steps = [
    { label: "Total accounts", n: f.totalAccounts, color: "bg-gray-700" },
    { label: "Register completed", n: f.registerCompleted, color: "bg-orange-500" },
    { label: "Signup only (wizard pending)", n: f.signupOnly, color: "bg-amber-400" },
    { label: "Guest accounts", n: f.guests, color: "bg-sky-400" },
    { label: "Suspended", n: f.suspended, color: "bg-red-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Completion rate" value={`${f.completionRate}%`} accent />
        <Card label="Signups today" value={f.signupsToday} />
        <Card label="Signups 7d" value={f.signups7d} />
        <Card label="Incomplete (real)" value={f.incompleteReal} sub="wizard dropout" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{s.label}</span>
              <span className="font-bold text-gray-900">
                {s.n} <span className="text-gray-400 font-normal">({pct(s.n || 0)})</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${s.color} rounded-full transition-all`}
                style={{ width: pct(s.n || 0) }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 text-xs font-semibold text-gray-600 border-b border-gray-100">
          Dropout list — {data.note}
        </div>
        <table className="w-full text-xs">
          <tbody>
            {(data.dropout || []).map((r: any) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-400">#{r.id}</td>
                <td className="px-2 py-2 font-medium">{r.name || r.shopName || "—"}</td>
                <td className="px-2 py-2 text-gray-500">{r.email}</td>
                <td className="px-4 py-2 text-right text-gray-400">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                </td>
              </tr>
            ))}
            {!data.dropout?.length && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400">No dropouts 🎉</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-[11px] text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-orange-600" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
