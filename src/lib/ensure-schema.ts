import { db } from "@/db";
import { sql } from "drizzle-orm";

// RUNTIME SCHEMA SELF-HEAL — drizzle-kit push build-time par chalta hai par
// prod DB tak apply hona GUARANTEED nahi (proof: phone_norm column missing →
// har customer create 42703 → 500 "Khata save nahi ho paya"; idempotency_keys
// table missing → har write par 42P01). Ye har cold start me ek baar chalta
// hai (module-cached), uske baad no-op. IF NOT EXISTS = safe, kuch todta nahi.

const STATEMENTS = [
  // v1.0.57 ka column — iske bina customer insert + findByPhone dono 42703
  `ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_norm varchar(20)`,
  // Har write ka dedupe — iske bina claim fail-open me girta hai (42P01)
  // aur retry duplicate bana sakta hai
  `CREATE TABLE IF NOT EXISTS idempotency_keys (
    key varchar(100) PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response text,
    created_at timestamp DEFAULT now()
  )`,
];

let ready: Promise<void> | null = null;

export function ensureAppSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const s of STATEMENTS) {
        try {
          await db.execute(sql.raw(s));
        } catch {}
      }
    })().catch(() => {});
  }
  return ready;
}
