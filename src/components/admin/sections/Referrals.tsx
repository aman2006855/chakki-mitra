"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin-api";

export function ReferralsSection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet("/api/admin/referrals")
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

  const s = data.stats || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Codes issued" value={s.codesIssued} />
        <Stat label="Successful referrals" value={s.successfulReferrals} accent />
        <Stat label="Est. bonus credits" value={s.estimatedBonusCredits} sub="× 20 per side" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 text-xs font-semibold text-gray-600 border-b border-gray-100">
          Referral leaderboard
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-2 py-2">Shop</th>
              <th className="px-2 py-2">Code</th>
              <th className="px-4 py-2 text-right">Referrals</th>
            </tr>
          </thead>
          <tbody>
            {(data.leaderboard || []).map((r: any, i: number) => (
              <tr key={r.id} className="border-t border-gray-50">
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="font-medium text-gray-900">{r.shopName || r.name || "—"}</div>
                  <div className="text-gray-400 text-[10px]">{r.emailMasked}</div>
                </td>
                <td className="px-2 py-2 font-mono text-gray-600">{r.referralCode}</td>
                <td className="px-4 py-2 text-right font-bold text-orange-600">{r.referrals}</td>
              </tr>
            ))}
            {!data.leaderboard?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No referral activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 text-xs font-semibold text-gray-600 border-b border-gray-100">
          Recent referred accounts
        </div>
        <table className="w-full text-xs">
          <tbody>
            {(data.recent || []).map((r: any) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-400">#{r.id}</td>
                <td className="px-2 py-2 font-medium">{r.shopName || r.name || "—"}</td>
                <td className="px-2 py-2 text-gray-500">
                  via <b>{r.referrerName || r.referrerCode || "?"}</b>
                </td>
                <td className="px-4 py-2 text-right">{r.smsCredits} cr</td>
              </tr>
            ))}
            {!data.recent?.length && (
              <tr>
                <td className="px-4 py-4 text-center text-gray-400">None yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-[11px] text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-orange-600" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
