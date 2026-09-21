import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return err("not found", 404);
  return ok({
    email: user[0].email || "",
    shopName: user[0].shopName || "श्री श्याम आटा चक्की",
    shopPhone: user[0].shopPhone || "",
    attaRate: user[0].attaRate || "5",
    daliaRate: user[0].daliaRate || "8",
    isRegistered: user[0].isRegistered ?? false,
  });
}

export async function PUT(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  await db.update(users).set(body).where(eq(users.id, userId));
  return ok({ success: true });
}

export async function POST(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  await db.update(users).set(body).where(eq(users.id, userId));
  return ok({ success: true });
}
