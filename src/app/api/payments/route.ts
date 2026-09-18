import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, transactions } from "@/db/schema";
import { desc, eq, and, sum, sql } from "drizzle-orm";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) throw new Error("unauthorized");
  return JSON.parse(sessionCookie.value);
}

export async function GET() {
  const session = await getSession();
  const data = await db.select().from(payments).where(eq(payments.userId, session.userId)).orderBy(desc(payments.createdAt)).limit(100);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const { customerId, amount, type, description } = body;

  if (type === "dues_payment" || type === "partial_payment") {
    const creditTotal = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.customerId, customerId), eq(transactions.userId, session.userId), eq(transactions.paymentMode, "credit")));
    const duesPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, customerId), eq(payments.userId, session.userId), sql`${payments.type} IN ('dues_payment', 'partial_payment')`));
    const totalCredit = parseFloat((creditTotal[0]?.total || 0).toString());
    const totalPaid = parseFloat((duesPaidTotal[0]?.total || 0).toString());
    const currentDues = Math.max(0, totalCredit - totalPaid);
    const payAmount = parseFloat(amount);

    if (payAmount > currentDues && currentDues > 0) {
      const duesRow = await db.insert(payments).values({ customerId, userId: session.userId, amount: currentDues.toString(), type: type as any, description: description ? `${description} (बकाया ₹${currentDues.toFixed(0)})` : "बकाया चुकाया" }).returning();
      const advanceRow = await db.insert(payments).values({ customerId, userId: session.userId, amount: (payAmount - currentDues).toString(), type: "advance" as const, description: description ? `${description} (अतिरिक्त एडवांस ₹${(payAmount - currentDues).toFixed(0)})` : "अतिरिक्त एडवांस" }).returning();
      return NextResponse.json({ duesPayment: duesRow[0], advancePayment: advanceRow[0] });
    }

    if (currentDues <= 0) {
      const row = await db.insert(payments).values({ customerId, userId: session.userId, amount, type: "advance" as const, description: description ? `${description} (बकाया शेष नहीं, एडवांस)` : "एडवांस" }).returning();
      return NextResponse.json(row[0]);
    }
  }

  const row = await db.insert(payments).values({ ...body, userId: session.userId }).returning();
  return NextResponse.json(row[0]);
}
