import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";
import { getVerifiedEmail } from "@/lib/supabase-admin";

export function OPTIONS() {
  return options();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { newEmail, supabaseToken } → Supabase-verified NAYI email par change (login zaroori)
export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return err("unauthorized", 401);
    const { newEmail, supabaseToken } = await req.json();
    if (!newEmail || !EMAIL_RE.test(newEmail)) return err("Sahi nayi email dalo.", 400);
    if (!supabaseToken) return err("OTP verify karo.", 400);

    // Nayi email kisi AUR user ki to nahi
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, newEmail), ne(users.id, userId)));
    if (taken) return err("यह ईमेल pehle se kisi aur account me hai.", 409);

    const verifiedEmail = await getVerifiedEmail(supabaseToken);
    if (!verifiedEmail || verifiedEmail !== newEmail.toLowerCase()) {
      return err("Email verified nahi hai. OTP dobara verify karo.", 400);
    }

    await db.update(users).set({ email: newEmail }).where(eq(users.id, userId));
    return ok({ success: true, email: newEmail });
  } catch (e) {
    console.error("[email_change_error]", e);
    return err("Internal Server Error", 500);
  }
}
