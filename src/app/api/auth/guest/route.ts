import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST() {
  const [user] = await db.insert(users).values({ email: `guest-${Date.now()}@local`, name: "गेस्ट यूज़र" }).returning();
  console.log("[guest] created user:", user.id, user.name);
  // Return session data in JSON - client will set the cookie
  return NextResponse.json({
    userId: user.id,
    name: user.name,
  });
}
