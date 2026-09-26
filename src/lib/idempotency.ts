import { db } from "@/db";
import { idempotencyKeys } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

const KEY_TTL = 7 * 24 * 60 * 60 * 1000; // 7 din — purani keys auto-safai

// Pehle claim karo: nayi key insert karo.
// Insert hui = pehli baar (proceed). Conflict = duplicate (pehle ka result do).
export async function claimIdempotencyKey(
  key: string,
  userId: number
): Promise<{ duplicate: boolean; response: any | null }> {
  try {
    // Opportunistic safai — best effort
    try {
      await db
        .delete(idempotencyKeys)
        .where(lt(idempotencyKeys.createdAt, new Date(Date.now() - KEY_TTL)));
    } catch {}
    if (!key || key.length > 100) return { duplicate: false, response: null };
    const inserted = await db
      .insert(idempotencyKeys)
      .values({ key, userId, response: null })
      .onConflictDoNothing()
      .returning({ key: idempotencyKeys.key });
    if (inserted.length > 0) return { duplicate: false, response: null };
    // Conflict — pehle process ho chuki
    const [row] = await db
      .select({ response: idempotencyKeys.response, userId: idempotencyKeys.userId })
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1);
    if (!row || row.userId !== userId) return { duplicate: false, response: null };
    try {
      return { duplicate: true, response: row.response ? JSON.parse(row.response) : { deduped: true } };
    } catch {
      return { duplicate: true, response: { deduped: true } };
    }
  } catch {
    // DB fail = fail-open (normal flow chale, duplicate ka chhota risk)
    return { duplicate: false, response: null };
  }
}

export async function saveIdempotencyResult(key: string, userId: number, response: any): Promise<void> {
  try {
    if (!key || key.length > 100) return;
    let text = "";
    try {
      text = JSON.stringify(response ?? { ok: true }).slice(0, 5000);
    } catch {
      text = '{"ok":true}';
    }
    await db
      .update(idempotencyKeys)
      .set({ response: text })
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.userId, userId)));
  } catch {}
}

export function getIdempotencyKey(request: Request): string | null {
  const k = request.headers.get("x-idempotency-key");
  if (!k) return null;
  const t = k.trim();
  if (!t || t.length > 100) return null;
  return t;
}

// ensureAdminSchema se call hota hai (single source of DDL)
export const IDEMPOTENCY_DDL = `CREATE TABLE IF NOT EXISTS idempotency_keys (
  key varchar(100) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response text,
  created_at timestamp DEFAULT now()
)`;
