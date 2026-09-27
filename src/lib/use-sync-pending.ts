"use client";

import { useEffect, useRef } from "react";
import { API_BASE } from "./config";
import {
  getPendingOps,
  addPendingOp,
  removePendingOp,
  updatePendingOp,
  purgeDeadOps,
  resetPendingOpBackoff,
  isOnline,
  onOnlineChange,
  probeNetwork,
  reportNetworkResult,
  getPendingCustomers,
  markPendingCustomerSynced,
  markPendingCustomerHealed,
  resolvePendingCustomer,
  isTempId,
  type PendingOp,
} from "./offline-db";

const FLUSH_MS = 15000; // queue bhejo — har 15s (backup; naye op ka event pehle chalata hai)
const REFRESH_MS = 60000; // server se list fresh lo — har 60s (time-to-time sync)
const OP_TIMEOUT_MS = 10000; // ek op KABHI latka nahi — pehle browser default ~300s tha
const CONCURRENCY = 6; // ek saath 6 op → queue 6x jaldi drain
const BACKOFF_BASE_MS = 15000; // server reject kare to dheere-dheere retry
const BACKOFF_MAX_MS = 120000;

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

async function syncPendingOp(op: { id: string; method: string; url: string; body: any }): Promise<{
  ok: boolean;
  data: any;
  status: number;
}> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Yahi opId server par dedupe key hai — retry par duplicate entry BILKUL nahi
  if (op.id) headers["X-Idempotency-Key"] = op.id;

  const fullUrl = op.url.startsWith("http") ? op.url : `${API_BASE}${op.url}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OP_TIMEOUT_MS);
  try {
    const res = await fetch(fullUrl, {
      method: op.method,
      headers,
      body: op.body ? JSON.stringify(op.body) : undefined,
      credentials: "omit",
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({} as any));
    // Response aaya = net sach me chal raha hai (state wapas online)
    reportNetworkResult(true);
    // Server idempotency se dedupe karta hai — dobara bhejna safe hai
    return { ok: res.ok, data, status: res.status };
  } catch {
    // Fetch fail/timeout = net ya server nahi chal ra — heartbeat dobara probe karega
    reportNetworkResult(false);
    return { ok: false, data: null, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// Backoff sirf tab jab SERVER ne reject kiya (4xx/5xx). Network fail (status 0)
// par nahi — waise bhi poori queue offline ho to syncAll probe se pehle hi ruk jata hai.
// 4xx = dobara bhejne par bhi wahi hoga (validation/404/session) — isliye
// permanent mark karke auto-retry band, warna badge HAMESHA atka rehta tha.
const PERMANENT_STATUS = new Set([400, 401, 403, 404, 409, 410, 413, 422]);

function markFailed(op: PendingOp, status: number, message: string): void {
  if (status === 0) return;
  const attempts = (op.attempts || 0) + 1;
  const permanent = !!op.permanent || PERMANENT_STATUS.has(status);
  const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempts - 1), BACKOFF_MAX_MS);
  updatePendingOp(op.id, {
    attempts,
    nextAttemptAt: permanent ? 0 : Date.now() + delay,
    permanent,
    lastStatus: status,
    lastError: message || `HTTP ${status}`,
  });
}

// ORPHAN SELF-HEAL: entry temp khata (tmp_...) par atki hai, par us khata ka
// create op queue me nahi hai ya mapping kabhi bani hi nahi → op hamesha
// ready:false rehta tha (badge hamesha atka). Ab server par phone se dobara
// bhejo — server dedupe karta hai, wahi row asli id ke saath wapas aati hai.
function healOrphanedEntries(queued: PendingOp[]): void {
  const createTempIds = new Set(
    queued.filter((op) => isCustomerCreateOp(op)).map((op) => String(op.body?.tempId || ""))
  );
  const seen = new Set<string>();
  for (const op of queued) {
    const cid = op.body?.customerId;
    if (!isTempId(cid) || seen.has(cid)) continue;
    seen.add(cid);
    if (resolvePendingCustomer(cid)) continue; // mapping hai — sab theek
    if (createTempIds.has(cid)) continue; // create op queue me hai — wo id dega
    const pc = getPendingCustomers().find((p) => p.tempId === cid);
    if (!pc?.phone || !pc?.name) continue; // data hi nahi — banner me dikhega
    if (Date.now() - (pc.timestamp || 0) < 45000) continue; // abhi haal hi me bana — ruko
    if (pc.healedAt && Date.now() - pc.healedAt < 600000) continue; // 10 min me ek baar max
    const added = addPendingOp({
      id: `heal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      method: "POST",
      url: "/api/customers",
      body: { name: pc.name, phone: pc.phone, address: pc.address, tempId: pc.tempId },
      timestamp: Date.now(),
    });
    if (added) markPendingCustomerHealed(cid);
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
    // Sabse pehle queue se dead op hatao (jo server par kabhi nahi chal
    // sakte — badge ko hamesha-⏳ banate the), phir orphan heal karo
    purgeDeadOps();
    let queued = getPendingOps();
    if (queued.length === 0) {
      if (opts?.refresh) dispatchRefresh(0);
      return;
    }
    // Pehle orphan entries theek karo — warna wo kabhi sync hi nahi hongi
    healOrphanedEntries(queued);
    queued = getPendingOps();
    // Permanent reject (4xx) aur backoff wale op agli round chhod do —
    // ek kharaab op baaki queue ko har round me rukne nahi dega
    const eligible = queued.filter(
      (op) => !op.permanent && (!op.nextAttemptAt || Date.now() >= op.nextAttemptAt)
    );
    // Order: khata (customer create) PEHLE, phir entries — taki temp id remap
    // usi round me ho jaye, entry ko agle round ka intzaar na karna pade
    const creates = eligible.filter((op) => isCustomerCreateOp(op));
    const rest = eligible.filter((op) => !isCustomerCreateOp(op));

    syncingRef.current = true;
    let synced = 0;

    // Ek saath CONCURRENCY op — chunk ke baad hi agla chunk (order preserve),
    // isliye dependency wali entry kabhi create se pehle nahi ja sakti
    const drain = async (ops: PendingOp[]): Promise<void> => {
      for (let i = 0; i < ops.length; i += CONCURRENCY) {
        const chunk = ops.slice(i, i + CONCURRENCY);
        await Promise.all(
          chunk.map(async (op) => {
            // Order matter karta hai: khata pehle, entry baad me (remap ke liye)
            const prep = prepareBody(op.body);
            if (!prep.ready) return; // khata abhi bachi — agle round me bhejenge
            try {
              const result = await syncPendingOp({ ...op, body: prep.body });
              if (result.ok) {
                removePendingOp(op.id);
                synced++;
                // Naya khata sync hua → temp id ko asli id de do (agli entries sahi jayengi)
                if (isCustomerCreateOp(op) && op.body?.tempId && result.data?.id) {
                  markPendingCustomerSynced(String(op.body.tempId), Number(result.data.id));
                }
              } else {
                const msg =
                  result.data && typeof result.data.error === "string" ? result.data.error : "";
                markFailed(op, result.status, msg);
              }
            } catch {}
          })
        );
      }
    };

    try {
      await drain(creates);
      await drain(rest);
    } finally {
      syncingRef.current = false;
    }
    // Lists turant fresh dikhe — KhataBook jaisi screens sunengi
    if (synced > 0 || opts?.refresh) dispatchRefresh(synced);
  };

  useEffect(() => {
    syncAll();

    const unsub = onOnlineChange((online) => {
      // Net wapas aaya — saara backoff hatao, queue bhejo, lists fresh karo
      if (online) {
        resetPendingOpBackoff();
        syncAll({ refresh: true });
      }
    });

    // Naya op queue hua → ~1.2s me turant sync (pehle 15s intezaar tha;
    // delay se burst — kai entry ek saath — ek hi round me chali jaati hai)
    let writeTimer: ReturnType<typeof setTimeout> | null = null;
    const onQueueWrite = () => {
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        writeTimer = null;
        syncAll();
      }, 1200);
    };
    window.addEventListener("cm:queue-write", onQueueWrite);

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
      if (writeTimer) clearTimeout(writeTimer);
      window.removeEventListener("cm:queue-write", onQueueWrite);
      clearInterval(flushTimer);
      clearInterval(refreshTimer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
