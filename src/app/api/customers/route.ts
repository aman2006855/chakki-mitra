import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const data = await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  return ok(data);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  const [row] = await db.insert(customers).values({ ...body, userId }).returning();
  return ok(row);
}

export async function PUT(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return err("Customer id is required", 400);
  const [row] = await db.update(customers).set(updates).where(eq(customers.id, id)).returning();
  return ok(row);
}

export async function DELETE(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id") || "");
  if (!id) return err("Customer id is required", 400);
  await db.delete(customers).where(eq(customers.id, id));
  return ok({ success: true });
}
