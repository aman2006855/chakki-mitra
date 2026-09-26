// IndexedDB-backed GET cache — WhatsApp-jaisa offline data, bina kisi permission ke.
// localStorage (~5MB) ke bajaye IndexedDB (50MB+) — customers/transactions aaram se.
// TTL: 7 din. Offline par expired cache bhi dikhta hai (stale-while-revalidate).
// IDB na chale (rare) to localStorage fallback.

import { getCached as lsGet, setCache as lsSet } from "./offline-db";

const DB_NAME = "chakki-mitra";
const STORE = "api-cache";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 din

export interface CacheResult {
  data: any;
  timestamp: number;
}

function idbSupported(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function idbGetRaw(key: string): Promise<CacheResult | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(key);
      get.onsuccess = () => {
        const v = get.result as CacheResult | undefined;
        db.close();
        resolve(v || null);
      };
      get.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try { db.close(); } catch {}
      resolve(null);
    }
  });
}

async function idbSetRaw(key: string, value: CacheResult): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try { db.close(); } catch {}
      resolve();
    }
  });
}

// Cache padho — maxAge tak fresh, uske baad bhi (stale) wapas milta hai.
// stale=true ka matlab: net aane par refresh karo, par abhi yehi dikhao.
export async function cacheGet(url: string): Promise<{ data: any; timestamp: number; stale: boolean } | null> {
  if (idbSupported()) {
    try {
      const v = await idbGetRaw(url);
      if (v && v.data !== undefined) {
        return { data: v.data, timestamp: v.timestamp || 0, stale: Date.now() - (v.timestamp || 0) > MAX_AGE ? true : false };
      }
    } catch {}
  }
  // Fallback: purana localStorage cache
  try {
    const d = lsGet(url);
    if (d !== null && d !== undefined) return { data: d, timestamp: 0, stale: true };
  } catch {}
  return null;
}

export async function cacheSet(url: string, data: any): Promise<void> {
  const entry: CacheResult = { data, timestamp: Date.now() };
  if (idbSupported()) {
    try {
      await idbSetRaw(url, entry);
      return;
    } catch {}
  }
  try {
    lsSet(url, data);
  } catch {}
}

// Cache version — naya APK/schema aane par purana cache auto-clear
const CACHE_VERSION_KEY = "cm_cache_version";

export function checkCacheVersion(current: string): void {
  try {
    const prev = localStorage.getItem(CACHE_VERSION_KEY);
    if (prev && prev !== current) {
      clearAllCache();
    }
    localStorage.setItem(CACHE_VERSION_KEY, current);
  } catch {}
}

export async function clearAllCache(): Promise<void> {
  if (idbSupported()) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          try { db.close(); } catch {}
          resolve();
        }
      });
    } catch {}
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("cm_cache_")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// "Kitna purana data" — Phase 4 banner ke liye
export function ageText(timestamp: number): string {
  if (!timestamp) return "purana";
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return "abhi ka";
  if (mins < 60) return `${mins} min purana`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ghante purana`;
  const days = Math.floor(hrs / 24);
  return `${days} din purana`;
}
