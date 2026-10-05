import { db } from "@/db";
import {
  users,
  customers,
  transactions,
  payments,
  supportTickets,
  subscriptions,
  idempotencyKeys,
} from "@/db/schema";
import { sql, count } from "drizzle-orm";
import { ok, options } from "@/lib/cors";
import { requireAdmin } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// EXACT database health — measured live, koi static/andaaza number nahi:
// reachability + query latency + server time + Postgres version + DB size +
// har main table ki row count. Overview se alag halka endpoint taaki
// 30s polling sasti rahe.
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;
  const checkedAt = new Date().toISOString();
  try {
    const t0 = Date.now();
    await db.execute(sql`select 1 as x`);
    const latencyMs = Date.now() - t0;

    const verRes: any = await db.execute(sql`select version() as v`);
    const versionFull: string = verRes?.rows?.[0]?.v || "";
    const version = versionFull.split(" ").slice(0, 2).join(" ");

    const nowRes: any = await db.execute(sql`select now() as t`);
    const serverTime: string = nowRes?.rows?.[0]?.t || "";

    const sizeRes: any = await db.execute(
      sql`select pg_size_pretty(pg_database_size(current_database())) as s`
    );
    const dbSize: string = sizeRes?.rows?.[0]?.s || "";

    const tables: Record<string, number> = {};
    const counts: [string, any][] = [
      ["users", users],
      ["customers", customers],
      ["transactions", transactions],
      ["payments", payments],
      ["support_tickets", supportTickets],
      ["subscriptions", subscriptions],
      ["idempotency_keys", idempotencyKeys],
    ];
    for (const [name, tbl] of counts) {
      try {
        const [row] = await db.select({ n: count() }).from(tbl);
        tables[name] = Number(row?.n || 0);
      } catch {
        tables[name] = -1; // -1 = count fail (table/column missing?) — chhupao mat
      }
    }

    return ok({
      ok: true,
      reachable: true,
      latencyMs,
      serverTime,
      version,
      dbSize,
      tables,
      checkedAt,
    });
  } catch (e) {
    return ok({
      ok: false,
      reachable: false,
      error: e instanceof Error ? e.message : "DB connect nahi ho raha",
      checkedAt,
    });
  }
}
