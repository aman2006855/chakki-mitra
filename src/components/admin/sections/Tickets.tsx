"use client";

import { useEffect, useState } from "react";
import { adminGet, adminPut } from "@/lib/admin-api";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

export function TicketsSection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await adminGet("/api/admin/tickets"));
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  async function update(id: number, body: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    try {
      await adminPut("/api/admin/tickets", { id, ...body });
      setMsg("✅ Updated");
      setSelected(null);
      setReply("");
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Open: <b>{data?.openCount ?? "—"}</b>
        </div>
        {msg && <div className="text-xs text-gray-600">{msg}</div>}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
      ) : selected ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-orange-600 font-medium"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-bold text-gray-900">{selected.subject}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              #{selected.id} · {selected.category} · {selected.priority} ·{" "}
              {selected.shopName || selected.userEmailMasked || "no shop"} ·{" "}
              {STATUS_LABEL[selected.status] || selected.status}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">
            {selected.message || "(no message)"}
          </div>
          {selected.adminReply && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap">
              <div className="text-[10px] font-bold text-orange-600 mb-1">ADMIN REPLY</div>
              {selected.adminReply}
            </div>
          )}
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to user…"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !reply.trim()}
              onClick={() => update(selected.id, { adminReply: reply, status: "waiting" })}
              className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
            >
              Send reply
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => update(selected.id, { status: "in_progress" })}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs"
            >
              In progress
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const note = window.prompt("Resolution note:");
                if (note === null) return;
                update(selected.id, { status: "resolved", resolutionNote: note || "" });
              }}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs"
            >
              Resolve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => update(selected.id, { status: "closed" })}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-red-600"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-2 py-2.5">Subject</th>
                <th className="px-2 py-2.5">Shop</th>
                <th className="px-2 py-2.5">Status</th>
                <th className="px-4 py-2.5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((t: any) => (
                <tr
                  key={t.id}
                  onClick={() => {
                    setSelected(t);
                    setReply(t.adminReply || "");
                  }}
                  className="border-t border-gray-100 hover:bg-orange-50/40 cursor-pointer"
                >
                  <td className="px-4 py-2.5 text-gray-400">#{t.id}</td>
                  <td className="px-2 py-2.5 font-medium text-gray-900">{t.subject}</td>
                  <td className="px-2 py-2.5 text-gray-500">
                    {t.shopName || t.userEmailMasked || "—"}
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.status === "new"
                          ? "bg-blue-100 text-blue-700"
                          : t.status === "resolved" || t.status === "closed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No tickets
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
