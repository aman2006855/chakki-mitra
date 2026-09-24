import { ok, err, options } from "@/lib/cors";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/rate-limit";
import { signAdminToken } from "@/lib/auth";
import { writeAudit, schemaErrorNote } from "@/lib/admin-auth";
import crypto from "crypto";

export function OPTIONS() {
  return options();
}

// Timing-safe string compare (backdoor-proof password check)
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Admin login — sirf URL se (/authorize-access-admin). Koi default password nahi,
// koi hardcoded secret nahi. ADMIN_PASSWORD env set hona chahiye (Vercel me).
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    // 5 failed attempts per 15 min per IP
    const limit = await checkRateLimit(`adminlogin:${ip}`, 5, 900);
    if (!limit.allowed) {
      return err(`Bahut attempts. ${Math.ceil(limit.retryAfterSec / 60)} min baad try karo.`, 429);
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return err("Admin access is not configured on this server.", 503);
    }

    const { password } = await req.json().catch(() => ({ password: "" }));
    if (!password || typeof password !== "string") {
      return err("Password required", 400);
    }

    if (!safeEqual(password, adminPassword)) {
      await writeAudit({
        action: "admin.login_failed",
        outcome: "failure",
        reason: "invalid password",
        detail: `ip=${ip}`,
      });
      return err("Galat password", 401);
    }

    // Success par lockout counter reset
    await resetRateLimit(`adminlogin:${ip}`);
    await writeAudit({
      action: "admin.login",
      outcome: "success",
      detail: `ip=${ip}`,
    });
    const token = signAdminToken();
    return ok({ token, role: "admin" });
  } catch (e) {
    // Server-side log only (browser devtools me kabhi nahi dikhta)
    console.error("[admin_auth_error]", e);
    return err(schemaErrorNote(e), 500);
  }
}
