# OTP Email System — Complete Guide

> **Date:** September 22, 2026
> **Project:** Chakki Mitra (Flour Mill Billing Platform)
> **Stack:** Next.js 16 + Supabase (PostgreSQL) + Brevo API + Capacitor APK

---

## 1. Problem Statement

Chakki Mitra me OTP-based auth chahiye tha — signup, forgot password, email change. Pehle Supabase Auth ke built-in `signInWithOtp()` use kar rahe the, par:
- Supabase default email template me **6-digit code dikhta nahi** (sirf link aata hai)
- Template edit karne ke liye **custom SMTP** chahiye
- SMTP lagate hi **500 error** aa raha tha
- Template me `{{ .Token }}` variable add karna tha par bina SMTP ke possible nahi

**Solution:** Custom OTP system banaya jo **Brevo API** se directly email bhejta hai — koi SMTP nahi, koi Supabase template nahi.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  USER clicks "OTP Bhejo" in App                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Frontend calls Edge Function                    │
│  POST /functions/v1/send-otp                    │
│  { email, purpose }                             │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  Edge Function (Deno Runtime)                   │
│                                                 │
│  1. Rate limit check (3 per 10 min)             │
│  2. Generate 6-digit OTP                        │
│  3. Hash OTP (SHA-256)                          │
│  4. Store in email_otps table                   │
│  5. Send email via Brevo API                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  USER receives email with 6-digit code          │
│  (Professional HTML template by Brevo)          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  User enters OTP in App                         │
│  App calls /api/auth/otp/verify                 │
│  { email, code, purpose }                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  API Route (Vercel Serverless)                  │
│                                                 │
│  1. Hash submitted OTP                          │
│  2. Match against email_otps table              │
│  3. Check expiry (5 min)                        │
│  4. Mark as used                                │
│  5. Return success                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  App proceeds with:                             │
│  - Signup → create account + JWT                │
│  - Password Reset → update password             │
│  - Email Change → update email                  │
└─────────────────────────────────────────────────┘
```

---

## 3. Files Created / Modified

### New Files:
| File | Purpose |
|------|---------|
| `supabase/functions/send-otp/index.ts` | Edge Function — generates OTP, stores hash, sends via Brevo API |
| `src/lib/edge.ts` | Frontend helper — calls Edge Function URL |
| `src/app/api/auth/otp/verify/route.ts` | API route — verifies OTP against DB |
| `EDGE_FUNCTION_DEPLOY.md` | Deployment instructions |
| `OTP_TABLE.sql` | SQL to create email_otps table |

### Modified Files:
| File | What Changed |
|------|-------------|
| `src/app/login/page.tsx` | Replaced `signInWithOtp()` with `sendOTP()` + `/api/auth/otp/verify` |
| `src/components/Settings.tsx` | Email change now uses Edge Function + OTP verify API |
| `src/app/api/auth/email/route.ts` | Removed Supabase token requirement for signup |
| `src/app/api/auth/password/reset/route.ts` | Removed Supabase token, uses email directly |
| `src/app/api/auth/email/change/route.ts` | Removed Supabase token, uses email directly |
| `tsconfig.json` | Excluded `supabase/` directory from typecheck |

---

## 4. Database Schema

### Table: `email_otps`

```sql
CREATE TABLE email_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(300) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,       -- SHA-256 hash of 6-digit OTP
  purpose VARCHAR(20) NOT NULL,           -- 'signup' | 'password_reset' | 'email_change'
  expires_at TIMESTAMP NOT NULL,          -- 5 minutes from creation
  attempts INTEGER DEFAULT 0,             -- Max 5 wrong attempts
  used BOOLEAN DEFAULT false,            -- Marked true after successful verify
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_otps_email ON email_otps(email);
CREATE INDEX idx_email_otps_purpose ON email_otps(purpose);
CREATE INDEX idx_email_otps_expires ON email_otps(expires_at);
```

---

## 5. Supabase Settings

### Required:
| Setting | Value |
|---------|-------|
| Authentication → Providers → Email | **ON** |
| Confirm email | **OFF** (not needed anymore) |
| SMTP Settings | **OFF** (Brevo API handles email) |

### Edge Function Secrets:
| Secret Name | Value |
|-------------|-------|
| `BREVO_API_KEY` | `xkeysib-...` (your Brevo API key) |

### Edge Function Settings:
| Function | Verify JWT |
|----------|-----------|
| `send-otp` | **OFF** (set to false in Dashboard) |

---

## 6. Brevo Setup

### Steps:
1. **Signup/Login** at [brevo.com](https://brevo.com)
2. **Senders:** Settings → Senders → Add `29devs@proton.me` → Verify
3. **API Key:** Settings → SMTP & API → API Keys → Generate (name: `supabase-otp`)
4. **Credits:** Dashboard shows credit balance (free tier = 300 emails/month)

### Why Brevo API (not SMTP):
- SMTP requires port 587 open on Supabase edge runtime
- SMTP credentials cause 500 errors in Supabase
- Brevo HTTP API = simpler, more reliable
- No template editing needed — we build our own HTML

---

## 7. Security Features

| Feature | Implementation |
|---------|---------------|
| **OTP Hashing** | SHA-256 via Web Crypto API (Edge) / Node crypto (API) |
| **Expiry** | 5 minutes |
| **Rate Limit** | 3 OTPs per email per 10 minutes |
| **Max Attempts** | 5 wrong OTP attempts per record |
| **Single Use** | `used: true` after successful verify |
| **No Plaintext** | OTP never stored in plaintext — only hash |
| **Cleanup** | Expired records auto-deleted on new OTP |

---

## 8. Rate Limiting (API Abuse Protection)

> PDF security doc (Section 6) ke hisaab se lagaya gaya.

Server-side limits (`src/lib/rate-limit.ts` — DB-backed fixed window, `rate_limits` table):

| Endpoint | Key | Limit |
|----------|-----|-------|
| `POST /api/auth/email` (login/signup) | per IP | 10/min |
| Wrong password | per email | 5 fails → 15 min lockout |
| `POST /api/auth/otp/verify` | per email+purpose | 10 per 10 min |
| Edge `send-otp` | per email+purpose | 3 per 10 min |
| OTP record | per record | 5 wrong attempts |

Client-side: OTP resend buttons par **60s cooldown** with countdown (login signup/forgot + Settings email change).

Naye project me: `RATE_LIMIT_TABLE.sql` run karo + `src/lib/rate-limit.ts` copy karo + routes me `checkRateLimit()` lagao.

---

## 9. Email Template

The OTP email sent via Brevo includes:
- Green branded header (Chakki Mitra logo)
- **Large 6-digit OTP code** (green, monospace, 40px)
- "5 minute me expire" warning
- Purpose label (Signup / Password Reset / Email Change)
- Security note ("ignore if not you")

Template is built inside the Edge Function (not Supabase templates).

---

## 9. Deploy to New Project — Step by Step

### Prerequisites:
- Supabase project with PostgreSQL
- Brevo account with API key
- Next.js app with API routes

### Step 1: Create Table
```sql
-- Run in Supabase SQL Editor
CREATE TABLE email_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(300) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  purpose VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_email_otps_email ON email_otps(email);
CREATE INDEX idx_email_otps_purpose ON email_otps(purpose);
CREATE INDEX idx_email_otps_expires ON email_otps(expires_at);
```

### Step 2: Set Edge Function Secret
```
Supabase Dashboard → Edge Functions → Settings → Secrets
→ New Secret: BREVO_API_KEY = your-brevo-api-key
```

### Step 3: Deploy Edge Function
```
Supabase Dashboard → Edge Functions → New Function
→ Name: send-otp
→ Paste code from supabase/functions/send-otp/index.ts
→ Deploy
→ Settings → Verify JWT: OFF
```

### Step 4: Add Frontend Files
Copy these files to your project:
- `src/lib/edge.ts` (update `NEXT_PUBLIC_SUPABASE_URL` if needed)

### Step 5: Add API Route
```
src/app/api/auth/otp/verify/route.ts
```

### Step 6: Update Your Login/Signup Code
Replace `signInWithOtp()` calls with:
```typescript
import { sendOTP } from "@/lib/edge";

