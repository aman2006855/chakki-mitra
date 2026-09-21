import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import { hashPassword, verifyPassword, isHashed } from "@/lib/password";
import { consumeOtp } from "@/lib/otp";
import { ok, err, options } from "@/lib/cors";

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const { email, password, action, otp } = await req.json();
    if (!email || !password || !action) {
      return err("Email, password and action are required", 400);
    }

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (action === "login") {
      if (!user) {
        return err("यह अकाउंट मौजूद नहीं है। कृपया नया अकाउंट बनाएं।", 404);
      }
      if (!verifyPassword(password, user.password || "")) {
        return err("पासवर्ड गलत है।", 401);
      }
      // Purane plaintext password ko transparently hash me migrate karo
      if (!isHashed(user.password || "")) {
        try {
          await db.update(users).set({ password: hashPassword(password) }).where(eq(users.id, user.id));
        } catch {}
      }
    } else if (action === "signup") {
      if (user) {
        return err("यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।", 409);
      }
      // Signup ke liye verified OTP zaroori (Brevo se bheja gaya)
      if (!otp) {
        return err("Email verification ke liye OTP chahiye.", 400);
      }
      const v = await consumeOtp(email, String(otp), "signup");
      if (!v.ok) {
        return err(v.error || "OTP verification failed.", 400);
      }
      [user] = await db.insert(users).values({
        email,
        password: hashPassword(password),
      }).returning();
    } else {
      return err("Invalid action", 400);
    }

    const token = signToken({ userId: user.id, name: user.name || "" });

    return ok({
      token,
      userId: user.id,
      name: user.name || "",
      isRegistered: user.isRegistered,
    });
  } catch (error) {
    console.error("[email_auth_error]", error);
    return err("Internal Server Error", 500);
  }
}
