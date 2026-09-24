import type { NextResponse } from "next/server";
import { isAdminRequest } from "./auth";
import { err } from "./cors";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// Run once per serverless instance — missing columns/tables self-heal
let schemaReady: Promise<void> | null = null;

function isMissingRelation(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e || "");
  return (
    msg.includes("does not exist") ||
    msg.includes("Undefined column") ||
    msg.includes("Undefined table") ||
    (msg.includes("relation") && msg.includes("does not exist"))
  );
}

export function schemaErrorNote(e: unknown): string {
  if (isMissingRelation(e)) {
    return "Database schema incomplete (missing table/column). Deploy db:push or run ensure schema.";
  }
  return "Internal Server Error";
}

async function runEnsureSchema(): Promise<void> {
  const statements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason text DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_credits integer DEFAULT 50`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code varchar(40)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by varchar(40)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_registered boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name varchar(200)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_phone varchar(20)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS atta_rate numeric`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS dalia_rate numeric`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users(referral_code)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY,
      actor varchar(100) NOT NULL DEFAULT 'admin',
      role varchar(40) NOT NULL DEFAULT 'super_admin',
      action varchar(100) NOT NULL,
      target_type varchar(40),
      target_id varchar(60),
      reason text DEFAULT '',
      outcome varchar(40) NOT NULL DEFAULT 'success',
      detail text DEFAULT '',
      created_at timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS plans (
      id serial PRIMARY KEY,
      name varchar(100) NOT NULL,
      description text DEFAULT '',
      price_inr integer NOT NULL,
      duration_days integer NOT NULL,
      sms_quota integer DEFAULT 0,
      active boolean DEFAULT true,
      features text DEFAULT '{}',
      created_at timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id serial PRIMARY KEY,
      user_id integer,
      subject varchar(300) NOT NULL,
      category varchar(40) DEFAULT 'other',
      status varchar(30) DEFAULT 'new',
      priority varchar(20) DEFAULT 'medium',
      message text DEFAULT '',
      admin_reply text DEFAULT '',
      resolution_note text DEFAULT '',
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      key varchar(300) PRIMARY KEY,
      count integer NOT NULL DEFAULT 1,
      window_start timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id integer REFERENCES plans(id),
      status varchar(30) DEFAULT 'pending',
      price_paid integer DEFAULT 0,
      start_at timestamp,
      end_at timestamp,
      created_at timestamp DEFAULT now()
    )`,
  ];
  // Independent statements — ek fail hone par baaki chalte rahe
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (e) {
      // Duplicate index / already-applied DDL ignore; real errors surface via missing-relation checks
      const msg = e instanceof Error ? e.message : String(e || "");
      if (msg.includes("already exists") || msg.includes("duplicate")) continue;
      console.error("[admin_schema_stmt_error]", msg.slice(0, 200));
    }
  }
}

export function ensureAdminSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runEnsureSchema().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

// Har admin data route isse wrap kare — shop token se access blocked
export async function requireAdmin(request: Request): Promise<true | NextResponse> {
  try {
    if (!isAdminRequest(request)) return err("forbidden", 403);
  } catch {
    return err("forbidden", 403);
  }
  try {
    await ensureAdminSchema();
    return true;
  } catch (e) {
    console.error("[admin_schema_error]", e);
    return err(schemaErrorNote(e), 500);
  }
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
    await ensureAdminSchema();
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
