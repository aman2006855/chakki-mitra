import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signToken } from "@/lib/auth";

export async function POST() {
  const [user] = await db.insert(users).values({ email: `guest-${Date.now()}@local`, name: "गेस्ट यूज़र" }).returning();
  const token = signToken({ userId: user.id, name: user.name || "" });
  return NextResponse.json({
    token,
    userId: user.id,
    name: user.name,
  });
}
