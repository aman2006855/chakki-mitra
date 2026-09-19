import { db } from "@/db";
import { transactions, payments } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return err("Customer ID required", 400);

  const customerId = Number(id);

  const allTransactions = await db.select().from(transactions).where(and(eq(transactions.customerId, customerId), eq(transactions.userId, userId), eq(transactions.paymentMode, "credit"))).orderBy(asc(transactions.createdAt));
  const allPayments = await db.select().from(payments).where(and(eq(payments.customerId, customerId), eq(payments.userId, userId))).orderBy(asc(payments.createdAt));

  interface Event { type: "transaction" | "payment"; ts: number; amount: number; paymentType?: string; description?: string }
  const events: Event[] = [];
  for (const t of allTransactions) {
    events.push({ type: "transaction", ts: t.createdAt ? new Date(t.createdAt as Date).getTime() : 0, amount: parseFloat(t.amount) });
  }
  for (const p of allPayments) {
    events.push({ type: "payment", ts: p.createdAt ? new Date(p.createdAt as Date).getTime() : 0, amount: parseFloat(p.amount), paymentType: p.type, description: p.description || "" });
  }
  events.sort((a, b) => a.ts - b.ts);

  const bills: any[] = [];
  let runningBalance = 0;

  for (let i = 0; i < allTransactions.length; i++) {
    const txn = allTransactions[i];
    const prevBalance = runningBalance;
    const txnTime = txn.createdAt ? new Date(txn.createdAt as Date).getTime() : 0;
    const nextTxnTime = i + 1 < allTransactions.length ? (allTransactions[i + 1].createdAt ? new Date(allTransactions[i + 1].createdAt as Date).getTime() : Infinity) : Infinity;

    let advanceApplied = 0;
    if (prevBalance < 0) advanceApplied = Math.min(Math.abs(prevBalance), parseFloat(txn.amount));

    const paymentDetails: { amount: number; type: string; desc: string; ts: string }[] = [];
    let totalPayments = 0;
    for (const evt of events) {
      if (evt.type !== "payment") continue;
      if (evt.ts >= txnTime && evt.ts < nextTxnTime) {
        paymentDetails.push({ amount: evt.amount, type: evt.paymentType || "", desc: evt.description || "", ts: new Date(evt.ts).toISOString() });
        totalPayments += evt.amount;
      }
    }

    const billAmount = parseFloat(txn.amount);
    const netBill = Math.max(0, billAmount - advanceApplied);
    const remainingAfterPayments = netBill - totalPayments;
    const newBalance = prevBalance + billAmount - totalPayments;
    let status: "settled" | "dues" | "credit";
    if (Math.abs(newBalance) < 0.01) status = "settled";
    else if (newBalance > 0) status = "dues";
    else status = "credit";

    bills.push({
      transactionId: txn.id, createdAt: txn.createdAt?.toISOString() || "", productType: txn.productType,
      weight: parseFloat(txn.weight), rate: parseFloat(txn.rate), billAmount,
      previousBalance: prevBalance, previousDues: Math.max(0, prevBalance), previousAdvance: Math.max(0, Math.abs(prevBalance)),
      advanceApplied, paymentsReceived: totalPayments, paymentDetails, netBill, remainingAfterPayments, newBalance, status,
    });
    runningBalance = newBalance;
  }

  bills.reverse();
  return ok({ bills, finalBalance: runningBalance });
}
