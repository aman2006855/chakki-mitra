"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "./config";
import { getPendingOps, removePendingOp, isOnline, onOnlineChange, probeNetwork, reportNetworkResult } from "./offline-db";

function getToken(): string | null {
  try {
    return localStorage.getItem("chakki_mitra_token");
  } catch {
    return null;
  }
}

async function syncPendingOp(op: { id: string; method: string; url: string; body: any }): Promise<boolean> {
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
    // Response aaya = net sach me chal raha hai (state wapas online)
    reportNetworkResult(true);
    // Server idempotency se dedupe karta hai — dobara bhejna safe hai
    return res.ok;
  } catch {
    // Fetch fail = sach me net gaya — heartbeat dobara probe karega
    reportNetworkResult(false);
    return false;
  }
}

// Lists ko batao: net wapas aaya / queue sync hui — ab fresh data lo
function dispatchRefresh(count: number): void {
  try {
    window.dispatchEvent(new CustomEvent("cm:sync-done", { detail: { count } }));
  } catch {}
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
        try {
          const ok = await syncPendingOp(op);
          if (ok) {
            removePendingOp(op.id);
            synced++;
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
    // Safety net: state galat ho ya koi op chhoot gaya ho — 15s me dobara try
    const t = setInterval(() => {
      if (getPendingOps().length > 0) syncAll();
    }, 15000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, []);
}
