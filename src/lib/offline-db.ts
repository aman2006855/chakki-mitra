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

export function addPendingOp(op: PendingOp): void {
  const ops = getPendingOps();
  ops.push(op);
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
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

export function isTempId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith("tmp_");
}

let onlineListeners: ((online: boolean) => void)[] = [];
let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

export function isOnline(): boolean {
  return _isOnline;
}

function setOnlineState(value: boolean): void {
  if (_isOnline === value) return;
  _isOnline = value;
  try {
    onlineListeners.forEach((l) => l(value));
  } catch {}
}

// Heartbeat: asli fetch result se state sudharo.
// navigator.onLine WebView me jhooth bolta hai (airplane mode me bhi "online") —
// fetch fail = sach me offline, fetch success = sach me online.
export function reportNetworkResult(ok: boolean): void {
  setOnlineState(ok);
}

export function onOnlineChange(cb: (online: boolean) => void): () => void {
  onlineListeners.push(cb);
  return () => { onlineListeners = onlineListeners.filter((l) => l !== cb); };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    setOnlineState(true);
    kickProbe();
  });
  window.addEventListener("offline", () => {
    setOnlineState(false);
  });
}

// ---- Network heartbeat (DEADLOCK FIX) ----
// Pehle: ek fetch fail = offline → aur uske baad api() fetch se pehle hi ruk jata
// tha → reportNetworkResult(true) kabhi call hi nahi hota → "offline" hamesha
// chipka rehta tha aur sync kabhi start nahi hota tha (net chalu ho kar bhi).
// Ab: offline state me periodik probe se state wapas online aati hai.
const PROBE_URL = `${API_BASE}/api/health`;
const OFFLINE_RETRY_MS = 6000; // offline: har 6s try — jaldi wapas aaye
const ONLINE_RETRY_MS = 60000; // online: 60s me ek baar state check

let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probeInFlight = false;
let failStreak = 0;

async function fetchReachable(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    // Simple request (koi extra header nahi) — preflight ki zarurat hi na pade,
    // chaho CORS issue ho tab bhi reachability sahi batao
    const res = await fetch(PROBE_URL, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
      credentials: "omit",
    });
    // Response aaya (chaho 4xx/5xx ho) = server tak net pahunch raha hai
    return res.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Probe karo ki server sach me reachable hai aur state update karo.
 * @param force ek hi failure par offline maano (turant recovery chahiye jab state galat ho)
 */
export async function probeNetwork(force = false): Promise<boolean> {
  if (probeInFlight) return _isOnline;
  probeInFlight = true;
  try {
    const okRes = await fetchReachable();
    if (okRes) {
      failStreak = 0;
      setOnlineState(true);
      return true;
    }
    failStreak++;
    // Ek slow/dropped probe par turant offline mat maano — do baar fail ho tabhi
    // (jab state pehle se offline ho to waise bhi offline hi rehna hai)
    if (force || failStreak >= 2 || !_isOnline) setOnlineState(false);
    return false;
  } finally {
    probeInFlight = false;
  }
}

function scheduleProbe(delay?: number): void {
  if (probeTimer) clearTimeout(probeTimer);
  // Online par ek failure ko turant confirm karo (6s) — jaldi offline pata chale
  const wait = delay ?? (_isOnline && failStreak === 0 ? ONLINE_RETRY_MS : OFFLINE_RETRY_MS);
  probeTimer = setTimeout(runProbe, wait);
}

async function runProbe(): Promise<void> {
  try {
    await probeNetwork();
  } catch {}
  scheduleProbe();
}

function kickProbe(): void {
  // State galat ho to turant sudharo (focus/online event par)
  if (!_isOnline || probeTimer === null) {
    if (probeTimer) clearTimeout(probeTimer);
    probeTimer = setTimeout(runProbe, 50);
  }
}

/** Koi bhi caller — jaise api() ne offline face dekha — turant probe chahiye. */
export function requestNetworkProbe(): void {
  kickProbe();
}

/**
 * Heartbeat start karo — module load par ek hi baar chale.
 * Offline = har 6s probe, online = har 60s check.
 */
export function startNetworkHeartbeat(): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__cm_heartbeat) return;
  w.__cm_heartbeat = true;
  window.addEventListener("online", kickProbe);
  window.addEventListener("focus", kickProbe);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) kickProbe();
  });
  window.addEventListener("pageshow", kickProbe);
  // Pehla probe jaldi — app khulte hi state verify ho jaye
  scheduleProbe(1500);
}

if (typeof window !== "undefined") {
  startNetworkHeartbeat();
}
