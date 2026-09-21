import crypto from "crypto";
import { db } from "@/db";
import { emailOtps } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendOtpEmail, type OtpPurpose } from "./brevo";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_SEND_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function createAndSendOtp(email: string, purpose: OtpPurpose): Promise<{ ok: boolean; error?: string }> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: emailOtps.id })
    .from(emailOtps)
    .where(and(eq(emailOtps.email, email), gt(emailOtps.createdAt, since)));
  if (recent.length >= MAX_SEND_PER_HOUR) {
    return { ok: false, error: "Bahut requests. 1 ghante baad try karein." };
  }
  const code = generateOtp();
  await db.insert(emailOtps).values({
    email,
    codeHash: hashOtp(code),
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    used: false,
  });
  const sent = await sendOtpEmail(email, code, purpose);
  if (!sent) return { ok: false, error: "Email nahi bheja gaya. Thodi der baad try karein." };
  return { ok: true };
}

// Valid OTP ko turant used mark karta hai (replay-proof).
export async function consumeOtp(email: string, code: string, purpose: OtpPurpose): Promise<{ ok: boolean; error?: string }> {
  const rows = await db
    .select()
    .from(emailOtps)
    .where(and(eq(emailOtps.email, email), eq(emailOtps.purpose, purpose), eq(emailOtps.used, false)))
    .orderBy(desc(emailOtps.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "OTP expired ya galat hai. Naya OTP bhejo." };
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "OTP expire ho gaya. Naya OTP bhejo." };
  }
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, error: "Bahut galat attempts. Naya OTP bhejo." };
  }
  if (hashOtp(code.trim()) !== row.codeHash) {
    await db.update(emailOtps).set({ attempts: (row.attempts ?? 0) + 1 }).where(eq(emailOtps.id, row.id));
    return { ok: false, error: "Galat OTP hai." };
  }
  await db.update(emailOtps).set({ used: true }).where(eq(emailOtps.id, row.id));
  return { ok: true };
}