// Send OTP
await sendOTP(email, "signup");

// Verify OTP (before creating account)
const res = await api("/api/auth/otp/verify", {
  method: "POST",
  body: JSON.stringify({ email, code: otp, purpose: "signup" }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
```

### Step 7: Disable Supabase SMTP (Optional)
```
Dashboard → Configuration → Auth → SMTP → OFF
```

---

## 10. Flow by Use Case

### Signup:
```
1. User enters email + password
2. Click "OTP Bhejo" → send-otp Edge Function
3. Email arrives with 6-digit code
4. User enters OTP
5. /api/auth/otp/verify checks against DB
6. /api/auth/email creates account + returns JWT
```

### Forgot Password:
```
1. User clicks "Forgot Password"
2. Enters email → send-otp Edge Function
3. Email arrives with 6-digit code
4. User enters OTP + new password
5. /api/auth/otp/verify checks against DB
6. /api/auth/password/reset updates password
```

### Email Change:
```
1. User enters new email in Settings
2. Click "OTP Bhejo" → send-otp Edge Function
3. Email arrives at NEW email with 6-digit code
4. User enters OTP
5. /api/auth/otp/verify checks against DB
6. /api/auth/email/change updates email in users table
```

---

## 11. Testing

### Test Edge Function directly:
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/send-otp" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","purpose":"signup"}'
```

Expected: `{"success":true,"message":"OTP sent successfully"}`

### Test OTP Verify:
```bash
curl -X POST "https://YOUR_APP.vercel.app/api/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","code":"123456","purpose":"signup"}'
```

### Check Edge Function Logs:
```
Supabase Dashboard → Edge Functions → send-otp → Logs
```

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| "BREVO_API_KEY not configured" | Add secret in Edge Functions → Settings → Secrets |
| "OTP store nahi ho paya" | Check email_otps table exists in SQL Editor |
| "Email nahi bhej paye" | Check Brevo API key, sender verification, credits |
| "OTP galat hai" | Check if OTP expired (5 min), or wrong code entered |
| "OTP expire ho gaya" | User took too long — send new OTP |
| "Bahut requests" | Rate limit hit — wait 10 minutes |
| Edge Function not found | Re-deploy from Dashboard, check name is `send-otp` |
| 401 UNAUTHORIZED_LEGACY_JWT | Turn OFF "Verify JWT" in Edge Function settings |
| Build fails (npm:type error) | Add `"supabase"` to tsconfig.json exclude array |

---

## 13. Key Decisions

1. **Why Brevo API instead of SMTP?**
   Supabase edge runtime + SMTP = 500 errors. Brevo HTTP API is simpler and more reliable.

2. **Why not Supabase signInWithOtp()?**
   Default template doesn't show OTP code (only link). Template edit requires SMTP. Custom system gives full control.

3. **Why SHA-256 hash for OTP?**
   Never store plaintext OTPs. Even if DB is compromised, OTPs can't be extracted.

4. **Why Edge Function instead of API route for sending?**
   Brevo API key needs to be secret. Edge Functions keep secrets server-side. API routes in Next.js are also server-side, but Edge Functions are closer to Supabase and faster.

5. **Why verify_jwt = false?**
   App calls Edge Function from browser with anon key. No Supabase session needed — we use our own JWT system.

---

## 14. Cost

| Service | Free Tier |
|---------|-----------|
| Supabase | 500MB database, 1GB bandwidth |
| Brevo | 300 emails/month (free forever) |
| Vercel | 100GB bandwidth/month |

**Total cost: ₹0** for small shops.

---

*Document generated from Chakki Mitra codebase — September 22, 2026*
