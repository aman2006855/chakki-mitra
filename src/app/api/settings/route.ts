import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

async function getSessionUserId() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) return null;
  try {
    const session = JSON.parse(sessionCookie.value);
    return session.userId;
  } catch {
    return null;
  }
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    shopName: user[0].shopName || "श्री श्याम आटा चक्की",
    shopPhone: user[0].shopPhone || "",
    attaRate: user[0].attaRate || "5",
    daliaRate: user[0].daliaRate || "8",
    isRegistered: user[0].isRegistered ?? false,
  });
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  await db.update(users).set(body).where(eq(users.id, userId));
  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  await db.update(users).set(body).where(eq(users.id, userId));
  return NextResponse.json({ success: true });
}
