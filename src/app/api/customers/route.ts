import { NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { cookies } from "next/headers";

function getUserId() {
  const c = typeof document !== "undefined" ? null : null;
  return null;
}

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const session = JSON.parse(sessionCookie.value);
  const data = await db.select().from(customers).where(eq(customers.userId, session.userId)).orderBy(desc(customers.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const session = JSON.parse(sessionCookie.value);
  const body = await req.json();
  const [row] = await db.insert(customers).values({ ...body, userId: session.userId }).returning();
  return NextResponse.json(row);
}
