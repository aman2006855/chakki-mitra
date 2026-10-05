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

// EXACT database health — /api/admin/health se live measured (reachability +
// latency + size + version + har table ki row count), har 30s auto-refresh.
// Koi static "OK" nahi — jo dikhta hai wahi measured hai.
function DbHealth() {
  const [h, setH] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchHealth = async () => {
    setChecking(true);
    try {
      const d = await adminGet("/api/admin/health");
      setH(d);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!h && !failed) {
    return (
      <div className="flex justify-between">
        <span>DB health</span>
        <span className="text-gray-400">check ho raha...</span>
      </div>
    );
  }

  if (failed || !h) {
    return (
      <div className="flex justify-between items-center">
        <span>DB health</span>
        <button
          type="button"
          onClick={fetchHealth}
          className="text-red-600 font-medium text-xs"
        >
          ❌ Load fail — Retry
        </button>
      </div>
    );
  }

  const live = h.ok === true && h.reachable === true;
  const tableEntries: [string, any][] = h.tables ? Object.entries(h.tables) : [];
  const secsAgo = h.checkedAt
    ? Math.max(0, Math.round((Date.now() - new Date(h.checkedAt).getTime()) / 1000))
    : -1;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${live ? "bg-green-500" : "bg-red-500"}`} />
          DB health
        </span>
        <button
          type="button"
          onClick={fetchHealth}
          disabled={checking}
          className="text-orange-600 font-medium text-xs disabled:opacity-40"
        >
          {checking ? "..." : "🔄 Refresh"}
        </button>
      </div>
      {live ? (
        <>
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className="text-green-600 font-medium">● Connected · {h.latencyMs}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Database size</span>
            <span>{h.dbSize || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Postgres</span>
            <span>{h.version || "—"}</span>
          </div>
          {tableEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 pt-1 border-t border-gray-100">
              {tableEntries.map(([name, n]) => (
                <div key={name} className="flex justify-between py-0.5">
                  <span className="text-gray-400 font-mono">{name}</span>
                  <span className={n === -1 ? "text-red-600 font-medium" : ""}>
                    {n === -1 ? "ERR" : Number(n).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>Checked</span>
            <span>{secsAgo < 0 ? "—" : secsAgo < 5 ? "abhi" : `${secsAgo}s pehle`}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className="text-red-600 font-medium">❌ Down{h.error ? `: ${h.error}` : ""}</span>
        </div>
      )}
    </div>
  );
}

export function OverviewSection({ refreshTick }: { refreshTick: number }) {  const [data, setData] = useState<any>(null);
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
        <DbHealth />
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
