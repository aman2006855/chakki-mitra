import { db } from "@/db";
import { customers, transactions, payments } from "@/db/schema";
import { eq, desc, and, sum } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

type Params = { params: Promise<{ id: string }> };

// Read-only ledger for one shop — edit/delete BILKUL nahi (ADMIN.md D)
export async function GET(request: Request, { params }: Params) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) return err("Invalid id", 400);

    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(10, parseInt(url.searchParams.get("limit") || "50", 10) || 50));

    const customerRows = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt))
      .limit(limit);

    const txnRows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    const payRows = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    const creditTotal = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.paymentMode, "credit")));
    const cashTotal = await db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.paymentMode, "cash")));

    return ok({
      customers: customerRows,
      transactions: txnRows,
      payments: payRows,
      summary: {
        creditTotal: parseFloat((creditTotal[0]?.total || 0).toString()),
        cashTotal: parseFloat((cashTotal[0]?.total || 0).toString()),
      },
      readOnly: true,
    });
  } catch (e) {
    console.error("[admin_ledger_error]", e);
    return err("Internal Server Error", 500);
  }
}
