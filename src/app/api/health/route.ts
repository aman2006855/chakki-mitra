import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ok, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET() {
  await db.execute(sql`select 1`);
  return ok({ status: "ok" });
}
