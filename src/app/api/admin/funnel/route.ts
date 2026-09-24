import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, gte, count, sql, desc } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET — registration funnel + guest visibility
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [total] = await db.select({ n: count() }).from(users);
    const [signupOnly] = await db
      .select({ n: count() })
      .from(users)
      .where(eq(users.isRegistered, false));
    const [completed] = await db
      .select({ n: count() })
      .from(users)
      .where(eq(users.isRegistered, true));
    const [guests] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`email LIKE '%@local'`);
    const [suspended] = await db
      .select({ n: count() })
      .from(users)
      .where(eq(users.status, "suspended"));

    // Non-guest incomplete (real signup but wizard not done) — dropout
    const [incompleteReal] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.isRegistered} = false AND email NOT LIKE '%@local'`);

    const [todaySignup] = await db
      .select({ n: count() })
      .from(users)
      .where(gte(users.createdAt, todayStart));
    const [weekSignup] = await db
      .select({ n: count() })
      .from(users)
      .where(gte(users.createdAt, weekAgo));

    const totalN = Number(total?.n || 0);
    const completedN = Number(completed?.n || 0);
    const signupOnlyN = Number(signupOnly?.n || 0);
    const completionRate = totalN > 0 ? Math.round((completedN / totalN) * 100) : 0;

    // Dropout list: incomplete non-guests
    const dropout = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        shopName: users.shopName,
        createdAt: users.createdAt,
        smsCredits: users.smsCredits,
        status: users.status,
      })
      .from(users)
      .where(sql`${users.isRegistered} = false AND email NOT LIKE '%@local'`)
      .orderBy(desc(users.createdAt))
      .limit(50);

    return ok({
      funnel: {
        totalAccounts: totalN,
        signupOnly: signupOnlyN,
        registerCompleted: completedN,
        guests: Number(guests?.n || 0),
        suspended: Number(suspended?.n || 0),
        incompleteReal: Number(incompleteReal?.n || 0),
        completionRate,
        signupsToday: Number(todaySignup?.n || 0),
        signups7d: Number(weekSignup?.n || 0),
      },
      dropout: dropout.map((r) => ({
        id: r.id,
        email: `${r.email.slice(0, 1)}***@${r.email.split("@")[1] || ""}`,
        name: r.name || "",
        shopName: r.shopName || "",
        createdAt: r.createdAt,
        smsCredits: r.smsCredits,
        status: r.status || "active",
      })),
      note: "Dropout = OTP signup ke baad register wizard complete nahi kiya.",
    });
  } catch (e) {
    console.error("[admin_funnel_error]", e);
    return err("Internal Server Error", 500);
  }
}
