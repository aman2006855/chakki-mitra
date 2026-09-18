import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user exists
    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Create new user
      [user] = await db.insert(users).values({
        email,
        password, // In a real app, hash this!
      }).returning();
    } else {
      // Verify password
      if (user.password !== password) {
         return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name || "",
      isRegistered: user.isRegistered,
    });
  } catch (error) {
    console.error("[email_auth_error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
