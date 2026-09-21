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
  localStorage.setItem(PENDING_KEY, "[]");
}

let onlineListeners: ((online: boolean) => void)[] = [];
let _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

export function isOnline(): boolean {
  return _isOnline;
}

export function onOnlineChange(cb: (online: boolean) => void): () => void {
  onlineListeners.push(cb);
  return () => { onlineListeners = onlineListeners.filter((l) => l !== cb); };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    _isOnline = true;
    onlineListeners.forEach((l) => l(true));
  });
  window.addEventListener("offline", () => {
    _isOnline = false;
    onlineListeners.forEach((l) => l(false));
  });
}
