import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";
import { consumeOtp } from "@/lib/otp";

export function OPTIONS() {
  return options();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { newEmail, code } → NAYI email par aaye OTP se email change (login zaroori)
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return err("unauthorized", 401);
    const { newEmail, code } = await req.json();
    if (!newEmail || !EMAIL_RE.test(newEmail)) return err("Sahi nayi email dalo.", 400);
    if (!code) return err("OTP dalo.", 400);

    // Nayi email kisi AUR user ki to nahi
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, newEmail), ne(users.id, userId)));
    if (taken) return err("यह ईमेल pehle se kisi aur account me hai.", 409);

    const v = await consumeOtp(newEmail, String(code), "change");
    if (!v.ok) return err(v.error || "OTP verification failed.", 400);

    await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
    return ok({ success: true, email: newEmail });
  } catch (e) {
    console.error("[email_change_error]", e);
    return err("Internal Server Error", 500);
  }
}
