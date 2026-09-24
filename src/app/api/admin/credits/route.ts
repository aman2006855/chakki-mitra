import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql, count, desc, asc } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, maskEmail, writeAudit } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET — credit reconciliation (balances + exhausted)
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "summary";

    if (view === "exhausted") {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          shopName: users.shopName,
          smsCredits: users.smsCredits,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.smsCredits, 0))
        .orderBy(asc(users.smsCredits), desc(users.createdAt))
        .limit(200);
      return ok({
        items: rows.map((r) => ({ ...r, emailMasked: maskEmail(r.email), status: r.status || "active" })),
        total: rows.length,
      });
    }

    if (view === "low") {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          shopName: users.shopName,
          smsCredits: users.smsCredits,
          status: users.status,
        })
        .from(users)
        .where(sql`COALESCE(${users.smsCredits}, 0) BETWEEN 1 AND 5`)
        .orderBy(asc(users.smsCredits))
        .limit(200);
      return ok({
        items: rows.map((r) => ({ ...r, emailMasked: maskEmail(r.email), status: r.status || "active" })),
      });
    }

    const [totalBalance] = await db
      .select({ n: sql<number>`COALESCE(SUM(${users.smsCredits}), 0)` })
      .from(users);
    const [exhausted] = await db.select({ n: count() }).from(users).where(eq(users.smsCredits, 0));
    const [low] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`COALESCE(${users.smsCredits}, 0) BETWEEN 1 AND 5`);
    const [totalAccounts] = await db.select({ n: count() }).from(users);
    const [avgBal] = await db
      .select({ n: sql<number>`COALESCE(AVG(${users.smsCredits}), 0)` })
      .from(users);

    const top = await db
      .select({
        id: users.id,
        email: users.email,
        shopName: users.shopName,
        name: users.name,
        smsCredits: users.smsCredits,
        status: users.status,
      })
      .from(users)
      .orderBy(desc(users.smsCredits))
      .limit(50);

    return ok({
      totalBalance: Number(totalBalance?.n || 0),
      exhausted: Number(exhausted?.n || 0),
      low: Number(low?.n || 0),
      totalAccounts: Number(totalAccounts?.n || 0),
      avgBalance: Math.round(Number(avgBal?.n || 0)),
      top: top.map((r) => ({ ...r, emailMasked: maskEmail(r.email), status: r.status || "active" })),
    });
  } catch (e) {
    console.error("[admin_credits_error]", e);
    return err("Internal Server Error", 500);
  }
}

// POST — top-up { userId, amount, reason }
export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const userId = Number(body.userId);
    const amount = Number(body.amount);
    const reason = String(body.reason || "").trim();

    if (!Number.isFinite(userId) || userId <= 0) return err("userId required", 400);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return err("amount must be 1–10000", 400);
    }
    if (reason.length < 3) return err("Reason required (min 3 chars)", 400);

    const [user] = await db
      .select({ id: users.id, email: users.email, smsCredits: users.smsCredits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) return err("User not found", 404);

    const [updated] = await db
      .update(users)
      .set({ smsCredits: sql`COALESCE(${users.smsCredits}, 0) + ${amount}` })
      .where(eq(users.id, userId))
      .returning({ smsCredits: users.smsCredits });

    await writeAudit({
      action: "credits.topup",
      targetType: "user",
      targetId: String(userId),
      reason,
      detail: `+${amount} credits (balance ${user.smsCredits ?? 0} → ${updated?.smsCredits ?? 0}) email=${maskEmail(user.email)}`,
    });

    return ok({
      success: true,
      userId,
      amount,
      newBalance: updated?.smsCredits ?? 0,
    });
  } catch (e) {
    console.error("[admin_topup_error]", e);
    return err("Internal Server Error", 500);
  }
}
