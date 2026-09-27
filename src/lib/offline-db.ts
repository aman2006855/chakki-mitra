import { API_BASE } from "./config";

const CACHE_PREFIX = "cm_cache_";
const PENDING_KEY = "cm_pending_ops";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

export interface PendingOp {
  id: string;
  method: string;
  url: string;
  body: any;
  timestamp: number;
  /** Server reject kar raha hai to attempts badhao (backoff ke liye) */
  attempts?: number;
  /** Is waqt tak is op ko dobara mat bhejo (poison op baaki queue ko na roke) */
  nextAttemptAt?: number;
  /** Server ne 4xx me permanent reject kiya — auto-retry band, sirf manual retry */
  permanent?: boolean;
  lastStatus?: number;
  lastError?: string;
}

function getCacheKey(url: string): string {
  return CACHE_PREFIX + url;
}

export function getCached(url: string): any | null {
  try {
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(getCacheKey(url));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache(url: string, data: any): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(url), JSON.stringify(entry));
  } catch {}
}

export function getPendingOps(): PendingOp[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addPendingOp(op: PendingOp): boolean {
  const ops = getPendingOps();
  ops.push(op);
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
    return true;
  } catch {
    // Storage full — cache (sirf dikhawa data) hata kar dobara try karo.
    // Entry KABHI chup-chaap drop nahi honi chahiye.
    try {
      const cacheKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) cacheKeys.push(k);
      }
      cacheKeys.slice(0, 60).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
      return true;
    } catch {
      return false;
    }
  }
}

