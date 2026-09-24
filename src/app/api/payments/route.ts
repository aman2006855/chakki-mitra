import { db } from "@/db";
import { payments, transactions } from "@/db/schema";
import { desc, eq, and, sum, sql } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const data = await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(100);
  return ok(data);
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const body = await request.json();
  const { customerId, amount, type, description } = body;

  if (type === "dues_payment" || type === "partial_payment") {
    const creditTotal = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.customerId, customerId), eq(transactions.userId, userId), eq(transactions.paymentMode, "credit")));
    const duesPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, customerId), eq(payments.userId, userId), sql`${payments.type} IN ('dues_payment', 'partial_payment')`));
    const totalCredit = parseFloat((creditTotal[0]?.total || 0).toString());
    const totalPaid = parseFloat((duesPaidTotal[0]?.total || 0).toString());
    const currentDues = Math.max(0, totalCredit - totalPaid);
    const payAmount = parseFloat(amount);

    if (payAmount > currentDues && currentDues > 0) {
      const duesRow = await db.insert(payments).values({ customerId, userId, amount: currentDues.toString(), type: type as any, description: description ? `${description} (बकाया ₹${currentDues.toFixed(0)})` : "बकाया चुकाया" }).returning();
      const advanceRow = await db.insert(payments).values({ customerId, userId, amount: (payAmount - currentDues).toString(), type: "advance" as const, description: description ? `${description} (अतिरिक्त एडवांस ₹${(payAmount - currentDues).toFixed(0)})` : "अतिरिक्त एडवांस" }).returning();
      return ok({ duesPayment: duesRow[0], advancePayment: advanceRow[0] });
    }

    if (currentDues <= 0) {
      const row = await db.insert(payments).values({ customerId, userId, amount, type: "advance" as const, description: description ? `${description} (बकाया शेष नहीं, एडवांस)` : "एडवांस" }).returning();
      return ok(row[0]);
    }
  }

  const row = await db.insert(payments).values({ ...body, userId }).returning();
  return ok(row[0]);
}
