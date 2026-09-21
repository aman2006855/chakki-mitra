import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client — sirf OTP bhejne/verify karne ke liye.
// Session hamari custom JWT wali hi rehti hai (Supabase session use nahi hota).
let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) throw new Error("Supabase configured nahi hai.");
  cached = createClient(url, anon);
  return cached;
}

export function friendlySupabaseError(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("rate limit") || m.includes("too many") || m.includes("429") || m.includes("email rate")) {
    return "Bahut requests. Thodi der baad try karo.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("token") || m.includes("otp")) {
    return "OTP galat ya expire ho gaya. Naya bhejo.";
  }
  return msg || "Supabase error. Dobara try karo.";
}