export function removePendingOp(id: string): void {
  const ops = getPendingOps().filter((op) => op.id !== id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
}

export function clearPendingOps(): void {
  try {
    localStorage.setItem(PENDING_KEY, "[]");
  } catch {}
}

// Offline khata delete hua → uska create op + us khate par likhi entries bhi
// queue se hatao. Nahi to entry orphan bankar badge me atak jati, ya heal
// use dobara bana deta (deleted khata wapas aa jata).
export function dropTempCustomerOps(tempId: string): void {
  try {
    const ops = getPendingOps().filter(
      (op) => op.body?.tempId !== tempId && op.body?.customerId !== tempId
    );
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch {}
}

export function updatePendingOp(id: string, patch: Partial<PendingOp>): void {
  try {
    const ops = getPendingOps().map((op) => (op.id === id ? { ...op, ...patch } : op));
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch {}
}

// Net wapas aate hi saara backoff hata do — nahi to queue wapas turant drain na ho
export function resetPendingOpBackoff(): void {
  try {
    const ops = getPendingOps().map((op) =>
      op.attempts || op.nextAttemptAt ? { ...op, attempts: 0, nextAttemptAt: 0 } : op
    );
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch {}
}

/** User ne "Retry" dabaya — permanent reject + backoff sab hatao, ab foran bhejo */
export function forceRetryAllPendingOps(): void {
  try {
    const ops = getPendingOps().map((op) =>
      op.attempts || op.nextAttemptAt || op.permanent || op.lastStatus
        ? { ...op, attempts: 0, nextAttemptAt: 0, permanent: false, lastStatus: 0, lastError: "" }
        : op
    );
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch {}
}

/**
 * Banner/ke badge ke liye sach — kitne op atke hue hain aur kyun.
 * stuck = server ne permanent reject kiya (4xx) ya entry temp khate par lagi hai
 * jiska asli id kabhi nahi mila (ready:false deadlock).
 */
export function getPendingOpsSummary(): {
  total: number;
  stuck: number;
  rejected: number;
  orphan: number;
  lastError: string | null;
} {
  try {
    const ops = getPendingOps();
    let rejected = 0;
    let orphan = 0;
    let lastError: string | null = null;
    for (const op of ops) {
      if (op.permanent) {
        rejected++;
        if (!lastError && op.lastError) lastError = op.lastError;
      } else if (isTempId(op.body?.customerId) && !resolvePendingCustomer(op.body.customerId)) {
        orphan++;
      }
    }
    return { total: ops.length, stuck: rejected + orphan, rejected, orphan, lastError };
  } catch {
    return { total: 0, stuck: 0, rejected: 0, orphan: 0, lastError: null };
  }
}

// ---- Pending SMS ----
// Offline/airplane me entry to queue ho jati hai, par SMS (cellular) nahi jata.
// SMS text yahan save — net/cellular aane par ek-tap resend (banner se).
const SMS_KEY = "cm_pending_sms";

export interface PendingSms {
  id: string;
  phone: string;
  message: string;
  customerName: string;
  timestamp: number;
}

export function getPendingSms(): PendingSms[] {
  try {
    return JSON.parse(localStorage.getItem(SMS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addPendingSms(sms: PendingSms): void {
  try {
    const list = getPendingSms();
    // Same customer ka purana pending SMS replace (duplicate SMS na jaye)
    const filtered = list.filter((s) => s.phone !== sms.phone || s.message !== sms.message);
    filtered.push(sms);
    localStorage.setItem(SMS_KEY, JSON.stringify(filtered.slice(-50)));
  } catch {}
}

export function removePendingSms(id: string): void {
  try {
    localStorage.setItem(SMS_KEY, JSON.stringify(getPendingSms().filter((s) => s.id !== id)));
  } catch {}
}

// ---- Pending (offline) customers ----
// Offline me naya khata bane to turant phone par dikhna chahiye aur entry usse
// judni chahiye. Temp id (tmp_...) milti hai; sync hone par asli id aa jati hai.
const PC_KEY = "cm_pending_customers";

export interface PendingCustomer {
  tempId: string;
  name: string;
  phone: string;
  address: string;
  timestamp: number;
  realId?: number | null;
  /** Orphan-heal kab kiya tha (bar bar create op na bane) */
  healedAt?: number;
}

export function getPendingCustomers(): PendingCustomer[] {
  try {
    const list = JSON.parse(localStorage.getItem(PC_KEY) || "[]");
    if (!Array.isArray(list)) return [];
    // Mapping zaroori rehti hai (entry ka temp id → asli id). Sirf bahut purani hatao.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const fresh = list.filter((x: PendingCustomer) => x && x.tempId && (x.timestamp || 0) > cutoff);
    if (fresh.length !== list.length) {
      try {
        localStorage.setItem(PC_KEY, JSON.stringify(fresh));
      } catch {}
    }
    return fresh;
  } catch {
    return [];
  }
}

function savePendingCustomers(list: PendingCustomer[]): void {
  try {
    localStorage.setItem(PC_KEY, JSON.stringify(list.slice(-200)));
  } catch {}
}

export function addPendingCustomer(c: PendingCustomer): void {
  try {
    const list = getPendingCustomers();
    if (list.some((x) => x.tempId === c.tempId)) return;
    list.push({ ...c, realId: c.realId ?? null });
    savePendingCustomers(list);
  } catch {}
}

/** Sync ke baad: temp id → server ki asli id */
export function markPendingCustomerSynced(tempId: string, realId: number): void {
  try {
    savePendingCustomers(getPendingCustomers().map((x) => (x.tempId === tempId ? { ...x, realId } : x)));
  } catch {}
}

export function resolvePendingCustomer(tempId: string): number | null {
  try {
    const hit = getPendingCustomers().find((x) => x.tempId === tempId);
    return hit?.realId || null;
  } catch {
    return null;
  }
}

export function removePendingCustomer(tempId: string): void {
  try {
    savePendingCustomers(getPendingCustomers().filter((x) => x.tempId !== tempId));
  } catch {}
}

export function markPendingCustomerHealed(tempId: string): void {
  try {
    savePendingCustomers(
      getPendingCustomers().map((x) => (x.tempId === tempId ? { ...x, healedAt: Date.now() } : x))
    );
  } catch {}
}

export function isTempId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("tmp_");
}


// ============================================================
// NETWORK STATE MACHINE — "state sirf proof se badalta hai"
// ============================================================
// Pehle 3 problem the (isi se online/offline ki flap hoti thi):
//   1. Probe `/api/health` par tha jo DB call karta hai — DB slow hua to app
//      "offline" bolta tha jabki net bilkul theek tha.
//   2. Ek bhi failed API call = foran "offline" (koi confirmation nahi).
//   3. WebView ke online/offline events seedhe state badal dete the
//      (WiFi <-> data switch par bhi).
// Ab:
//   - Probe = /api/ping (koi DB nahi, 1ms) → sirf connectivity check
//   - State sirf PROBE ke result se badalta hai (asymmetric hysteresis)
//   - 1 success = online (foran), 3 lagatar fail = offline (confirm)
//   - Traffic fail = sirf probe trigger karta hai, state khud nahi badalta
//   - Offline ka reason bhi pata hota hai: internet band vs server tak nahi

export type OfflineReason = "no-internet" | "server";

const PROBE_URL = `${API_BASE}/api/ping`;
const PROBE_TIMEOUT_MS = 5000;
// Asymmetric hysteresis: offline hone ke liye saboot chahiye (3 fail), online
// hone ke liye ek safal probe kaafi — kyun ki "offline dikhna" hi asli bug tha.
const FAIL_THRESHOLD = 3;
const ONLINE_INTERVAL_MS = 45000; // online: har 45s ek bar check
const OFFLINE_INTERVAL_MS = 4000; // offline/suspect: har 4s try
const KICK_MIN_GAP_MS = 1000; // kick spam rokne ke liye

let onlineListeners: ((online: boolean) => void)[] = [];
let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let _offlineReason: OfflineReason | null = null;

let probeTimer: ReturnType<typeof setTimeout> | null = null;
let nextProbeAt = 0;
let lastProbeAt = 0;
let probeInFlight = false;
let failStreak = 0;

export function isOnline(): boolean {
  return _isOnline;
}

/** Net band hai to kyun: "no-internet" (phone ka net) ya "server" (net hai par server tak nahi) */
export function getOfflineReason(): OfflineReason | null {
  return _offlineReason;
}

function setOnlineState(value: boolean): void {
  if (_isOnline === value) return;
  _isOnline = value;
  try {
    onlineListeners.forEach((l) => l(value));
  } catch {}
}

function markOnline(): void {
  _offlineReason = null;
  setOnlineState(true);
}

function markOffline(reason: OfflineReason): void {
  _offlineReason = reason;
  setOnlineState(false);
}

export function onOnlineChange(cb: (online: boolean) => void): () => void {
  onlineListeners.push(cb);
  return () => {
    onlineListeners = onlineListeners.filter((l) => l !== cb);
  };
}

// Simple request — koi extra header nahi, preflight ki zarurat hi na pade.
// Koi bhi response (4xx/5xx bhi) = net chalu hai.
async function fetchReachable(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(PROBE_URL, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      credentials: "omit",
    });
    return res.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function decide(reachable: boolean): void {
  if (reachable) {
    // Ek bhi safal probe = net chalu — foran online (jaldi recovery)
    failStreak = 0;
    markOnline();
    return;
  }
  failStreak++;
  const noNet = typeof navigator !== "undefined" && navigator.onLine === false;
  // Phone ka apna internet band = pakka offline. Warna probe hi decide karega.
  if (failStreak >= FAIL_THRESHOLD || noNet) {
    markOffline(noNet ? "no-internet" : "server");
  }
}

function schedule(delay?: number): void {
  const wait = delay ?? (_isOnline && failStreak === 0 ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS);
  if (probeTimer) clearTimeout(probeTimer);
  nextProbeAt = Date.now() + wait;
  probeTimer = setTimeout(runProbe, wait);
}

async function runProbe(): Promise<void> {
  if (probeTimer) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  if (probeInFlight) {
    schedule();
    return;
  }
  probeInFlight = true;
  lastProbeAt = Date.now();
  try {
    decide(await fetchReachable());
  } catch {}
  finally {
    probeInFlight = false;
    schedule();
  }
}

/** Turant ek probe chahiye (debounced + starvation-free). */
function kickProbe(): void {
  if (probeInFlight) return;
  if (probeTimer && nextProbeAt - Date.now() <= 1500) return; // already jaldi aane wala hai
  if (Date.now() - lastProbeAt < KICK_MIN_GAP_MS) return;
  schedule(50);
}

/**
 * Asli API call ka result. SUCCESS = pakka proof hai (online).
 * FAIL = proof NAHI — state mat badlo, sirf probe chalao (flap yahi rokta hai).
 */
export function reportNetworkResult(ok: boolean): void {
  if (ok) {
    failStreak = 0;
    markOnline();
    return;
  }
  kickProbe();
}

/** Ek probe abhi chala kar result batao (sync wagarah ke liye). */
export async function probeNetwork(_force = false): Promise<boolean> {
  if (probeInFlight) return _isOnline;
  await runProbe();
  return _isOnline;
}

/** Koi bhi caller — jaise api() ne offline face dekha — turant probe chahiye. */
export function requestNetworkProbe(): void {
  if (!probeInFlight) kickProbe();
}

/**
 * Heartbeat start karo — module load par ek hi baar chale.
 * Online = har 45s check, offline/suspect = har 4s try.
 */
export function startNetworkHeartbeat(): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__cm_heartbeat) return;
  w.__cm_heartbeat = true;

  // Browser events = SIRF hint. State kabhi seedhe nahi badalte — sirf decide()
  // (probe result) hi state change karta hai, tabhi flap possible hi nahi hai.
  window.addEventListener("online", () => kickProbe());
  window.addEventListener("offline", () => {
    // Probe foran chalao. Airplane mode = fetch fail + navigator offline →
    // decide() turant "no-internet" lagayega. Galat hint hua to probe OK
    // aayega aur state online hi rahegi.
    kickProbe();
  });
  window.addEventListener("focus", () => kickProbe());
  window.addEventListener("pageshow", () => kickProbe());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) kickProbe();
  });

  // Pehla probe jaldi — app khulte hi state verify ho jaye
  schedule(1200);
}

if (typeof window !== "undefined") {
  startNetworkHeartbeat();
}
