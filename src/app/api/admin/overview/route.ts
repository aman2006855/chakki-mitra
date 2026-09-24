import { db } from "@/db";
import { users, customers, transactions, payments, plans, supportTickets, auditLogs } from "@/db/schema";
import { sql, eq, count, sum, gte } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

    const [totalUsers] = await db.select({ n: count() }).from(users);
    const [registered] = await db.select({ n: count() }).from(users).where(eq(users.isRegistered, true));
    const [incomplete] = await db.select({ n: count() }).from(users).where(eq(users.isRegistered, false));
    const [suspended] = await db.select({ n: count() }).from(users).where(eq(users.status, "suspended"));
    const [guestCount] = await db.select({ n: count() }).from(users).where(sql`email LIKE '%@local'`);

    const [newToday] = await db.select({ n: count() }).from(users).where(gte(users.createdAt, todayStart));
    const [new7d] = await db.select({ n: count() }).from(users).where(gte(users.createdAt, weekAgo));
    const [new30d] = await db.select({ n: count() }).from(users).where(gte(users.createdAt, monthAgo));

    const [txnCount] = await db.select({ n: count() }).from(transactions);
    const [creditSum] = await db.select({ total: sum(transactions.amount) }).from(transactions).where(eq(transactions.paymentMode, "credit"));
    const [cashSum] = await db.select({ total: sum(transactions.amount) }).from(transactions).where(eq(transactions.paymentMode, "cash"));

    const [creditStats] = await db.select({ totalBalance: sum(users.smsCredits) }).from(users);
    const [exhaustedCount] = await db.select({ n: count() }).from(users).where(eq(users.smsCredits, 0));

    const [referralUsers] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.referredBy} IS NOT NULL`);
    const [withCodes] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.referralCode} IS NOT NULL`);

    const [openTickets] = await db
      .select({ n: count() })
      .from(supportTickets)
      .where(sql`${supportTickets.status} IN ('new', 'in_progress', 'waiting')`);

    const [activePlans] = await db.select({ n: count() }).from(plans).where(eq(plans.active, true));
    const [recentAudit] = await db
      .select({ n: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, weekAgo));

    let dbOk = true;
    try {
      await db.execute(sql`select 1`);
    } catch {
      dbOk = false;
    }

    return ok({
      accounts: {
        total: Number(totalUsers?.n || 0),
        registered: Number(registered?.n || 0),
        incomplete: Number(incomplete?.n || 0),
        suspended: Number(suspended?.n || 0),
        guests: Number(guestCount?.n || 0),
      },
      registrations: {
        today: Number(newToday?.n || 0),
        last7d: Number(new7d?.n || 0),
        last30d: Number(new30d?.n || 0),
      },
      activity: {
        transactions: Number(txnCount?.n || 0),
        totalCredit: parseFloat((creditSum?.total || 0).toString()),
        totalCash: parseFloat((cashSum?.total || 0).toString()),
        customers: Number((await db.select({ n: count() }).from(customers))[0]?.n || 0),
        payments: Number((await db.select({ n: count() }).from(payments))[0]?.n || 0),
      },
      smsCredits: {
        totalBalance: Number(creditStats?.totalBalance || 0),
        exhausted: Number(exhaustedCount?.n || 0),
      },
      referrals: {
        codes: Number(withCodes?.n || 0),
        referredAccounts: Number(referralUsers?.n || 0),
      },
      ops: {
        openTickets: Number(openTickets?.n || 0),
        activePlans: Number(activePlans?.n || 0),
        recentAudit: Number(recentAudit?.n || 0),
        dbHealthy: dbOk,
        lastRefreshedAt: now.toISOString(),
      },
    });
  } catch (e) {
    console.error("[admin_overview_error]", e);
    return err("Internal Server Error", 500);
  }
}
