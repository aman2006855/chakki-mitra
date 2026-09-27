import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureAppSchema } from "./ensure-schema";

// DUPLICATE KHATA = ZERO guarantee.
// 1) phone_norm backfill (JS normalizePhone ka SQL equivalent)
// 2) purane duplicate merge — sabse purana khata zinda, uske kharche/udhaar usi par
// 3) UNIQUE index (user_id, phone_norm) — aage se DB khud rokega
//
// Ye ek hi baar chalta hai per process (module-level promise).
// Kuch bhi fail ho to app chalta rehta hai — agla cold start dobara try karega.

const NORM = `
  CASE
    WHEN length(x) = 12 AND x LIKE '91%' THEN substring(x from 3)
    ELSE x
  END
`;

// normalizePhone ka bilkul same logic: digits → leading 0 hatao → "91" prefix hatao
const BACKFILL = `
  UPDATE customers c
  SET phone_norm = ${NORM}
  FROM (
    SELECT id,
      CASE WHEN length(t.r) > 10 AND t.r LIKE '0%' THEN regexp_replace(t.r, '^0+', '') ELSE t.r END AS x
    FROM (SELECT id, regexp_replace(phone, '[^0-9]', '', 'g') AS r FROM customers WHERE phone_norm IS NULL) t
  ) u
  WHERE c.id = u.id
`;

const SHIFT_TRANSACTIONS = `
  WITH ranked AS (
    SELECT id, first_value(id) OVER (PARTITION BY user_id, phone_norm ORDER BY id) AS keep
    FROM customers WHERE phone_norm IS NOT NULL
  ), dups AS (SELECT id, keep FROM ranked WHERE id <> keep)
  UPDATE transactions t SET customer_id = d.keep FROM dups d WHERE t.customer_id = d.id
`;

const SHIFT_PAYMENTS = `
  WITH ranked AS (
    SELECT id, first_value(id) OVER (PARTITION BY user_id, phone_norm ORDER BY id) AS keep
    FROM customers WHERE phone_norm IS NOT NULL
  ), dups AS (SELECT id, keep FROM ranked WHERE id <> keep)
  UPDATE payments t SET customer_id = d.keep FROM dups d WHERE t.customer_id = d.id
`;

const DELETE_DUPES = `
  WITH ranked AS (
    SELECT id, first_value(id) OVER (PARTITION BY user_id, phone_norm ORDER BY id) AS keep
    FROM customers WHERE phone_norm IS NOT NULL
  ), dups AS (SELECT id, keep FROM ranked WHERE id <> keep)
  DELETE FROM customers c USING dups d WHERE c.id = d.id
`;

const CREATE_INDEX = `CREATE UNIQUE INDEX IF NOT EXISTS customers_user_phone_uk ON customers (user_id, phone_norm)`;
const DROP_INDEX = `DROP INDEX IF EXISTS customers_user_phone_uk`;

async function rows(sqlText: string): Promise<any[]> {
  try {
    const res: any = await db.execute(sql.raw(sqlText));
    return res?.rows ?? [];
  } catch {
    return [];
  }
}

async function needsWork(): Promise<boolean> {
  if ((await rows(`SELECT 1 AS x FROM customers WHERE phone_norm IS NULL LIMIT 1`)).length) return true;
  const dup = await rows(
    `SELECT 1 AS x FROM customers WHERE phone_norm IS NOT NULL GROUP BY user_id, phone_norm HAVING count(*) > 1 LIMIT 1`
  );
  return dup.length > 0;
}

async function run(): Promise<void> {
  // Column hi na ho to neeche ke saare queries 42703 me fail hote the —
  // pehle column + table pakka karo, phir backfill/merge/index
  await ensureAppSchema();
  // Aam taur par: kuch nahi — sirf index confirm (no-op).
  if (!(await needsWork())) {
    try {
      await db.execute(sql.raw(CREATE_INDEX));
    } catch {}
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Naya column abhi khaali hai → pehle index hatao, warna backfill tak conflict
      await tx.execute(sql.raw(DROP_INDEX));
      await tx.execute(sql.raw(BACKFILL));
      // Kharche/udhaar shift kiye bina delete KABHI mat karo (data loss)
      await tx.execute(sql.raw(SHIFT_TRANSACTIONS));
      await tx.execute(sql.raw(SHIFT_PAYMENTS));
      await tx.execute(sql.raw(DELETE_DUPES));
      await tx.execute(sql.raw(CREATE_INDEX));
    });
  } catch {
    // Fail-open: app chalta rahe, agli cold start par dobara merge
  }
}

let ready: Promise<void> | null = null;

export function ensureCustomerUnique(): Promise<void> {
  if (!ready) {
    ready = run().catch(() => {});
  }
  return ready;
}
