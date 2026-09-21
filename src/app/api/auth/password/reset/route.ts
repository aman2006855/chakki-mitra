import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { getVerifiedEmail } from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/password";

export function OPTIONS() {
  return options();
}

// POST { supabaseToken, newPassword } → Supabase-verified email ka password reset
export async function POST(req: Request) {
  try {
    const { supabaseToken, newPassword } = await req.json();
    if (!supabaseToken || !newPassword) return err("Verification aur naya password chahiye.", 400);
    if (newPassword.length < 6) return err("Password kam se kam 6 character ka ho.", 400);

    const email = await getVerifiedEmail(supabaseToken);
    if (!email) return err("Email verified nahi hai. OTP dobara verify karo.", 401);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return err("यह अकाउंट मौजूद नहीं है।", 404);

    await db.update(users).set({ password: hashPassword(newPassword) }).where(eq(users.id, user.id));
    return ok({ success: true });
  } catch (e) {
    console.error("[password_reset_error]", e);
    return err("Internal Server Error", 500);
  }
}
