import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, payments, customers } from "@/db/schema";
import { sum, eq, sql, and } from "drizzle-orm";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) throw new Error("unauthorized");
  return JSON.parse(sessionCookie.value);
}

export async function GET() {
  const session = await getSession();
  const userId = session.userId;

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

  return NextResponse.json({ totalCredit, totalCash, totalSales: totalCredit + totalCash, totalAtta, totalDalia, totalAdvance, totalDuesPaid, totalOutstanding: Math.max(0, totalOutstanding), customerCount: Number(customerCount[0]?.count || 0) });
}
