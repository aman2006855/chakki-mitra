import { db } from "@/db";
import { transactions, payments, customers } from "@/db/schema";
import { sum, eq, sql, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);

  const todayCredit = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.paymentMode, "credit"), eq(transactions.userId, userId)));
  const totalCredit = parseFloat((todayCredit[0]?.total || 0).toString());
  const todayCash = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.paymentMode, "cash"), eq(transactions.userId, userId)));
  const totalCash = parseFloat((todayCash[0]?.total || 0).toString());
  const attaData = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.productType, "atta"), eq(transactions.userId, userId)));
  const totalAtta = parseFloat((attaData[0]?.total || 0).toString());
  const daliaData = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.productType, "dalia"), eq(transactions.userId, userId)));
  const totalDalia = parseFloat((daliaData[0]?.total || 0).toString());
  const totalAdvances = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.type, "advance"), eq(payments.userId, userId)));
  const totalAdvance = parseFloat((totalAdvances[0]?.total || 0).toString());
  const duesPaidData = await db.select({ total: sum(payments.amount) }).from(payments).where(and(sql`${payments.type} IN ('dues_payment', 'partial_payment')`, eq(payments.userId, userId)));
  const totalDuesPaid = parseFloat((duesPaidData[0]?.total || 0).toString());
  const totalOutstanding = totalCredit - totalDuesPaid;
  const customerCount = await db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.userId, userId));

  return ok({ totalCredit, totalCash, totalSales: totalCredit + totalCash, totalAtta, totalDalia, totalAdvance, totalDuesPaid, totalOutstanding: Math.max(0, totalOutstanding), customerCount: Number(customerCount[0]?.count || 0) });
}
