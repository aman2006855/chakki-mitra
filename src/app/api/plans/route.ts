import { db } from "@/db";
import { plans } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

function parseFeatures(raw: string | null): Record<string, boolean> {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

// GET /api/plans — shop ke liye active plans (Subscription tab)
// Payment gateway nahi hai isliye buy action nahi — sirf catalog + Coming Soon
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  try {
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.active, true))
      .orderBy(asc(plans.priceInr));
    return ok({
      plans: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        priceInr: r.priceInr,
        durationDays: r.durationDays,
        smsQuota: r.smsQuota ?? 0,
        features: parseFeatures(r.features),
      })),
      paymentsEnabled: false,
    });
  } catch (e) {
    console.error("[plans_error]", e);
    return err("Internal Server Error", 500);
  }
}
