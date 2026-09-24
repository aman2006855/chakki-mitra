"use client";

import { useEffect, useState } from "react";
import { adminGet } from "@/lib/admin-api";

export function AuditSection({ refreshTick }: { refreshTick: number }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminGet(`/api/admin/audit?page=${page}&pageSize=50`)
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
  }, [page, refreshTick]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Append-only trail · no edit/delete from UI · secrets never logged
      </p>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}
      {loading ? (
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-2 py-2.5">Action</th>
                <th className="px-2 py-2.5">Target</th>
                <th className="px-2 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((row: any) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })
                      : "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-gray-800">{row.action}</td>
                  <td className="px-2 py-2 text-gray-600">
                    {row.targetType}/{row.targetId}
                  </td>
                  <td className="px-2 py-2 text-gray-500 max-w-[200px] truncate">
                    {row.reason || row.detail || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        row.outcome === "success"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {row.outcome}
                    </span>
                  </td>
                </tr>
              ))}
              {!data?.items?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No audit entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-gray-500">
            {data.page} / {data.totalPages} · {data.total} total
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
  );
}
