import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers, transactions, payments } from "@/db/schema";
import { eq, sum, desc, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";

function getSession() {
  return null;
}

async function checkAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) throw new Error("unauthorized");
  return JSON.parse(sessionCookie.value);
}

export async function GET(req: Request) {
  const session = await checkAuth();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const customer = await db.select().from(customers).where(and(eq(customers.id, Number(id)), eq(customers.userId, session.userId))).limit(1);
    if (!customer.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allTransactions = await db.select().from(transactions).where(and(eq(transactions.customerId, Number(id)), eq(transactions.userId, session.userId))).orderBy(desc(transactions.createdAt));
    const allPayments = await db.select().from(payments).where(and(eq(payments.customerId, Number(id)), eq(payments.userId, session.userId))).orderBy(desc(payments.createdAt));

    const creditTotal = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.customerId, Number(id)), eq(transactions.userId, session.userId), eq(transactions.paymentMode, "credit")));
    const duesPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, Number(id)), eq(payments.userId, session.userId), eq(payments.type, "dues_payment")));
    const partialPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, Number(id)), eq(payments.userId, session.userId), eq(payments.type, "partial_payment")));
    const advanceTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, Number(id)), eq(payments.userId, session.userId), eq(payments.type, "advance")));

    const totalCredit = parseFloat((creditTotal[0]?.total || 0).toString());
    const totalDuesPaid = parseFloat(((duesPaidTotal[0]?.total || 0).toString()));
    const totalPartialPaid = parseFloat(((partialPaidTotal[0]?.total || 0).toString()));
    const totalAdvance = parseFloat(((advanceTotal[0]?.total || 0).toString()));

    const totalBilled = totalCredit;
    const totalJama = totalDuesPaid + totalPartialPaid;
    const rawDues = totalBilled - totalJama;
    const overpaymentCredit = Math.max(0, totalJama - totalBilled);
    const pendingDues = Math.max(0, rawDues);
    const effectiveAdvance = totalAdvance + overpaymentCredit;
    const netBalance = totalBilled - totalJama - totalAdvance;

    return NextResponse.json({ customer: customer[0], transactions: allTransactions, payments: allPayments, summary: { totalBilled, totalJama, pendingDues, totalAdvance: effectiveAdvance, netBalance } });
  }

  const allCustomers = await db.select().from(customers).where(eq(customers.userId, session.userId)).orderBy(desc(customers.createdAt));
  const result = await Promise.all(allCustomers.map(async (c) => {
    const creditTotal = await db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.customerId, c.id), eq(transactions.userId, session.userId), eq(transactions.paymentMode, "credit")));
    const duesPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, c.id), eq(payments.userId, session.userId), eq(payments.type, "dues_payment")));
    const partialPaidTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, c.id), eq(payments.userId, session.userId), eq(payments.type, "partial_payment")));
    const advanceTotal = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.customerId, c.id), eq(payments.userId, session.userId), eq(payments.type, "advance")));
    const totalCredit = parseFloat((creditTotal[0]?.total || 0).toString());
    const totalPaid = parseFloat(((duesPaidTotal[0]?.total || 0).toString()));
    const totalPartial = parseFloat(((partialPaidTotal[0]?.total || 0).toString()));
    const totalAdv = parseFloat(((advanceTotal[0]?.total || 0).toString()));
    const overPayment = Math.max(0, totalPaid + totalPartial - totalCredit);
    const pending = Math.max(0, totalCredit - totalPaid - totalPartial);
    return { ...c, dues: pending, advance: totalAdv + overPayment, totalCredit };
  }));
  result.sort((a, b) => b.dues - a.dues);
  return NextResponse.json(result);
}

export async function PUT(req: Request) {
  const session = await checkAuth();
  const body = await req.json();
  const { id, ...data } = body;
  await db.update(customers).set(data).where(and(eq(customers.id, id), eq(customers.userId, session.userId)));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await checkAuth();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await db.delete(customers).where(and(eq(customers.id, Number(id)), eq(customers.userId, session.userId)));
  return NextResponse.json({ success: true });
}
