import { db } from "@/db";
import { users } from "@/db/schema";
import { sql, count } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, maskEmail, schemaErrorNote } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET — referral leaderboard + mapping stats
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth !== true) return auth;

  try {
    // Leaderboard: referrer kitne logon ko laaye (users.referred_by = referrer.user_id as string)
    const leaderboard = await db.execute(sql`
      SELECT
        r.id,
        r.name,
        r.shop_name,
        r.email,
        r.referral_code,
        COUNT(u.id)::int AS referrals,
        COALESCE(SUM(CASE WHEN r.sms_credits IS NOT NULL THEN 0 ELSE 0 END), 0) AS bonus_placeholder
      FROM users r
      LEFT JOIN users u ON u.referred_by = r.id::text
      WHERE r.referral_code IS NOT NULL
      GROUP BY r.id, r.name, r.shop_name, r.email, r.referral_code
      ORDER BY referrals DESC, r.id DESC
      LIMIT 50
    `);

    const rows = ((leaderboard as any).rows || leaderboard || []) as any[];

    const [totalWithCode] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.referralCode} IS NOT NULL`);

    const [totalReferred] = await db
      .select({ n: count() })
      .from(users)
      .where(sql`${users.referredBy} IS NOT NULL`);

    // Referred accounts (mapping)
    const referredList = await db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.shop_name,
        u.email,
        u.referred_by,
        u.sms_credits,
        u.created_at,
        r.name AS referrer_name,
        r.referral_code AS referrer_code
      FROM users u
      LEFT JOIN users r ON r.id::text = u.referred_by
      WHERE u.referred_by IS NOT NULL
      ORDER BY u.created_at DESC
      LIMIT 100
    `);
    const referredRows = ((referredList as any).rows || referredList || []) as any[];

    return ok({
      leaderboard: rows.map((r) => ({
        id: r.id,
        name: r.name || "",
        shopName: r.shop_name || "",
        emailMasked: maskEmail(r.email),
        referralCode: r.referral_code || "",
        referrals: Number(r.referrals || 0),
      })),
      stats: {
        codesIssued: Number(totalWithCode?.n || 0),
        successfulReferrals: Number(totalReferred?.n || 0),
        // +20 bonus → approximately 20 per successful referral (both sides)
        estimatedBonusCredits: Number(totalReferred?.n || 0) * 20,
      },
      recent: referredRows.map((r) => ({
        id: r.id,
        name: r.name || "",
        shopName: r.shop_name || "",
        emailMasked: maskEmail(r.email),
        smsCredits: r.sms_credits,
        referrerName: r.referrer_name || "",
        referrerCode: r.referrer_code || "",
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error("[admin_referrals_error]", e);
    return err(schemaErrorNote(e), 500);
  }
}
