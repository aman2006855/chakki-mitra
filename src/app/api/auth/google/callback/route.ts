import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(new URL("/login?error=auth", req.url));
    }

    // Get user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    // Find or create user
    let userRow = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUser.id))
      .limit(1);

    if (!userRow.length) {
      const [newUser] = await db
        .insert(users)
        .values({
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name || "",
        })
        .returning();
      userRow = [newUser];
    }

    const user = userRow[0];

    // Set session cookie
    const session = JSON.stringify({ userId: user.id, name: user.name });

    // Redirect based on registration status
    let redirectPath = "/";
    if (!user.isRegistered) {
      redirectPath = "/register";
    }

    const response = NextResponse.redirect(new URL(redirectPath, req.url));
    response.cookies.set("session", session, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(new URL("/login?error=auth", req.url));
  }
}
