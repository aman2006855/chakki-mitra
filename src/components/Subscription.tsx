"use client";

import { useEffect, useState } from "react";
import { Crown, Wallet, History, Sparkles, Check, Clock, Gift, BadgeCheck, Hourglass } from "lucide-react";
import { api } from "@/lib/api";

interface Plan {
  id: number;
  name: string;
  description: string;
  priceInr: number;
  durationDays: number;
  smsQuota: number;
  features: Record<string, boolean>;
}

interface HistoryItem {
  id: number;
  status: string;
  pricePaid: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  plan: Plan | null;
}

interface SubData {
  current: HistoryItem | null;
  history: HistoryItem[];
  totalSpent: number;
  totalPlans: number;
}

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  expired: "Expired",
  cancelled: "Cancelled",
};

function daysLeft(endAt: string | null): number | null {
  if (!endAt) return null;
  const ms = new Date(endAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

export default function Subscription() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([api("/api/plans"), api("/api/subscriptions")]);
        if (pRes.ok) {
          const d = await pRes.json();
          setPlans(d.plans || []);
        }
        if (sRes.ok) setSub(await sRes.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const current = sub?.current || null;
  const left = current ? daysLeft(current.endAt) : null;
  const totalDays = current?.plan?.durationDays || 0;
  const pct = left !== null && totalDays > 0 ? Math.max(4, Math.min(100, Math.round((left / totalDays) * 100))) : 0;

  return (
    <div className="p-4 space-y-4 pb-6">
      <style>{`
        @keyframes subFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes subShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes subGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,.35); } 50% { box-shadow: 0 0 0 8px rgba(249,115,22,0); } }
        @keyframes subFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .sub-anim { opacity: 0; animation: subFadeUp .5s ease forwards; }
        .sub-skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 800px 100%; animation: subShimmer 1.4s infinite linear; }
        .sub-glow { animation: subGlow 2.4s infinite; }
        .sub-float { animation: subFloat 3s ease-in-out infinite; }
        .sub-bar { transition: width 1s cubic-bezier(.22,1,.36,1); }
      `}</style>

      {/* Header */}
      <div className="sub-anim flex items-center gap-2.5" style={{ animationDelay: "0ms" }}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Subscription</h1>
          <p className="text-xs text-gray-500">Plans, history aur kharcha — sab ek jagah</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="sub-skeleton h-40 rounded-3xl" />
          <div className="grid grid-cols-3 gap-2.5">
            <div className="sub-skeleton h-20 rounded-2xl" />
            <div className="sub-skeleton h-20 rounded-2xl" />
            <div className="sub-skeleton h-20 rounded-2xl" />
          </div>
          <div className="sub-skeleton h-48 rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Current plan hero */}
          <div
            className="sub-anim relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-orange-200 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600"
            style={{ animationDelay: "60ms" }}
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-2 top-10 w-20 h-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-100">Current Plan</span>
                {current ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> {STATUS_LABEL[current.status] || current.status}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">No active plan</span>
                )}
              </div>
              <div className="mt-2 flex items-end gap-2">
                <Crown className="w-8 h-8 mb-1 sub-float" />
                <div>
                  <div className="text-2xl font-extrabold leading-none">{current?.plan?.name || "Free"}</div>
                  <div className="text-xs text-orange-100 mt-1">
                    {current && left !== null
                      ? `${left} din baaki · ${fmtDate(current.endAt)} tak valid`
                      : "Abhi koi paid plan active nahi hai"}
                  </div>
                </div>
              </div>
              {current && left !== null && totalDays > 0 && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                    <div className="sub-bar h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-orange-100 mt-1">
                    <span>{pct}% validity baaki</span>
                    <span>{totalDays} din ka plan</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="sub-anim bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm" style={{ animationDelay: "120ms" }}>
              <Wallet className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <div className="text-lg font-extrabold text-gray-900">₹{sub?.totalSpent || 0}</div>
              <div className="text-[10px] text-gray-500 font-medium">Total kharch</div>
            </div>
            <div className="sub-anim bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm" style={{ animationDelay: "180ms" }}>
              <History className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <div className="text-lg font-extrabold text-gray-900">{sub?.totalPlans || 0}</div>
              <div className="text-[10px] text-gray-500 font-medium">Plans liye</div>
            </div>
            <div className="sub-anim bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm" style={{ animationDelay: "240ms" }}>
              <Gift className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <div className="text-lg font-extrabold text-gray-900">{current?.plan?.smsQuota === -1 ? "∞" : current?.plan?.smsQuota ?? 0}</div>
              <div className="text-[10px] text-gray-500 font-medium">Plan SMS</div>
            </div>
          </div>

          {/* Available plans */}
          <div className="sub-anim" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500" /> Available Plans
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Coming Soon
              </span>
            </div>

            {plans.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                  <Hourglass className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-sm font-bold text-gray-800">Plans jald aa rahe hain</div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Hum aapki dukaan ke liye best plans taiyaar kar rahe hain.<br />Thoda intezaar karo! 🙏
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((p, i) => (
                  <div
                    key={p.id}
                    className="sub-anim relative bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                    style={{ animationDelay: `${340 + i * 80}ms` }}
                  >
                    {/* Coming Soon ribbon */}
                    <div className="absolute top-3.5 -right-9 rotate-45 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-extrabold uppercase tracking-wider px-10 py-1 shadow">
                      Coming Soon
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 pr-16">
                        <div>
                          <div className="font-extrabold text-gray-900">{p.name}</div>
                          {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-gray-900">₹{p.priceInr}</span>
                        <span className="text-[11px] text-gray-400">/ {p.durationDays} din</span>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                          📩 {p.smsQuota === -1 ? "Unlimited SMS" : `${p.smsQuota} SMS`}
                        </span>
                      </div>
                      {Object.keys(p.features || {}).length > 0 && (
                        <div className="mt-2.5 space-y-1">
                          {Object.entries(p.features).slice(0, 4).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Check className={`w-3.5 h-3.5 ${v ? "text-green-500" : "text-gray-300"}`} />
                              <span className="capitalize">{k.replace(/_/g, " ")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled
                        className="sub-glow mt-3 w-full py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed"
                      >
                        🔜 Coming Soon
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-1.5">
                        Online payment jald aa raha hai — tab ye plan buy kar paoge
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buy history */}
          <div className="sub-anim" style={{ animationDelay: "420ms" }}>
            <h2 className="text-sm font-bold text-gray-800 mb-2.5 px-0.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" /> Buy History
            </h2>
            {!sub?.history?.length ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-6 text-center">
                <div className="text-3xl mb-2">🧾</div>
                <div className="text-sm font-bold text-gray-700">Abhi tak koi purchase nahi</div>
                <p className="text-xs text-gray-400 mt-1">Jab plan buy karoge, history yahan dikhegi</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {sub.history.map((h) => (
                  <div key={h.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {h.plan?.name || `Plan #${h.id}`}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {fmtDate(h.createdAt)}
                        {h.endAt ? ` · ${fmtDate(h.startAt)} → ${fmtDate(h.endAt)}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-gray-900">₹{h.pricePaid || 0}</div>
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[h.status] || STATUS_STYLE.pending}`}>
                        {STATUS_LABEL[h.status] || h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom note */}
          <p className="sub-anim text-center text-[11px] text-gray-400 leading-relaxed px-4" style={{ animationDelay: "480ms" }}>
            💳 Online payment jald aa raha hai.<br />Koi sawal ho to Settings me support se sampark karo.
          </p>
        </>
      )}
    </div>
  );
}
