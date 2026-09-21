import crypto from "crypto";

// scrypt password hashing (Node built-in, no extra dep).
// Format: scrypt$<salt-hex>$<hash-hex>
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function isHashed(stored: string): boolean {
  return stored.startsWith("scrypt$");
}

// Legacy plaintext passwords (old accounts) bhi verify hote hain —
// successful login par caller transparently re-hash karke save kare.
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (!isHashed(stored)) return stored === password;
  const parts = stored.split("$");
  if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
  const derived = crypto.scryptSync(password, parts[1], 64);
  const expected = Buffer.from(parts[2], "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
