"use client";

import { useEffect, useState } from "react";
import { adminGet, adminPut } from "@/lib/admin-api";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "registered", label: "Registered" },
  { id: "incomplete", label: "Incomplete" },
  { id: "guest", label: "Guests" },
  { id: "suspended", label: "Suspended" },
];

export function ShopsSection({ refreshTick }: { refreshTick: number }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ q, filter, page: String(page), pageSize: "20" });
    adminGet(`/api/admin/shops?${params}`)
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
  }, [q, filter, page, refreshTick]);

  async function openDetail(row: any) {
    setSelected(row);
    setLedger(null);
    setStatusMsg("");
    try {
      const detail = await adminGet(`/api/admin/shops/${row.id}`);
      setSelected(detail);
      const led = await adminGet(`/api/admin/shops/${row.id}/ledger?limit=30`);
      setLedger(led);
    } catch (e: any) {
      setStatusMsg(e.message || "Load failed");
    }
  }

  async function updateStatus(action: "suspend" | "activate") {
    if (!selected) return;
    const reason =
      action === "suspend"
        ? window.prompt("Suspension reason (required):")
        : window.prompt("Activation note (optional):") || "reactivated";
    if (reason === null) return;
    if (action === "suspend" && reason.trim().length < 3) {
      setStatusMsg("Reason min 3 chars required");
      return;
    }
    setStatusBusy(true);
    setStatusMsg("");
    try {
      await adminPut(`/api/admin/shops/${selected.id}`, {
        action,
        reason: reason.trim() || "reactivated",
      });
      const detail = await adminGet(`/api/admin/shops/${selected.id}`);
      setSelected(detail);
      setStatusMsg(action === "suspend" ? "✅ Suspended" : "✅ Activated");
      // refresh list
      const params = new URLSearchParams({ q, filter, page: String(page), pageSize: "20" });
      setData(await adminGet(`/api/admin/shops?${params}`));
    } catch (e: any) {
      setStatusMsg(e.message || "Failed");
    }
    setStatusBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search shop, owner, email, phone, ID…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                filter === f.id
                  ? "bg-orange-50 border-orange-200 text-orange-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {selected ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setLedger(null);
                }}
                className="text-xs text-orange-600 font-medium mb-2"
              >
                ← Back to list
              </button>
              <h2 className="text-lg font-bold text-gray-900">
                {selected.shopName || selected.name || `Shop #${selected.id}`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                #{selected.id} · {selected.emailMasked || selected.email}
                {selected.isGuest ? " · 👤 guest" : ""}
                {selected.isRegistered ? " · ✅ registered" : " · ⏳ incomplete"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (selected.status || "active") === "suspended"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {(selected.status || "active").toUpperCase()}
              </span>
              <span className="text-[10px] text-gray-400">SMS: {selected.smsCredits}</span>
            </div>
          </div>

          {selected.statusReason && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              Status note: {selected.statusReason}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <Box label="Customers" value={selected.counts?.customers} />
            <Box label="Transactions" value={selected.counts?.transactions} />
            <Box label="Payments" value={selected.counts?.payments} />
            <Box label="Credits" value={selected.smsCredits} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(selected.status || "active") !== "suspended" ? (
              <button
                type="button"
                disabled={statusBusy}
                onClick={() => updateStatus("suspend")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 disabled:opacity-50"
              >
                Suspend
              </button>
            ) : (
              <button
                type="button"
                disabled={statusBusy}
                onClick={() => updateStatus("activate")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
          </div>
          {statusMsg && <div className="text-xs text-gray-600">{statusMsg}</div>}

          {ledger && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-700">
                Ledger (read-only) · Credit ₹{ledger.summary?.creditTotal} · Cash ₹
                {ledger.summary?.cashTotal}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="py-1.5 pr-2">Date</th>
                      <th className="py-1.5 pr-2">Type</th>
                      <th className="py-1.5 pr-2">Product</th>
                      <th className="py-1.5 pr-2">Wt</th>
                      <th className="py-1.5 pr-2">Amt</th>
                      <th className="py-1.5">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger.transactions || []).slice(0, 15).map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-50 text-gray-700">
                        <td className="py-1.5 pr-2">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-1.5 pr-2">txn</td>
                        <td className="py-1.5 pr-2">{t.productType}</td>
                        <td className="py-1.5 pr-2">{t.weight}</td>
                        <td className="py-1.5 pr-2">₹{t.amount}</td>
                        <td className="py-1.5">{t.paymentMode}</td>
                      </tr>
                    ))}
                    {(ledger.transactions || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-3 text-center text-gray-400">
                          No transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400">
                Edit/delete from admin = not allowed (read-only MVP).
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr className="text-left">
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Shop / Owner</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">SMS</th>
                    <th className="px-3 py-2.5">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.items || []).map((row: any) => (
                    <tr
                      key={row.id}
                      onClick={() => openDetail(row)}
                      className="border-t border-gray-100 hover:bg-orange-50/40 cursor-pointer"
                    >
                      <td className="px-3 py-2.5 text-gray-400">#{row.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900">
                          {row.shopName || row.name || "—"}
                          {row.isGuest && (
                            <span className="ml-1 text-[9px] bg-gray-100 px-1 py-0.5 rounded">
                              guest
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          {row.isRegistered ? "registered" : "incomplete"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{row.emailMasked}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            row.status === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">{row.smsCredits}</td>
                      <td className="px-3 py-2.5 text-gray-400">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}
                  {!data?.items?.length && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                        No shops match
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-gray-500">
                Page {data.page} / {data.totalPages} · {data.total} total
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Box({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="bg-gray-50 rounded-xl py-2.5">
      <div className="text-lg font-bold text-gray-900">{value ?? "—"}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
