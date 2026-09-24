import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

// Atomic decrement: ek saath check + cut (race-safe)
// Agar credit 0 ya usse kam hua to kuch nahi hota (0 rows) → 402
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);

  try {
    const updated = await db
      .update(users)
      .set({ smsCredits: sql`coalesce(${users.smsCredits}, 0) - 1` })
      .where(and(eq(users.id, userId), sql`coalesce(${users.smsCredits}, 0) > 0`))
      .returning({ smsCredits: users.smsCredits });

    if (!updated.length) {
      return err("SMS credits khatam ho gaye hain", 402);
    }

    return ok({ success: true, smsCredits: updated[0].smsCredits ?? 0 });
  } catch (e) {
    console.error("[sms_consume_error]", e);
    return err("Internal Server Error", 500);
  }
}
