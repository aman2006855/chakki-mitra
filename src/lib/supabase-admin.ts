import { createClient } from "@supabase/supabase-js";

// Server-only: Supabase access token verify karke verified email nikalta hai.
// Service role key kabhi client me mat bhejo (NEXT_PUBLIC_ prefix nahi).
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Supabase server configured nahi hai.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getVerifiedEmail(accessToken: string): Promise<string | null> {
  try {
    if (!accessToken) return null;
    const { data, error } = await admin().auth.getUser(accessToken);
    if (error || !data?.user?.email) return null;
    return data.user.email.toLowerCase();
  } catch {
    return null;
  }
}
