"use client";

import { useEffect, useState } from "react";
import { adminGet, adminPost } from "@/lib/admin-api";

export function CreditsSection({ refreshTick }: { refreshTick: number }) {
  const [view, setView] = useState<"summary" | "exhausted" | "low">("summary");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topupOpen, setTopupOpen] = useState(false);
  const [tu, setTu] = useState({ userId: "", amount: "50", reason: "" });
  const [tuMsg, setTuMsg] = useState("");
  const [tuBusy, setTuBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet(`/api/admin/credits?view=${view}`)
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
  }, [view, refreshTick]);

  async function submitTopup(e: React.FormEvent) {
    e.preventDefault();
    setTuBusy(true);
    setTuMsg("");
    try {
      const r = await adminPost("/api/admin/credits", {
        userId: Number(tu.userId),
        amount: Number(tu.amount),
        reason: tu.reason,
      });
      setTuMsg(`✅ +${r.amount} credits · new balance ${r.newBalance}`);
      setTu({ userId: "", amount: "50", reason: "" });
      setData(await adminGet(`/api/admin/credits?view=${view}`));
    } catch (err: any) {
      setTuMsg(err.message || "Failed");
    }
    setTuBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["summary", "Summary"],
            ["exhausted", "Exhausted (0)"],
            ["low", "Low (1–5)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${
              view === id
                ? "bg-orange-50 border-orange-200 text-orange-700"
                : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTopupOpen((v) => !v)}
          className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600"
        >
          + Top-up
        </button>
      </div>

      {topupOpen && (
        <form onSubmit={submitTopup} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-800">Manual credit top-up</div>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              required
              placeholder="User ID"
              value={tu.userId}
              onChange={(e) => setTu({ ...tu, userId: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50"
            />
            <input
              required
              type="number"
              min={1}
              max={10000}
              placeholder="Amount"
              value={tu.amount}
              onChange={(e) => setTu({ ...tu, amount: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50"
            />
            <input
              required
              minLength={3}
              placeholder="Reason (required)"
              value={tu.reason}
              onChange={(e) => setTu({ ...tu, reason: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50"
            />
          </div>
          <button
            type="submit"
            disabled={tuBusy}
            className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {tuBusy ? "Saving…" : "Grant credits"}
          </button>
          {tuMsg && <div className="text-xs text-gray-600">{tuMsg}</div>}
        </form>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      ) : view === "summary" && data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Total balance" value={data.totalBalance} accent />
            <Card label="Exhausted" value={data.exhausted} />
            <Card label="Low (1–5)" value={data.low} />
            <Card label="Avg balance" value={data.avgBalance} sub={`of ${data.totalAccounts}`} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 border-b border-gray-100">
              Highest balances
            </div>
            <table className="w-full text-xs">
              <tbody>
                {(data.top || []).map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-400">#{r.id}</td>
                    <td className="px-2 py-2 font-medium text-gray-900">
                      {r.shopName || r.name || "—"}
                    </td>
                    <td className="px-2 py-2 text-gray-500">{r.emailMasked}</td>
                    <td className="px-4 py-2 text-right font-bold text-orange-600">{r.smsCredits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : data?.items ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              {data.items.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-400">#{r.id}</td>
                  <td className="px-2 py-2 font-medium text-gray-900">
                    {r.shopName || r.name || "—"}
                  </td>
                  <td className="px-2 py-2 text-gray-500">{r.emailMasked}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">{r.smsCredits}</td>
                </tr>
              ))}
              {!data.items.length && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-400">None</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
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
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="text-[11px] text-gray-500 uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-orange-600" : "text-gray-900"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}
