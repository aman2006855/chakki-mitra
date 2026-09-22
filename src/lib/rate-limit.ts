import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq, lt } from "drizzle-orm";

// DB-backed fixed-window rate limiter.
// In-memory nahi use kiya kyunki Vercel serverless me har instance
// ka apna memory hota hai — DB sab instances me shared hai.

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = new Date();
  try {
    const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
    if (!row) {
      await db.insert(rateLimits).values({ key, count: 1, windowStart: now });
      return { allowed: true, retryAfterSec: 0 };
    }
    const elapsed = (now.getTime() - new Date(row.windowStart).getTime()) / 1000;
    if (elapsed >= windowSec) {
      await db.update(rateLimits).set({ count: 1, windowStart: now }).where(eq(rateLimits.key, key));
      return { allowed: true, retryAfterSec: 0 };
    }
    if ((row.count || 0) >= max) {
      return { allowed: false, retryAfterSec: Math.ceil(windowSec - elapsed) };
    }
    await db
      .update(rateLimits)
      .set({ count: (row.count || 0) + 1 })
      .where(eq(rateLimits.key, key));
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    // DB fail ho to request block mat karo (fail-open) — availability first
    return { allowed: true, retryAfterSec: 0 };
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimits).where(eq(rateLimits.key, key));
  } catch {}
}

// Purane expired windows saaf karo (cron ya OTP send par call karo)
export async function cleanupRateLimits(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, cutoff));
  } catch {}
}
