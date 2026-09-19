import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const data = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(100);
  return ok(data);
}

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  const row = await db.insert(transactions).values({ ...body, userId }).returning();
  return ok(row[0]);
}
