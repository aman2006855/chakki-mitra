"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "./config";
import {
  getPendingOps,
  removePendingOp,
  isOnline,
  onOnlineChange,
  probeNetwork,
  reportNetworkResult,
  getPendingCustomers,
  markPendingCustomerSynced,
  isTempId,
} from "./offline-db";

const FLUSH_MS = 15000; // queue bhejo — har 15s
const REFRESH_MS = 60000; // server se list fresh lo — har 60s (time-to-time sync)

function getToken(): string | null {
  try {
    return localStorage.getItem("chakki_mitra_token");
  } catch {
    return null;
  }
}

// Lists ko batao: net wapas aaya / queue sync hui — ab fresh data lo
function dispatchRefresh(count: number): void {
  try {
    window.dispatchEvent(new CustomEvent("cm:sync-done", { detail: { count } }));
  } catch {}
}

function isCustomerCreateOp(op: { method: string; url: string }): boolean {
  return op.method === "POST" && op.url.replace(/\?.*$/, "") === "/api/customers";
}

// Offline khate ki temp id → asli id. Khata abhi sync nahi hui to entry ko
// agle round ke liye chhod do (duplicate/kharab entry kabhi nahi banegi).
function prepareBody(body: any): { ready: boolean; body: any } {
  if (body && isTempId(body.customerId)) {
    const realId = getPendingCustomers().find((p) => p.tempId === body.customerId)?.realId || null;
    if (!realId) return { ready: false, body };
    return { ready: true, body: { ...body, customerId: realId } };
  }
  return { ready: true, body };
}

async function syncPendingOp(op: { id: string; method: string; url: string; body: any }): Promise<{ ok: boolean; data: any }> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Yahi opId server par dedupe key hai — retry par duplicate entry BILKUL nahi
  if (op.id) headers["X-Idempotency-Key"] = op.id;

  const fullUrl = op.url.startsWith("http") ? op.url : `${API_BASE}${op.url}`;
  try {
    const res = await fetch(fullUrl, {
      method: op.method,
      headers,
      body: op.body ? JSON.stringify(op.body) : undefined,
      credentials: "omit",
    });
    const data = await res.json().catch(() => ({} as any));
    // Response aaya = net sach me chal raha hai (state wapas online)
    reportNetworkResult(true);
    // Server idempotency se dedupe karta hai — dobara bhejna safe hai
    return { ok: res.ok, data };
  } catch {
    // Fetch fail = sach me net gaya — heartbeat dobara probe karega
    reportNetworkResult(false);
    return { ok: false, data: null };
  }
}

export function useSyncPending() {
  const syncingRef = useRef(false);

  const syncAll = async (opts?: { refresh?: boolean }) => {
    if (syncingRef.current) return;
    // State "offline" lag rahi hai par ops pending hain — pehle probe karo,
    // net chalu ho to state sudhar kar sync chalu (deadlock fix)
    if (!isOnline()) {
      const recovered = await probeNetwork(true);
      if (!recovered) return;
    }
    const queued = getPendingOps();
    if (queued.length === 0) {
      if (opts?.refresh) dispatchRefresh(0);
      return;
    }
    syncingRef.current = true;
    let synced = 0;
    try {
      for (const op of queued) {
        // Order matter karta hai: khata pehle, entry baad me (remap ke liye)
        const prep = prepareBody(op.body);
        if (!prep.ready) continue; // khata abhi bachi — agle round me bhejenge
        try {
          const result = await syncPendingOp({ ...op, body: prep.body });
          if (result.ok) {
            removePendingOp(op.id);
            synced++;
            // Naya khata sync hua → temp id ko asli id de do (agli entries sahi jayengi)
            if (isCustomerCreateOp(op) && op.body?.tempId && result.data?.id) {
              markPendingCustomerSynced(String(op.body.tempId), Number(result.data.id));
            }
          }
        } catch {}
      }
    } finally {
      syncingRef.current = false;
    }
    // Lists turant fresh dikhe — KhataBook jaisi screens sunengi
    if (synced > 0 || opts?.refresh) dispatchRefresh(synced);
  };

  useEffect(() => {
    syncAll();

    const unsub = onOnlineChange((online) => {
      // Net wapas aaya — queue bhejo AUR cached lists bhi fresh kar do
      if (online) syncAll({ refresh: true });
    });

    // Time-to-time sync (offline storage ↔ online database)
    const flushTimer = setInterval(() => {
      if (getPendingOps().length > 0) syncAll();
    }, FLUSH_MS);
    const refreshTimer = setInterval(() => {
      if (isOnline()) dispatchRefresh(0);
    }, REFRESH_MS);

    // App wapas aane par turant sync + fresh list
    const onWake = () => {
      if (isOnline()) syncAll({ refresh: true });
    };
    const onVisibility = () => {
      if (!document.hidden) onWake();
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsub();
      clearInterval(flushTimer);
      clearInterval(refreshTimer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
