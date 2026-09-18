import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, password, action } = await req.json();
    if (!email || !password || !action) {
      return NextResponse.json({ error: "Email, password and action are required" }, { status: 400 });
    }

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (action === "login") {
      if (!user) {
        return NextResponse.json({ error: "यह अकाउंट मौजूद नहीं है। कृपया नया अकाउंट बनाएं।" }, { status: 404 });
      }
      if (user.password !== password) {
        return NextResponse.json({ error: "पासवर्ड गलत है।" }, { status: 401 });
      }
    } else if (action === "signup") {
      if (user) {
        return NextResponse.json({ error: "यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।" }, { status: 409 });
      }
      [user] = await db.insert(users).values({
        email,
        password,
      }).returning();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
