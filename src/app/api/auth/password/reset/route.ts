import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { consumeOtp } from "@/lib/otp";
import { hashPassword } from "@/lib/password";

export function OPTIONS() {
  return options();
}

// POST { email, code, newPassword } → OTP verify + password reset (single call)
export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) return err("Email, OTP aur naya password chahiye.", 400);
    if (newPassword.length < 6) return err("Password kam se kam 6 character ka ho.", 400);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return err("यह अकाउंट मौजूद नहीं है।", 404);

    const v = await consumeOtp(email, String(code), "reset");
    if (!v.ok) return err(v.error || "OTP verification failed.", 400);

    await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, user.id));
    return ok({ success: true });
  } catch (e) {
    console.error("[password_reset_error]", e);
    return err("Internal Server Error", 500);
  }
}
