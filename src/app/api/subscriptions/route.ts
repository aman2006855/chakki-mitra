import { db } from "@/db";
import { subscriptions, plans } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

function parseFeatures(raw: string | null): Record<string, boolean> {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// GET /api/subscriptions — meri current plan + buy history + total spent
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  try {
    const rows = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        pricePaid: subscriptions.pricePaid,
        startAt: subscriptions.startAt,
        endAt: subscriptions.endAt,
        createdAt: subscriptions.createdAt,
        planId: plans.id,
        planName: plans.name,
        planDescription: plans.description,
        planPrice: plans.priceInr,
        planDuration: plans.durationDays,
        planSmsQuota: plans.smsQuota,
        planFeatures: plans.features,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(100);

    const now = new Date();
    const history = rows.map((r) => ({
      id: r.id,
      status: r.status || "pending",
      pricePaid: r.pricePaid ?? 0,
      startAt: r.startAt,
      endAt: r.endAt,
      createdAt: r.createdAt,
      plan: r.planId
        ? {
            id: r.planId,
            name: r.planName || "",
            description: r.planDescription || "",
            priceInr: r.planPrice ?? 0,
            durationDays: r.planDuration ?? 0,
            smsQuota: r.planSmsQuota ?? 0,
            features: parseFeatures(r.planFeatures),
          }
        : null,
    }));

    // Current = latest active jiska endAt future me ho
    const current =
      history.find(
        (h) =>
          (h.status === "active" || h.status === "pending") &&
          h.endAt &&
          new Date(h.endAt).getTime() > now.getTime()
      ) || null;

    const totalSpent = history
      .filter((h) => h.status === "active" || h.status === "expired")
      .reduce((sum, h) => sum + (h.pricePaid || 0), 0);

    const [countRow] = await db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    return ok({
      current,
      history,
      totalSpent,
      totalPlans: Number(countRow?.n || 0),
      paymentsEnabled: false,
    });
  } catch (e) {
    console.error("[subscriptions_error]", e);
    return err("Internal Server Error", 500);
  }
}
