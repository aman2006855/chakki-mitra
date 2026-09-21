import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { createAndSendOtp } from "@/lib/otp";

export function OPTIONS() {
  return options();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { email, purpose: "signup" | "reset" } → Brevo se OTP bhejta hai
export async function POST(req: Request) {
  try {
    const { email, purpose } = await req.json();
    if (!email || !EMAIL_RE.test(email)) return err("Sahi email dalo.", 400);
    if (purpose !== "signup" && purpose !== "reset") return err("Invalid purpose", 400);

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (purpose === "signup" && existing) {
      return err("यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें।", 409);
    }
    if (purpose === "reset") {
      // Account enumerate na ho — hamesha success jaisa response
      if (existing) {
        const r = await createAndSendOtp(email, "reset");
        if (!r.ok) return err(r.error || "Email nahi bheja gaya.", 500);
      }
      return ok({ success: true });
    }
    const r = await createAndSendOtp(email, "signup");
    if (!r.ok) return err(r.error || "Email nahi bheja gaya.", 500);
    return ok({ success: true });
  } catch (e) {
    console.error("[otp_send_error]", e);
    return err("Internal Server Error", 500);
  }
}
