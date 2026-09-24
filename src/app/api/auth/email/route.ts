import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { signToken } from "@/lib/auth";
import { hashPassword, verifyPassword, isHashed } from "@/lib/password";
import { ok, err, options } from "@/lib/cors";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

function makeReferralCode(email: string): string {
  const base =
    (email.split("@")[0] || "CHAKKI")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "CHAKKI";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export async function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const { email, password, action, referralCode } = await req.json();
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
      if ((user.status || "active") === "suspended") {
        return err("यह अकाउंट निलंबित है। सहायता से संपर्क करें।", 403);
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
      try {
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      } catch {}
      if (!isHashed(user.password || "")) {
        try {
          await db.update(users).set({ password: hashPassword(password) }).where(eq(users.id, user.id));
        } catch {}
      }
    } else if (action === "signup") {
      if (user) {
        return err("यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।", 409);
      }

      // Referral: valid code mila to dono ko +20 tokens
      let referrerId: number | null = null;
      if (typeof referralCode === "string" && referralCode.trim()) {
        const code = referralCode.trim().toUpperCase();
        const [ref] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.referralCode, code))
          .limit(1);
        if (ref) referrerId = ref.id;
      }

      // OTP already verified by /api/auth/otp/verify before this call
      [user] = await db
        .insert(users)
        .values({
          email,
          password: hashPassword(password),
          smsCredits: referrerId ? 70 : 50, // base 50 + referral bonus 20
          referralCode: makeReferralCode(email),
          referredBy: referrerId ? String(referrerId) : null,
        })
        .returning();

      if (referrerId) {
        try {
          await db
            .update(users)
            .set({ smsCredits: sql`coalesce(${users.smsCredits}, 0) + 20` })
            .where(eq(users.id, referrerId));
          const { writeAudit, maskEmail } = await import("@/lib/admin-auth");
          await writeAudit({
            action: "referral.bonus",
            targetType: "user",
            targetId: String(referrerId),
            detail: `+20 to referrer, +20 to new ${maskEmail(email)} via code`,
          });
        } catch (e) {
          console.error("[referral_bonus_error]", e);
        }
      }
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
