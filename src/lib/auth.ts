import crypto from "crypto";

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  // Dev fallback only — production me JWT_SECRET mandatory hai (backdoor nahi)
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET not configured");
  }
  return "chakki-mitra-jwt-secret-2026";
}

export function signToken(payload: { userId: number; name: string }): string {
  const secret = getSecret();
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { userId: number; name: string } | null {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!data.userId) return null;
    return { userId: data.userId, name: data.name || "" };
  } catch {
    return null;
  }
}

// Async: JWT verify + suspended account block (session revoke effect)
export async function getUserIdFromRequest(request: Request): Promise<number | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const session = verifyToken(token);
  if (!session) return null;
  // Lazy import se circular-dependency risk avoid
  const { isUserActive } = await import("./admin-auth");
  const active = await isUserActive(session.userId);
  if (!active) return null;
  return session.userId;
}

export async function getSessionFromRequest(request: Request): Promise<{ userId: number; name: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const session = verifyToken(token);
  if (!session) return null;
  const { isUserActive } = await import("./admin-auth");
  const active = await isUserActive(session.userId);
  if (!active) return null;
  return session;
}

// ---- Admin token (separate from shop tokens — role claim ke saath) ----

export function signAdminToken(): string {
  const secret = getSecret();
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ role: "admin", iat: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return false;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.role === "admin";
  } catch {
    return false;
  }
}

export function isAdminRequest(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return verifyAdminToken(authHeader.slice(7));
}
