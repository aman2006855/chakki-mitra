import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
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

  const dailyData = await db.execute(sql`
    SELECT
      DATE(created_at) as day,
      SUM(CASE WHEN product_type = 'atta' THEN amount ELSE 0 END) as atta_amount,
      SUM(CASE WHEN product_type = 'dalia' THEN amount ELSE 0 END) as dalia_amount,
      SUM(amount) as total_amount,
      SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END) as cash_amount,
      SUM(CASE WHEN payment_mode = 'credit' THEN amount ELSE 0 END) as credit_amount,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE user_id = ${userId}
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 14
  `);

  return NextResponse.json({
    dailyData: ((dailyData as any).rows || []).map((r: any) => ({
      day: r.day,
      atta: parseFloat(r.atta_amount?.toString() || "0"),
      dalia: parseFloat(r.dalia_amount?.toString() || "0"),
      total: parseFloat(r.total_amount?.toString() || "0"),
      cash: parseFloat(r.cash_amount?.toString() || "0"),
      credit: parseFloat(r.credit_amount?.toString() || "0"),
      count: Number(r.transaction_count || 0),
    })),
  });
}
