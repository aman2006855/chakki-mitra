import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, writeAudit, schemaErrorNote } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

function parseFeatures(raw: string | null): Record<string, boolean> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// GET — list plans (active first)
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const rows = await db.select().from(plans).orderBy(desc(plans.active), desc(plans.createdAt));
    return ok(
      rows.map((r) => ({
        ...r,
        features: parseFeatures(r.features),
      }))
    );
  } catch (e) {
    console.error("[admin_plans_error]", e);
    return err(schemaErrorNote(e), 500);
  }
}

// POST — create plan
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const priceInr = Number(body.priceInr);
    const durationDays = Number(body.durationDays);
    const smsQuota = body.smsQuota === undefined ? 0 : Number(body.smsQuota);
    const active = body.active !== false;
    const features = body.features && typeof body.features === "object" ? body.features : {};
    const reason = String(body.reason || "").trim();

    if (!name) return err("Plan name required", 400);
    if (!Number.isFinite(priceInr) || priceInr < 0 || priceInr > 1000000) {
      return err("priceInr must be 0–1000000", 400);
    }
    if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3650) {
      return err("durationDays must be 1–3650", 400);
    }
    if (!Number.isFinite(smsQuota) || smsQuota < -1 || smsQuota > 1000000) {
      return err("smsQuota invalid (-1 unlimited, or 0–1000000)", 400);
    }

    const [row] = await db
      .insert(plans)
      .values({
        name,
        description,
        priceInr: Math.round(priceInr),
        durationDays: Math.round(durationDays),
        smsQuota: Math.round(smsQuota),
        active,
        features: JSON.stringify(features),
      })
      .returning();

    await writeAudit({
      action: "plan.create",
      targetType: "plan",
      targetId: String(row.id),
      reason,
      detail: `${name} ₹${priceInr}/${durationDays}d`,
    });

    return ok({ ...row, features: parseFeatures(row.features) });
  } catch (e) {
    console.error("[admin_plan_create_error]", e);
    return err(schemaErrorNote(e), 500);
  }
}

// PUT — update plan { id, ... }
export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return err("id required", 400);

    const [existing] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    if (!existing) return err("Plan not found", 404);

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return err("Plan name cannot be empty", 400);
      updates.name = name;
    }
    if (body.description !== undefined) updates.description = String(body.description);
    if (body.priceInr !== undefined) {
      const p = Number(body.priceInr);
      if (!Number.isFinite(p) || p < 0) return err("Invalid priceInr", 400);
      updates.priceInr = Math.round(p);
    }
    if (body.durationDays !== undefined) {
      const d = Number(body.durationDays);
      if (!Number.isFinite(d) || d < 1) return err("Invalid durationDays", 400);
      updates.durationDays = Math.round(d);
    }
    if (body.smsQuota !== undefined) {
      const q = Number(body.smsQuota);
      if (!Number.isFinite(q) || q < -1) return err("Invalid smsQuota", 400);
      updates.smsQuota = Math.round(q);
    }
    if (body.active !== undefined) updates.active = Boolean(body.active);
    if (body.features !== undefined && typeof body.features === "object") {
      updates.features = JSON.stringify(body.features);
    }

    const reason = String(body.reason || "").trim();
    const [row] = await db.update(plans).set(updates).where(eq(plans.id, id)).returning();

    await writeAudit({
      action: "plan.update",
      targetType: "plan",
      targetId: String(id),
      reason,
      detail: body.active === false ? "deactivated" : "updated",
    });

    return ok({ ...row, features: parseFeatures(row.features) });
  } catch (e) {
    console.error("[admin_plan_update_error]", e);
    return err(schemaErrorNote(e), 500);
  }
}
