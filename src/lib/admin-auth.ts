import { isAdminRequest } from "./auth";
import { err } from "./cors";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Har admin data route isse wrap kare — shop token se access blocked
export function requireAdmin(request: Request): true | NextResponse {
  if (!isAdminRequest(request)) return err("forbidden", 403);
  return true;
}

export async function writeAudit(entry: {
  action: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  outcome?: string;
  detail?: string;
  actor?: string;
  role?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actor: entry.actor || "admin",
      role: entry.role || "super_admin",
      action: entry.action,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      reason: entry.reason || "",
      outcome: entry.outcome || "success",
      detail: entry.detail || "",
    });
  } catch {
    // Audit fail se primary action block mat karo (availability)
  }
}

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  const s = String(p);
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

export function maskEmail(e: string | null | undefined): string {
  if (!e) return "";
  const [local, domain] = String(e).split("@");
  if (!domain) return "****";
  const keep = Math.min(2, local.length);
  return `${local.slice(0, keep)}***@${domain}`;
}

export function isGuestEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.endsWith("@local"));
}

// Suspended shop ka session/API block — JWT valid ho tab bhi
export async function isUserActive(userId: number): Promise<boolean> {
  try {
    const [row] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) return false;
    return (row.status || "active") !== "suspended";
  } catch {
    // DB fail → fail-open (availability), suspension check next call par
    return true;
  }
}
