"use client";

import { useEffect, useState, type ReactNode } from "react";
import { adminGet, adminPost, adminPut } from "@/lib/admin-api";

interface Plan {
  id?: number;
  name: string;
  description: string;
  priceInr: number;
  durationDays: number;
  smsQuota: number;
  active: boolean;
  features: Record<string, boolean>;
}

const EMPTY: Plan = {
  name: "",
  description: "",
  priceInr: 99,
  durationDays: 30,
  smsQuota: -1,
  active: true,
  features: {},
};

export function PlansSection({ refreshTick }: { refreshTick: number }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      setPlans(await adminGet("/api/admin/plans"));
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      if (editing.id) {
        await adminPut("/api/admin/plans", { ...editing, reason: "admin panel edit" });
        setMsg("✅ Plan updated");
      } else {
        await adminPost("/api/admin/plans", { ...editing, reason: "admin panel create" });
        setMsg("✅ Plan created");
      }
      setEditing(null);
      await load();
    } catch (err: any) {
      setMsg(err.message || "Failed");
    }
    setBusy(false);
  }

  async function toggleActive(p: Plan) {
    if (!p.id) return;
    const reason = window.prompt(
      p.active ? "Deactivate reason (required):" : "Activate note:",
      p.active ? "" : "reactivated"
    );
    if (reason === null) return;
    if (p.active && reason.trim().length < 3) {
      setMsg("Reason required");
      return;
    }
    setBusy(true);
    try {
      await adminPut("/api/admin/plans", {
        id: p.id,
        active: !p.active,
        reason: reason.trim() || "toggle",
      });
      setMsg(p.active ? "⏸ Deactivated (subscribers unaffected)" : "▶ Activated");
      await load();
    } catch (err: any) {
      setMsg(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Plans are API-driven — no hardcoded prices in app. Payment gateway = separate step.
        </p>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY })}
          className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600"
        >
          + New plan
        </button>
      </div>

      {msg && (
        <div className="text-xs bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl text-gray-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="bg-white rounded-2xl border border-orange-200 p-4 space-y-3">
          <div className="text-sm font-bold text-gray-900">
            {editing.id ? `Edit #${editing.id}` : "Create plan"}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="Name">
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="inp"
                placeholder="Pro"
              />
            </Field>
            <Field label="Price (₹)">
              <input
                required
                type="number"
                min={0}
                value={editing.priceInr}
                onChange={(e) => setEditing({ ...editing, priceInr: Number(e.target.value) })}
                className="inp"
              />
            </Field>
            <Field label="Duration (days)">
              <input
                required
                type="number"
                min={1}
                value={editing.durationDays}
                onChange={(e) => setEditing({ ...editing, durationDays: Number(e.target.value) })}
                className="inp"
              />
            </Field>
            <Field label="SMS quota (−1 unlimited)">
              <input
                required
                type="number"
                value={editing.smsQuota}
                onChange={(e) => setEditing({ ...editing, smsQuota: Number(e.target.value) })}
                className="inp"
              />
            </Field>
          </div>
          <Field label="Description (Hindi preview)">
            <textarea
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={2}
              className="inp"
              placeholder="असीमित SMS, प्राथमिकता सहायता…"
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save plan"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-4 ${
                p.active ? "border-gray-200" : "border-gray-100 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {p.durationDays} days ·{" "}
                    {p.smsQuota === -1 ? "unlimited SMS" : `${p.smsQuota} SMS`}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.active ? "ACTIVE" : "OFF"}
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-2">₹{p.priceInr}</div>
              {p.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setEditing({ ...p, features: p.features || {} })}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleActive(p)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium"
                >
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && !plans.length && (
          <div className="col-span-full text-center text-sm text-gray-400 py-8 bg-white rounded-2xl border border-dashed">
            No plans yet — create one (replaces hardcoded ₹99/₹499 modal)
          </div>
        )}
      </div>

      <style>{`
        .inp {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.875rem;
          outline: none;
          box-sizing: border-box;
        }
        .inp:focus {
          border-color: #f97316;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
