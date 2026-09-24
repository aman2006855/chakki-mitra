import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { desc, count } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, writeAudit } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

function maskKey(key: string): string {
  // loginfail:email@x.com → loginfail:e***@x.com
  if (key.startsWith("loginfail:")) {
    const email = key.slice("loginfail:".length);
    const [local, domain] = email.split("@");
    if (!domain) return "loginfail:****";
    const keep = Math.min(1, local.length);
    return `loginfail:${local.slice(0, keep)}***@${domain}`;
  }
  if (key.startsWith("adminlogin:")) {
    return `adminlogin:${key.slice("adminlogin:".length).replace(/(.{4}).+/, "$1****")}`;
  }
  return key.length > 40 ? `${key.slice(0, 32)}…` : key;
}

// GET — live rate_limits (lockouts + throttles)
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const rows = await db
      .select()
      .from(rateLimits)
      .orderBy(desc(rateLimits.count), desc(rateLimits.windowStart))
      .limit(200);

    const [totalRow] = await db.select({ n: count() }).from(rateLimits);

    const lockouts = rows.filter((r) => r.key.startsWith("loginfail:"));
    const adminFails = rows.filter((r) => r.key.startsWith("adminlogin:"));
    const otpLimits = rows.filter((r) => r.key.startsWith("otpverify:"));
    const authLimits = rows.filter((r) => r.key.startsWith("auth:"));

    return ok({
      items: rows.map((r) => ({
        keyMasked: maskKey(r.key),
        keyPrefix: r.key.split(":")[0] || r.key,
        count: r.count || 0,
        windowStart: r.windowStart,
      })),
      summary: {
        totalKeys: Number(totalRow?.n || 0),
        loginLockouts: lockouts.length,
        adminLoginFails: adminFails.length,
        otpAbuse: otpLimits.length,
        authThrottle: authLimits.length,
      },
      appendOnly: false,
      note: "Keys cleanup hoti hain (24h). History retention alag policy chahiye.",
    });
  } catch (e) {
    console.error("[admin_security_error]", e);
    return err("Internal Server Error", 500);
  }
}

// DELETE — manual unlock { key } (reason required)
export async function DELETE(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || "").trim();
    const reason = String(body.reason || "").trim();
    if (!key) return err("key required", 400);
    if (reason.length < 3) return err("Reason required", 400);

    // Only unlock known safe prefixes — never raw SQL injection surface
    const prefixes = ["loginfail:", "adminlogin:", "otpverify:", "auth:"];
    if (!prefixes.some((p) => key.startsWith(p))) {
      return err("Cannot unlock this key type", 400);
    }

    // We store masked keys in GET; unlock needs original — client must pass full key from a dedicated field
    // For safety we accept unlockKey separately if provided
    const unlockKey = String(body.unlockKey || key);
    const { eq } = await import("drizzle-orm");
    const deleted = await db.delete(rateLimits).where(eq(rateLimits.key, unlockKey)).returning();

    await writeAudit({
      action: "security.unlock",
      targetType: "rate_limit",
      targetId: maskKey(unlockKey),
      reason,
      outcome: deleted.length ? "success" : "not_found",
    });

    return ok({ success: deleted.length > 0, unlocked: deleted.length });
  } catch (e) {
    console.error("[admin_unlock_error]", e);
    return err("Internal Server Error", 500);
  }
}
