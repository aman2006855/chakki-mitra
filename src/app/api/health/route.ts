import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  await db.execute(sql`select 1`);
  return NextResponse.json({ status: "ok" });
}
