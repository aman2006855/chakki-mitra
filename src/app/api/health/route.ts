import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ok, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET() {
  await db.execute(sql`select 1`);
  // rev = deploy marker (verify karne ke liye ki naya build live hai ya nahi)
  return ok({ status: "ok", rev: "cust-unique-v1" });
}
