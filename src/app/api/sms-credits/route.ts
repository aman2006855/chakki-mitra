import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

function makeReferralCode(email: string): string {
  const base =
    (email.split("@")[0] || "CHAKKI")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "CHAKKI";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        smsCredits: users.smsCredits,
        referralCode: users.referralCode,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return err("not found", 404);

    let referralCode = user.referralCode;
    if (!referralCode) {
      const code = makeReferralCode(user.email);
      try {
        await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
        referralCode = code;
      } catch {
        // unique collision — rare, ignore (next request retry karega)
      }
    }

    return ok({
      smsCredits: user.smsCredits ?? 50,
      referralCode: referralCode || "",
    });
  } catch (e) {
    console.error("[sms_credits_error]", e);
    return err("Internal Server Error", 500);
  }
}
