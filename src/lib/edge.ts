const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function getEdgeUrl(functionName: string): string {
  if (!SUPABASE_URL) throw new Error("Supabase URL not configured");
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}

export function getEdgeHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

export async function sendOTP(
  email: string,
  purpose: "signup" | "password_reset" | "email_change"
): Promise<void> {
  const res = await fetch(getEdgeUrl("send-otp"), {
    method: "POST",
    headers: getEdgeHeaders(),
    body: JSON.stringify({ email, purpose }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "OTP nahi bheja gaya");
}
