import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { getIdempotencyKey, claimIdempotencyKey, saveIdempotencyResult } from "@/lib/idempotency";
import { ensureCustomerUnique } from "@/lib/customer-unique";
import { normalizePhone } from "@/lib/phone";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

// Ek user ka ek phone = EK hi khata. Yahan har write se pehle check hota hai.
async function findByPhone(userId: number, phoneNorm: string) {
  try {
    const all = await db.select().from(customers).where(eq(customers.userId, userId));
    return all.find((c) => normalizePhone(c.phone) === phoneNorm || c.phoneNorm === phoneNorm) || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const data = await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
  return ok(data);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  // Self-heal: purane duplicate merge + phone_norm backfill + unique index
  await ensureCustomerUnique();

  // Duplicate guard: retry/sync dobara aaye to wahi purana result (naya customer NAHI)
  const idemKey = getIdempotencyKey(request);
  if (idemKey) {
    const prior = await claimIdempotencyKey(idemKey, userId);
    if (prior.duplicate) return ok(prior.response ?? { deduped: true });
  }

  const body = await request.json().catch(() => ({} as any));
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const address = String(body?.address ?? "").trim();
  if (!name || !phone) return err("Naam aur mobile number zaroori hai", 400);

  const phoneNorm = normalizePhone(phone);

  // SAME PHONE mil gaya = wahi khata wapas bhejo (duplicate kabhi nahi banega)
  const existing = await findByPhone(userId, phoneNorm);
  if (existing) {
    if (idemKey) await saveIdempotencyResult(idemKey, userId, { ...existing, deduped: true });
    return ok({ ...existing, deduped: true });
  }

  let row: any = null;
  try {
    [row] = await db
      .insert(customers)
      .values({ name, phone, address, phoneNorm, userId })
      .returning();
  } catch {
    // Race: do device ek saath banaye — unique index ne roka → ab wahi wapas lo
    const again = await findByPhone(userId, phoneNorm);
    if (again) {
      if (idemKey) await saveIdempotencyResult(idemKey, userId, { ...again, deduped: true });
      return ok({ ...again, deduped: true });
    }
    return err("Khata save nahi ho paya", 500);
  }

  if (idemKey) await saveIdempotencyResult(idemKey, userId, row);
  return ok(row);
}

export async function PUT(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json().catch(() => ({} as any));
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return err("Customer id is required", 400);

  // Whitelist: sirf yehi fields badal sakte ho (apne khate tak)
  const updates: Record<string, any> = {};
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body?.phone === "string" && body.phone.trim()) {
    updates.phone = body.phone.trim();
    updates.phoneNorm = normalizePhone(body.phone);
  }
  if (typeof body?.address === "string") updates.address = body.address;
  if (Object.keys(updates).length === 0) return err("Kuch update nahi diya", 400);

  const [row] = await db
    .update(customers)
    .set(updates)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
    .returning();
  if (!row) return err("Khata nahi mila", 404);
  return ok(row);
}

export async function DELETE(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id") || "");
  if (!id) return err("Customer id is required", 400);
  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
  return ok({ success: true });
}
