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
  });
  window.addEventListener("offline", () => {
    setOnlineState(false);
  });
}
