# READ-ONLY AUDIT — Edge Functions OTP Setup

> **Date:** September 10, 2026
> **Project:** RoomieKhata
> **Purpose:** Chakki Mitra me replicate karne ke liye full reference

---

## 1. EDGE FUNCTION: send-email-otp

### Endpoint URL
```
https://qfgwprqnakkaigwinvat.supabase.co/functions/v1/send-email-otp
```

### Request Body
```json
{
  "email": "user@gmail.com",
  "purpose": "signup | password_reset | re_verify | login",
  "metadata": {
    "username": "aman",
    "password": "123456",
    "user_id": "uuid-here"
  }
}
```
- `email` — REQUIRED
- `purpose` — REQUIRED (one of: `signup`, `password_reset`, `re_verify`, `login`)
- `metadata` — OPTIONAL (signup ke liye `username` + `password` zaroori, re_verify ke liye `user_id`)

### Response

**Success (200):**
```json
{ "success": true, "message": "OTP sent successfully" }
```

**Errors:**
```json
{ "error": "Only @gmail.com and @proton.me emails are allowed" }          // 400
{ "error": "email and purpose are required" }                             // 400
{ "error": "Invalid purpose" }                                            // 400
{ "error": "username and password are required for signup" }              // 400
{ "error": "No account found with this email. Please sign up first." }    // 404
{ "error": "Please verify your email first. Check your inbox for the OTP." } // 403
{ "error": "An account with this email already exists. Please login instead." } // 409
{ "error": "This username is already taken" }                             // 409
{ "error": "Too many OTP requests. Please wait 10 minutes before trying again." } // 429
{ "error": "You can re-verify once every 24 hours." }                     // 429
{ "error": "Failed to send OTP" }                                         // 500
```

