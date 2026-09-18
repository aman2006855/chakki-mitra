import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) throw new Error("unauthorized");
  return JSON.parse(sessionCookie.value);
}

export async function GET() {
  const session = await getSession();
  const data = await db.select().from(transactions).where(eq(transactions.userId, session.userId)).orderBy(desc(transactions.createdAt)).limit(100);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const row = await db.insert(transactions).values({ ...body, userId: session.userId }).returning();
  return NextResponse.json(row[0]);
}
