// Cache warming — app khulne par sab tabs ka data background me save.
// Taaki offline kholo to har tab me phone ka save data mile (WhatsApp jaisa).
// Silent + fail-safe: error aaye to kuch nahi hota, normal flow chalta hai.

import { api } from "./api";
import { isOnline } from "./offline-db";
import { checkCacheVersion } from "./idb-cache";

// Schema/cache format badle to ye bump karo — purana cache auto-clear
const CACHE_SCHEMA_VERSION = "v3";

const WARM_URLS = [
  "/api/settings",
  "/api/customers",
  "/api/transactions",
  "/api/payments",
  "/api/reports",
  "/api/plans",
  "/api/subscriptions",
  "/api/support",
  "/api/sms-credits",
];

let warmed = false;

export function warmCache(): void {
  if (warmed || !isOnline()) return;
  warmed = true;
  try {
    checkCacheVersion(CACHE_SCHEMA_VERSION);
  } catch {}
  // Fire-and-forget — api() khud cache me save karta hai
  for (const url of WARM_URLS) {
    api(url).then((res) => res.arrayBuffer().catch(() => {})).catch(() => {});
  }
}
