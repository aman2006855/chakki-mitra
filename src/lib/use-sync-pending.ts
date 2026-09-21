"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "./config";
import { getPendingOps, removePendingOp, isOnline, onOnlineChange } from "./offline-db";

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

  const fullUrl = op.url.startsWith("http") ? op.url : `${API_BASE}${op.url}`;
  const res = await fetch(fullUrl, {
    method: op.method,
    headers,
    body: op.body ? JSON.stringify(op.body) : undefined,
    credentials: "omit",
  });
  return res.ok;
}

export function useSyncPending() {
  const syncingRef = useRef(false);

  const syncAll = async () => {
    if (syncingRef.current || !isOnline()) return;
    syncingRef.current = true;
    try {
      const ops = getPendingOps();
      for (const op of ops) {
        try {
          const ok = await syncPendingOp(op);
          if (ok) removePendingOp(op.id);
        } catch {}
      }
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    if (isOnline()) syncAll();
    const unsub = onOnlineChange((online) => {
      if (online) syncAll();
    });
    return unsub;
  }, []);
}
