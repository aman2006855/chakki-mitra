import { db } from "@/db";
import { emailOtps } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";

export function OPTIONS() {
  return options();
}

export async function POST(req: Request) {
  try {
    const { email, code, purpose } = await req.json();

    if (!email || !code || !purpose) {
      return err("email, code, and purpose are required", 400);
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return err("6-digit OTP dalo", 400);
    }

    // OTP guessing protection: max 10 verify attempts per email per 10 min
    const vLimit = await checkRateLimit(`otpverify:${email.toLowerCase()}:${purpose}`, 10, 600);
    if (!vLimit.allowed) {
      return err(`Bahut attempts. ${Math.ceil(vLimit.retryAfterSec / 60)} min baad naya OTP bhejo.`, 429);
    }

    // Hash the submitted OTP
    const codeHash = createHash("sha256").update(code).digest("hex");

    // Find matching OTP record
    const [record] = await db
      .select()
      .from(emailOtps)
      .where(
        and(
          eq(emailOtps.email, email.toLowerCase()),
          eq(emailOtps.codeHash, codeHash),
          eq(emailOtps.purpose, purpose),
          eq(emailOtps.used, false),
          gte(emailOtps.expiresAt, new Date())
        )
      )
      .orderBy(emailOtps.createdAt)
      .limit(1);

    if (!record) {
      // Check if expired OTP exists
      const [expired] = await db
        .select()
        .from(emailOtps)
        .where(
          and(
            eq(emailOtps.email, email.toLowerCase()),
            eq(emailOtps.purpose, purpose),
            eq(emailOtps.used, false)
          )
        )
        .orderBy(emailOtps.createdAt)
        .limit(1);

      if (expired) {
        return err("OTP expire ho gaya. Naya OTP bhejo.", 400);
      }

      return err("OTP galat hai. Dobara check karo.", 400);
    }

    // Check attempt limit
    if ((record.attempts || 0) >= 5) {
      return err("Bahut zyada galat attempts. Naya OTP bhejo.", 429);
    }

    // Mark as used + reset guess counter on success
    await db
      .update(emailOtps)
      .set({ used: true })
      .where(eq(emailOtps.id, record.id));
    await resetRateLimit(`otpverify:${email.toLowerCase()}:${purpose}`);

    return ok({ success: true, email: email.toLowerCase() });
  } catch (e) {
    console.error("[otp_verify_error]", e);
    return err("Internal Server Error", 500);
  }
}
