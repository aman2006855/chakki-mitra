"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin-api";

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-orange-600" : "text-gray-900"}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function OverviewSection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet("/api/admin/overview")
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
        ⚠️ {error}
      </div>
    );
  }

  if (!data) return null;

  const a = data.accounts || {};
  const r = data.registrations || {};
  const act = data.activity || {};
  const sms = data.smsCredits || {};
  const ref = data.referrals || {};
  const ops = data.ops || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total accounts" value={a.total} sub={`${a.guests} guests`} />
        <Stat label="Registered" value={a.registered} sub={`${a.incomplete} incomplete`} accent />
        <Stat label="Suspended" value={a.suspended} />
        <Stat label="New today" value={r.today} sub={`${r.last7d} · 7d · ${r.last30d} · 30d`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Transactions" value={act.transactions} />
        <Stat label="Credit sales" value={`₹${act.totalCredit || 0}`} />
        <Stat label="Cash sales" value={`₹${act.totalCash || 0}`} />
        <Stat label="Customers" value={act.customers} sub={`${act.payments} payments`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="SMS credit balance" value={sms.totalBalance} sub="sum of all balances" accent />
        <Stat label="Exhausted shops" value={sms.exhausted} sub="0 credits" />
        <Stat label="Referral codes" value={ref.codes} sub={`${ref.referredAccounts} referred`} />
        <Stat label="Open tickets" value={ops.openTickets} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 text-xs text-gray-600 space-y-1.5">
        <div className="flex justify-between">
          <span>DB health</span>
          <span className={ops.dbHealthy ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
            {ops.dbHealthy ? "OK" : "Unknown"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Active plans</span>
          <span>{ops.activePlans}</span>
        </div>
        <div className="flex justify-between">
          <span>Audit events (7d)</span>
          <span>{ops.recentAudit}</span>
        </div>
        <div className="flex justify-between text-gray-400 pt-1 border-t border-gray-100">
          <span>Last refreshed</span>
          <span>
            {ops.lastRefreshedAt
              ? new Date(ops.lastRefreshedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
              : "Unknown"}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 pt-1">
          Missing data = Unknown (not zero). Timestamps display in Asia/Kolkata.
        </p>
      </div>
    </div>
  );
}
