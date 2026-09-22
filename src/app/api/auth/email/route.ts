import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import { hashPassword, verifyPassword, isHashed } from "@/lib/password";
import { ok, err, options } from "@/lib/cors";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const { email, password, action } = await req.json();
    if (!email || !password || !action) {
      return err("Email, password and action are required", 400);
    }

    // Brute-force protection: max 10 login/signup attempts per IP per minute
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(`auth:${action}:${ip}`, 10, 60);
    if (!ipLimit.allowed) {
      return err(`Bahut requests. ${ipLimit.retryAfterSec} second baad try karo.`, 429);
    }

    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (action === "login") {
      if (!user) {
        return err("यह अकाउंट मौजूद नहीं है। कृपया नया अकाउंट बनाएं।", 404);
      }
      if (!verifyPassword(password, user.password || "")) {
        // Galat password: 5 fails per 15 min → temporary lockout
        const failLimit = await checkRateLimit(`loginfail:${email.toLowerCase()}`, 5, 900);
        if (!failLimit.allowed) {
          return err(`Galat password bahut baar. ${Math.ceil(failLimit.retryAfterSec / 60)} min baad try karo ya Forgot Password use karo.`, 429);
        }
        return err("पासवर्ड गलत है।", 401);
      }
      // Success → fail counter reset
      await resetRateLimit(`loginfail:${email.toLowerCase()}`);
      if (!isHashed(user.password || "")) {
        try {
          await db.update(users).set({ password: hashPassword(password) }).where(eq(users.id, user.id));
        } catch {}
      }
    } else if (action === "signup") {
      if (user) {
        return err("यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।", 409);
      }
      // OTP already verified by /api/auth/otp/verify before this call
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