### Full Source Code
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, purpose, metadata } = await req.json();

    if (!email || !purpose) {
      return new Response(
        JSON.stringify({ error: "email and purpose are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedEmailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|proton\.me)$/;
    if (!allowedEmailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Only @gmail.com and @proton.me emails are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["signup", "password_reset", "re_verify", "login"].includes(purpose)) {
      return new Response(
        JSON.stringify({ error: "Invalid purpose" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // === RE_VERIFY: 24hr cooldown check ===
    if (purpose === "re_verify") {
      const metadataAny = metadata as Record<string, unknown> | undefined;
      const userId = metadataAny?.user_id as string;
      if (userId) {
        const { data: canVerify } = await supabaseAdmin.rpc("can_request_verify", { p_user_id: userId });
        if (canVerify === false) {
          return new Response(
            JSON.stringify({ error: "You can re-verify once every 24 hours. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // === LOGIN: Check if email exists, send OTP ===
    if (purpose === "login") {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = authUsers?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!existingUser) {
        return new Response(
          JSON.stringify({ error: "No account found with this email. Please sign up first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!existingUser.email_confirmed_at) {
        return new Response(
          JSON.stringify({ error: "Please verify your email first. Check your inbox for the OTP." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // === SIGNUP: Create auth user FIRST, then send OTP ===
    if (purpose === "signup") {
      const metadataAny = metadata as Record<string, unknown> | undefined;
      const username = metadataAny?.username as string;
      const password = metadataAny?.password as string;

      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: "username and password are required for signup" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingAuthUser) {
        if (existingAuthUser.email_confirmed_at) {
          return new Response(
            JSON.stringify({ error: "An account with this email already exists. Please login instead." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await supabaseAdmin.from("profiles").delete().eq("id", existingAuthUser.id);
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
      }

      const { data: existingEmail } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      if (existingEmail) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();
      if (existingProfile) {
        return new Response(
          JSON.stringify({ error: "This username is already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { username, email },
      });

      if (createError) {
        if (createError.message?.includes("already registered")) {
          return new Response(
            JSON.stringify({ error: "An account with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (userData?.user?.id) {
        await supabaseAdmin.from("profiles").update({
          username,
          email,
        }).eq("id", userData.user.id);
      }
    }

    // === RATE LIMITING: max 3 OTPs per email per 10 minutes ===
    const { count } = await supabaseAdmin
      .from("otp_verifications")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait 10 minutes before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Send OTP via Supabase built-in email ===
    const { error: otpError } = await supabaseClient.auth.signInWithOtp({
      email,
    });

    if (otpError) {
      console.error("signInWithOtp error:", otpError);
      return new Response(
        JSON.stringify({ error: otpError.message || "Failed to send OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store tracking record for rate limiting
    await supabaseAdmin.from("otp_verifications").insert({
      email,
      otp_hash: "supabase_builtin",
      purpose,
      metadata: metadata || {},
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    // Clean up expired OTPs in background
    Promise.resolve(supabaseAdmin.rpc("cleanup_expired_otps")).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 2. EDGE FUNCTION: verify-email-otp

### Endpoint URL
```
https://qfgwprqnakkaigwinvat.supabase.co/functions/v1/verify-email-otp
```

### Request Body
```json
{
  "email": "user@gmail.com",
  "purpose": "signup | password_reset | re_verify | login",
  "auth_user_id": "uuid-from-verifyOtp-response"
}
```
- `email` — REQUIRED
- `purpose` — REQUIRED
- `auth_user_id` — OPTIONAL (agar nahi diya toh profiles table se lookup hota hai)

### Response

**Success (200):**
```json
{ "success": true, "user_id": "uuid", "email": "user@gmail.com" }
// ya
{ "success": true, "user_id": "uuid", "verified": true }
```

**Errors:**
```json
{ "error": "email and purpose are required" }        // 400
{ "error": "User not found" }                        // 404
```

### Full Source Code
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, purpose, auth_user_id } = await req.json();

    if (!email || !purpose) {
      return new Response(
        JSON.stringify({ error: "email and purpose are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedEmailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|proton\.me)$/;
    if (!allowedEmailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Only @gmail.com and @proton.me emails are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["signup", "password_reset", "re_verify", "login"].includes(purpose)) {
      return new Response(
        JSON.stringify({ error: "Invalid purpose" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userId = auth_user_id;
    if (!userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();
      userId = profile?.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark tracking record as verified
    await supabaseAdmin
      .from("otp_verifications")
      .update({ verified: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    let actionResult: Record<string, unknown> = {};

    if (purpose === "login") {
      actionResult = { user_id: userId, email, purpose: "login" };

    } else if (purpose === "signup") {
      await supabaseAdmin.rpc("mark_email_verified", { p_user_id: userId });

      const { data: otpRecord } = await supabaseAdmin
        .from("otp_verifications")
        .select("metadata")
        .eq("email", email)
        .eq("purpose", "signup")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const storedMetadata = (otpRecord?.metadata as Record<string, unknown>) || {};
      const username = storedMetadata.username as string;

      if (username) {
        await supabaseAdmin.from("profiles").update({
          username,
          email,
        }).eq("id", userId);
      }

      actionResult = { user_id: userId, email };

    } else if (purpose === "password_reset") {
      const { data: otpRecord } = await supabaseAdmin
        .from("otp_verifications")
        .select("metadata")
        .eq("email", email)
        .eq("purpose", "password_reset")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const storedMetadata = (otpRecord?.metadata as Record<string, unknown>) || {};
      const metaUserId = storedMetadata.user_id as string;
      const targetUserId = metaUserId || userId;

      await supabaseAdmin.rpc("mark_email_verified", { p_user_id: targetUserId });

      actionResult = { user_id: targetUserId, verified: true };

    } else if (purpose === "re_verify") {
      await supabaseAdmin.rpc("mark_email_verified", { p_user_id: userId });
      await supabaseAdmin.rpc("update_verify_request_time", { p_user_id: userId });

      actionResult = { user_id: userId, verified: true };
    }

    return new Response(
      JSON.stringify({ success: true, ...actionResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 3. EDGE FUNCTION: reset-password-otp

### Endpoint URL
```
https://qfgwprqnakkaigwinvat.supabase.co/functions/v1/reset-password-otp
```

### Request Body
```json
{
  "user_id": "uuid-of-user",
  "new_password": "newpassword123"
}
```

### Response

**Success (200):**
```json
{ "success": true, "message": "Password updated successfully" }
```

**Errors:**
```json
{ "error": "user_id and new_password are required" }     // 400
{ "error": "Password must be at least 6 characters" }    // 400
{ "error": "Failed to update password" }                  // 500
```

### Full Source Code
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: "user_id and new_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user_id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
      },
      body: JSON.stringify({ password: new_password, email_confirm: true }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Password update error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 4. EMAIL PROVIDER

| Setting | Value |
|---------|-------|
| **Provider** | Supabase Auth built-in mailer (koi third-party nahi) |
| **Resend/SendGrid/Brevo** | NOT USED — codebase mein `grep resend` = 0 results |
| **API Key** | N/A — Supabase apna internal mailer use karta hai |
| **From-address** | `noreply@qfgwprqnakkaigwinvat.supabase.co` (Supabase default) |
| **Custom SMTP** | OFF — koi custom SMTP config nahi hai |
| **Domain verified** | Supabase ka domain `*.supabase.co` automatically verified hai |

---

## 5. SUPABASE SETTINGS

| Setting | Value | Proof |
|---------|-------|-------|
| **Authentication → Providers → Email** | ON | signInWithOtp kaam kar raha hai |
| **Confirm email** | ON | `send-email-otp/index.ts:157`: `email_confirm: false` explicitly set hai (matlab default ON hai) |
| **OTP length** | 6 digits | Supabase default |
| **OTP expiry** | 5 minutes | Supabase default |
| **Rate limiting (custom)** | 3 OTP per email per 10 min | `send-email-otp/index.ts:184-196` |
| **Re-verify cooldown** | 24 hours | `send-email-otp/index.ts:57-70` (RPC: `can_request_verify`) |

---

## 6. OTP STORAGE

| Storage | Details |
|---------|---------|
| **OTP generate** | Supabase Auth internal (signInWithOtp) |
| **OTP store** | Supabase Auth internal table |
| **Custom table** | `otp_verifications` — sirf **tracking/rate-limiting** ke liye |
| **Custom table schema** | `id`, `email`, `otp_hash`, `purpose`, `metadata` (jsonb), `verified` (bool), `created_at`, `expires_at` |

### otp_verifications table purpose:
- Rate limiting (max 3 OTPs per 10 min)
- Metadata storage (username, password, user_id)
- Verified status tracking
- Expired OTP cleanup (RPC: `cleanup_expired_otps`)

### RPC functions used:
| RPC Function | Purpose |
|-------------|---------|
| `can_request_verify(p_user_id)` | 24hr cooldown check for re_verify |
| `mark_email_verified(p_user_id)` | Mark user's email as verified |
| `update_verify_request_time(p_user_id)` | Update cooldown timestamp |
| `cleanup_expired_otps()` | Delete expired OTP records |

---

## 7. FRONTEND CALLS

### File: `src/contexts/AuthContext.tsx`

### Helper functions (lines 54-63):
```typescript
// Edge function URL helper
const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

const getEdgeFunctionHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
});
```

### Send OTP (line 382-404):
```typescript
const sendEmailOTP = async (
  email: string,
  purpose: 'signup' | 'password_reset' | 're_verify' | 'login',
  metadata?: Record<string, unknown>
) => {
  const response = await fetch(getEdgeFunctionUrl('send-email-otp'), {
    method: 'POST',
    headers: getEdgeFunctionHeaders(),
    body: JSON.stringify({ email, purpose, metadata }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send OTP');
  }
};
```

### Verify OTP (line 406-449):
```typescript
const verifyEmailOTP = async (
  email: string,
  otp: string,
  purpose: 'signup' | 'password_reset' | 're_verify' | 'login'
): Promise<Record<string, unknown>> => {
  // Step 1: Client-side verify (browser se)
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: 'email',
  });

  if (verifyError) {
    if (verifyError.message?.includes('Invalid token')) {
      throw new Error('Invalid OTP code. Please check and try again.');
    } else if (verifyError.message?.includes('Token expired')) {
      throw new Error('OTP expired. Please request a new one.');
    } else {
      throw new Error(verifyError.message || 'OTP verification failed');
    }
  }

  const authUserId = verifyData?.user?.id;

  // Step 2: Edge function for post-verification logic
  const response = await fetch(getEdgeFunctionUrl('verify-email-otp'), {
    method: 'POST',
    headers: getEdgeFunctionHeaders(),
    body: JSON.stringify({ email, purpose, auth_user_id: authUserId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Post-verification failed');
  }
  return data;
};
```

### Reset Password (line 451-469):
```typescript
const resetPasswordWithOTP = async (userId: string, newPassword: string) => {
  const response = await fetch(getEdgeFunctionUrl('reset-password-otp'), {
    method: 'POST',
    headers: getEdgeFunctionHeaders(),
    body: JSON.stringify({ user_id: userId, new_password: newPassword }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
};
```

---

## 8. DEPLOYMENT

### Functions deploy command:
```bash
supabase functions deploy send-email-otp
supabase functions deploy verify-email-otp
supabase functions deploy reset-password-otp
```

### supabase/functions folder list:
| Function | Purpose |
|----------|---------|
| `send-email-otp` | OTP bhejta hai |
| `verify-email-otp` | OTP verify + post-verification logic |
| `reset-password-otp` | Password reset karta hai |
| `delete-account` | Account delete karta hai |
| `send-fcm-push` | Push notification bhejta hai |
| `admin-delete-user` | Admin ke liye user delete |
| `admin-reset-password` | Admin ke liye password reset |
| `fix-auth-user` | Auth user fix karne ke liye |

### Secrets set command:
```bash
supabase secrets set RESEND_API_KEY=xxx  # NOT USED in this project
# Supabase built-in mailer use hota hai, koi external API key nahi chahiye
```

### Environment variables (frontend):
```
VITE_SUPABASE_URL=https://qfgwprqnakkaigwinvat.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## 9. COMPLETE FLOW DIAGRAM

```
SIGNUP FLOW:
User enters email + username + password
        ↓
Frontend calls: send-email-otp({ email, purpose: "signup", metadata: { username, password } })
        ↓
Edge Function creates auth user (email_confirm: false)
        ↓
Edge Function calls: supabaseClient.auth.signInWithOtp({ email })
        ↓
Supabase Auth generates 6-digit OTP + sends email via built-in mailer
        ↓
User receives email with 6-digit OTP
        ↓
User enters OTP in frontend
        ↓
Frontend calls: supabase.auth.verifyOtp({ email, token, type: 'email' })  ← CLIENT SIDE
        ↓
Frontend calls: verify-email-otp({ email, purpose: "signup", auth_user_id })
        ↓
Edge Function calls: mark_email_verified(userId)
        ↓
Edge Function updates profile with username + email
        ↓
User logged in with session

LOGIN FLOW:
User enters email + OTP (no password)
        ↓
Frontend calls: send-email-otp({ email, purpose: "login" })
        ↓
Edge Function checks: user exists? email verified?
        ↓
Supabase sends OTP email
        ↓
User enters OTP
        ↓
Frontend calls: supabase.auth.verifyOtp()  ← CREATES SESSION
        ↓
Frontend calls: verify-email-otp({ email, purpose: "login" })
        ↓
Done — user has session

PASSWORD RESET FLOW:
User enters email
        ↓
Frontend calls: send-email-otp({ email, purpose: "password_reset" })
        ↓
Supabase sends OTP email
        ↓
User enters OTP + new password
        ↓
Frontend calls: supabase.auth.verifyOtp()  ← verifies OTP
        ↓
Frontend calls: verify-email-otp({ purpose: "password_reset" })  ← marks verified
        ↓
Frontend calls: reset-password-otp({ user_id, new_password })
        ↓
Edge Function calls: PUT /auth/v1/admin/users/{id} with new password
        ↓
Done — password updated
```

---

*Document generated from RoomieKhata codebase — September 10, 2026*
