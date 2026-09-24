# 🛡️ Chakki Mitra — Admin Dashboard Feature Plan (ADMIN.md)

**Document type:** Admin panel feature specification — current-state-aware
**Date:** 24 September 2026
**Status:** Approved for planning — is document se koi feature implement nahi hota. Sirf planning ke liye.
**Supersedes context of:** [ADMIN_PANEL_FEATURES.md](ADMIN_PANEL_FEATURES.md) (historical, git-diff format, dated 21 Sep — wo file untouched hai as reference)

> **Assumption:** Ye panel Chakki Mitra ke app owner / platform admin ke liye hai — jo saari shops ko manage karega. Chakki owner ka daily kaam (entry, khata, payment, reports) existing app me hi rahega — admin panel me nahi jaayega.
>
> **Golden rule:** Pehle secure, read-only operations panel banao. Monetization (plans/referral/credits) live code ke saath map karo. Payments gateway alag step hai.

---

## 1. Codebase Reality Snapshot (DEEP ANALYSIS — har claim code-verified)

> Neeche ki har row source file + line se verify ki gayi hai (24 Sep 2026 cross-check).

### ✅ LIVE — code me actually exist karta hai (admin panel inhe directly use karega)

| # | Feature | Proof (file:line) |
|---|---------|-------------------|
| 1 | **SMS credits** — 50 default, atomic consume, 402 on 0 | `src/db/schema.ts:19` `sms_credits INTEGER DEFAULT 50`; `src/app/api/sms-credits/consume/route.ts:18-26` atomic decrement; `src/components/QuickEntry.tsx:187` entry-save se pehle consume, 402 → modal |
| 2 | **Referral system** — unique code, +20 bonus dono ko (naya user 50→70) | `schema.ts:20-21` `referral_code UNIQUE`, `referred_by`; `src/app/api/auth/email/route.ts:63-96` bonus flow; `src/app/login/page.tsx:409` signup input; `src/components/Settings.tsx:435-465` copy card |
| 3 | **Pro plan — HARDCODED** (₹99/माह, ₹499/वर्ष) — koi `plans` table nahi, koi Razorpay code nahi | `src/components/CreditsExhaustedModal.tsx:30-31` hardcoded string; `:48` button = "जल्द उपलब्ध"; repo-wide `razorpay` grep = 0 code matches |
| 4 | **isRegistered funnel** — signup (false) → register wizard (true) | `schema.ts:18` default false; `src/app/register/page.tsx:73` set true; login/guest/google sab false se start |
| 5 | **Guest accounts** — `guest-<ts>@local`, naam "गेस्ट यूज़र", **koi flag nahi** | `src/app/api/auth/guest/route.ts:7` |
| 6 | **Rate-limit / lockout infra** — IP 10/min, wrong-password 5 fails/15min | `schema.ts:77-81` `rate_limits` table; `src/lib/rate-limit.ts:17` DB-backed fixed-window; `src/app/api/auth/email/route.ts:32,45` |
| 7 | **Ledger data** — customers/transactions/payments, sab `userId`-scoped | `schema.ts:25-55` + all `/api/*` routes via `getUserIdFromRequest` |
| 8 | **Email OTP auth** — Brevo custom OTP, JWT (HS256, no expiry) | `src/lib/auth.ts:5` sirf `{userId, name, iat}` — **koi role claim nahi** |
| 9 | **Offline-first + auto-sync queue** | `src/lib/offline-db.ts`, `SyncProvider.tsx` |
| 10 | **APK update flow** — GitHub Releases se AutoUpdater | `src/components/AutoUpdater.tsx`; `.github/workflows/build-android.yml` (v* tags) |

### ❌ ABSENT — code me NAHI hai (admin panel ke liye NAYA banana padega)

| # | Missing | Proof |
|---|---------|-------|
| 1 | **No admin/role concept** | JWT `auth.ts:5` me sirf `{userId,name}`; grep `role\|isAdmin` → sirf HTML attrs + helper naam; `schema.ts` me **koi role column nahi** |
| 2 | **No /admin route or /api/admin/*** | pages sirf 3: `/`, `/login`, `/register`; API routes list me koi admin nahi |
| 3 | **No telemetry/heartbeat/version-reporting** | `App.getInfo()` 4 jagah — sab **local** (footer, update check); **kabhi server ko bheja nahi**; grep `heartbeat\|sendBeacon\|userAgent` = 0 functional |
| 4 | **No support tickets, audit_logs, devices, sms_events, plans, subscriptions tables** | `schema.ts` me sirf 7 tables: users, customers, transactions, payments, email_otps, test_table, rate_limits |
| 5 | **No SMS send-result history** | Sirf credit **counter** hai — kya send hua, kis number par, kya fail — **kuch store nahi hota** |
| 6 | **No payment gateway** | Razorpay/Stripe code = 0; Pro plan sirf UI text |

### 🔒 APK boundary (admin panel APK me ship NAHI hoga)

`scripts/build-apk.js:5-11` — build se pehle `src/app/api` move ho jata hai; `next.config.ts:4` static export. **Nayi `/admin` page + `/api/admin/*` routes APK export me automatically exclude honge. Zero build-fail risk.**

---

## 2. Old `ADMIN_PANEL_FEATURES.md` vs this `ADMIN.md` — Comparison

| Category | Detail |
|---|---|
| **Kept as-is** (old doc ka strong core) | Security/roles philosophy, SMS status semantics (Created/Sent/Delivered/Failed/Partial/Skipped/Unknown), device-SIM vs server-gateway boundary, financial safety rules (MVP me edit/delete nahi), audit/privacy, build order, MVP acceptance checklist, suggested nav, "what NOT to build" |
| **Upgraded** | Subscriptions **P2 → P1** (Pro plan ₹99 already UI me hai — ab plan CRUD admin se hoga, hardcoded nahi); "shops" table assumption → actual entity **`users`** hai; doc format git-diff → clean markdown |
| **Newly added (code analysis se)** | **E. SMS credit reconciliation** (live `sms_credits` + consume API mapped), **F. Referral admin** (live `referral_code`/`referred_by`/+20 mapped), **M. Guest flagging** (`auth/guest` live), **N. Rate-limit/security view** (`rate_limits` live), **Reality snapshot** (Section 1) |
| **Old me tha, ab stale** | Old doc assumed no credits/referral system exists (written 21 Sep, credits 23 Sep ko add hue) — naye doc me ye teeno first-class modules hain |

---

## 3. Feature Modules — Priority ke saath

- **P0 — MVP:** Pehli useful aur safe admin release
- **P1 — Next:** MVP stable hone ke baad
- **P2 — Optional:** first release ko block na kare

### 🔴 P0 Modules

#### A. Admin Access & Security
- **Separate admin login** — shop login se independent; normal shop user admin UI **aur admin APIs** access na kare
- Invite-only admin creation (public admin signup nahi)
- Roles: **Super Admin** (accounts, shop status, plans, sensitive actions) + **Support Admin** (masked lookup, read-only diagnostics, assigned tickets)
- MFA / two-step verification, session expiry, logout-all, compromised session revoke
- Login rate limits (existing `rate_limits` infra reuse), failed-login alerts, last-login history
- Sensitive actions par **re-authentication + mandatory reason**
- Server-side role check **har admin API par** — menu hide karna security nahi hai
- **Proposal:** `role` column on admin identities + `role` claim in JWT (shop JWT unchanged)

#### B. Overview Dashboard
- Total accounts; `isRegistered` completed vs incomplete (funnel)
- New registrations: today / 7d / 30d
- Active shops (period me kam-se-kam ek successful business action — sirf account exist hona activity nahi)
- Transactions count + atta/dalia weight/amount totals (platform-level aggregate, authorized)
- **SMS credit stats:** total granted, total consumed, shops at 0 (exhausted)
- **Referral stats:** total codes, referrals done, bonus credits granted
- Open tickets, API health, last backup timestamp
- Metric definitions + last-refreshed time; missing data = `Unknown / Not reported` (zero nahi)
- Timestamps: DB UTC, display `Asia/Kolkata`

#### C. Shops & Users Directory
- Search: shop name, owner, account ID, email, authorized phone
- Filters: registration status, created date, last activity; pagination + sorting
- Phone/email **masked by default**; full reveal = permission + audit
- **Guest accounts flag** (`guest-<ts>@local`) — filter/tag, normal users se alag dikhao
- Shop detail tabs: Overview · Account · Records · SMS & Credits · Support · Activity
- Account actions: activate / suspend / reactivate — **reason + audit entry mandatory**
  - Suspension scope: API access block, sessions revoke, app ko clear message
  - Suspension se **kuch delete nahi** — customer/transaction/payment data preserve
  - Deletion = alag approved workflow (dependency preview + retention policy)
- Profile (shopName, rates) default read-only

#### D. Read-only Ledger Inspection
- Har view explicit **shop/account scope** me open ho
- Customers search; transactions filter (date/product/payment-mode); read-only history
- Atta/dalia weight, rate, amount, cash/credit, linked payments, dues vs advance alag labels
- **MVP me admin panel se edit/delete BILKUL nahi** (future: adjustment/reversal, original preserve)
- Cross-tenant access server-side ownership checks se blocked
- Customer PII platform-wide list me unnecessary expose na ho

#### E. SMS Health + Credit Reconciliation
- **Credit reconciliation (live code se — turant useful):**
  - Per-shop: current balance, lifetime granted (50/70 signup + bonuses + top-ups), lifetime consumed
  - Exhausted shops list (0 credits)
  - Admin **credit top-up** action (manual grant — reason + audit)
  - Consume history — **new `sms_events` table chahiye** (abhi sirf counter hai, history nahi)
- **SMS diagnostics (naya — app-side reporting dependency):**
  - Event list: shop, linked txn, masked recipient, app version, timestamps, outcome, error code
  - Status semantics (old doc se exact): Created / Queued / Submitted / Sent / Delivered / Failed / Partial / Skipped / Unknown — **Sent ≠ Delivered**, unknown par blind retry nahi
  - Permission state, failure breakdown by version/shop, stale-report ko live mat dikhao
- **Boundary:** device SIM se client-side SMS hota hai (`BackgroundSms` plugin) — sirf admin website se kisi phone ki SIM se remote SMS **nahi** jayega. Remote retry/command = future, MVP me nahi. SIM balance fabricate mat dikhao.
- Hindi disclaimer (`SmsDisclaimer.tsx`) user-facing hai — admin ko ye **nahi** dikhana, admin ko data dikhana hai

#### F. Referral Admin (live code se mapped)
- Referral leaderboard: sabse zyada successful referrals wale shops
- Per-code: kitne signups hue, kitne +20 bonuses mile
- `referred_by` mapping — kisne kise refer kiya (referrer user id string me stored hai)
- Bonus grant audit — har +20 event log (abhi sirf signup par hota hai, history nahi — `audit_logs` me record)
- Invalid/wasted codes (signup me daala par referrer nahi mila) visibility
- Future: manual bonus grant/revoke (Super Admin only, reason + audit)

#### H. Support Tickets
- Lifecycle: create → assign → reply → close → reopen
- Status: New → In progress → Waiting for user → Resolved → Closed
- Categories: login, registration, entry-save, khata/payment, SMS, APK update, backup, credits/referral, other
- Priority, assignee, created/last-reply time, resolution note
- User permission se shop ID + app version + diagnostics auto-attach
- **Internal notes vs user-visible replies** clearly alag
- Support Admin ko full customer data ya impersonation automatically na mile

#### I. Backups, Privacy & Audit
- Backup status: latest success/failure, retention, last restore-test date
- Restore = approval + current-data backup + maintenance plan (one-click casual nahi)
- **`audit_logs` (append-only):** actor, role, action, target, timestamp, reason, outcome, correlation ID
- Audit karo: suspend/reactivate, role change, PII reveal, export, credit top-up, plan change/assign, ticket close, restore approval
- Secrets/tokens/full SMS bodies logs me kabhi nahi
- Privacy: masked-by-default, retention policy (tickets/events/exports), user data export/deletion workflow

---

### 🟡 P1 Modules

#### G. Plans Admin — Dynamic, NO Hardcoding ⭐ (aapki requirement)
> Abhi `CreditsExhaustedModal.tsx:30` me `₹99/माह या ₹499/वर्ष` **hardcoded** hai. Ye module ise **API-driven** banayega.

- **Plan CRUD (admin panel se):**
  - Fields: name, description, price (₹), duration (days/months), SMS quota (ya unlimited), features (WhatsApp share, advanced reports — flags), active/inactive
  - Create / edit / **deactivate** (existing subscribers unaffected — grandfather), version history
  - Simple Hindi preview — non-tech shop owner samajh sake
- **Per-shop assignment:** assign plan, change plan, expiry date, grace period, cancel/renew — reason + audit
- **App client:** `CreditsExhaustedModal` + Settings → active plans API se aayenge (hardcoded text hata diya jayega)
- **Payment gateway boundary (flagged):**
  - Ye module = **plan management** (catalog + assignment)
  - Payment collection = **alag step** — Razorpay integration, verified webhooks, invoices, refunds, reconciliation
  - **Plan create/edit turant live ho sakta hai** (manual assign se); gateway tab jab paid model confirm ho
- **Do NOT reuse `payments` table** — wo customer dues/advance ka hai, subscriptions alag financial domain (old doc rule retained)
- Platform revenue vs shop sales dashboard par mix nahi

#### J. APK Releases & Version Adoption
- Release list (GitHub flow reuse — panel ko APK compiler ki zaroorat nahi): version, date, changelog, APK link, checksum
- Version-wise adoption — **dependency: app ko server ko version report karna padega** (`App.getInfo()` abhi local hai)
- Recommended vs minimum version; broken release halt; version code strictly increase
- Publish/min-version change = approval + re-auth + audit; signing credentials kabhi browser me nahi

#### K. Announcements & Feature Flags
- In-app banners (Hindi-first): maintenance, feature, issue, support — start/end time + preview
- Targeting: all / selected shops / app versions; frequency cap; dismiss; emergency remove
- Staged feature flags + safe defaults (config load fail ho to app phir bhi chale)
- Versioned config + rollback + audit
- **Safety:** permission bypass, arbitrary code, ya silently rates/billing change karne wala remote control **nahi**

#### L. Reports & Exports
- Registration/activation trends, retention, version adoption, SMS outcome trend, support volume/resolution time
- CSV export: date/shop scope + permission check + export audit + formula-injection protect
- Large exports = background job + time-limited link
- Har report: filters, timezone, generated-at, metric definitions

#### M. Registration Funnel & Guest Accounts
- Funnel: OTP-verified signup → `isRegistered=true` (register wizard complete) → active
- Dropout point dikhao (kitne signup ke baad register wizard complete nahi kiye)
- Guest accounts (`guest-<ts>@local`) ko list me flag; count; future: merge/upgrade to real account workflow
- Onboarding support notes (incomplete registrations ke liye)

#### N. Rate-Limit / Security View
- Live `rate_limits` table se: active lockouts (`loginfail:*`), IP-based throttles (`auth:*`), OTP abuse keys (`otpverify:*`)
- Brute-force attempts timeline, top offending IPs/emails (masked)
- Action: manual unlock (reason + audit), threshold visibility
- **Boundary:** data abhi fail-open cleanup hota hai (24h) — history chahiye to retention policy alag se define karni hogi

#### O. App Health & Error Grouping
- API availability, error rate, latency, DB connectivity
- Errors grouped by route + version + correlation ID; affected shops count
- Sanitized: tokens/passwords/full phones/SMS bodies logs me nahi
- **Dependency flagged:** app se koi client telemetry abhi nahi jati — ye module app-side event reporting ke baad meaningful hoga (P0/P1 boundary)

---

### 🟠 P2 Modules (optional, MVP block na kare)

- **Full subscription billing:** Razorpay/webhooks/invoices/refunds/reconciliation (jab paid model confirmed)
- **Multi-shop staff:** `shops` + `shop_memberships` (abhi owner-account = shop scope)
- **Server-gateway SMS:** provider integration, consent, billing, compliance — alag review
- **Advanced toast/UI diagnostics** (sampled telemetry)

---

### ❌ NOT Build Karna (old doc se retained)

- Full ERP / inventory / payroll / accounting suite
- Har shop ke customers ko unrestricted bulk SMS
- Arbitrary remote commands / phone control
- One-click permanent ledger deletion / unaudited financial edits
- Fake live-device, SIM-balance, ya SMS-delivery indicators
- Panel ko APK me ship karna (static export boundary — upar Section 1 proof)

---

## 4. Proposed Data Additions (logical — final migration nahi)

| Model / data | Purpose | Phase |
|---|---|---|
| `admin_accounts`, `admin_sessions` | Admin access, roles, MFA, revocation | P0 |
| Account status + status history | Suspend/reactivate with reasons | P0 |
| **`audit_logs`** | Sensitive/admin activity (append-only) | P0 |
| **`sms_events`** | Credit consume + send outcome history (abhi sirf counter) | P0 |
| **`support_tickets`, `ticket_messages`** | Complaint lifecycle | P0 |
| `devices` | Installation ID, reported version, last heartbeat | P0/P1 (telemetry dependency) |
| **`plans`** | name, price, duration, sms_quota, features, active — **admin CRUD** | P1 |
| **`subscriptions`** (user_plans) | user → plan, expiry, grace, status — **alag `payments` se** | P1 |
| `app_releases`, `announcements`, `feature_flags` | Versioned operations | P1 |
| `export_jobs`, `data_requests` | Export/privacy workflows | P1 |
| Sanitized error/event storage | Correlated diagnostics | P1 |
| `shops`, `shop_memberships` | Multi-shop/staff | P2 |
| `billing_events` | Gateway reconciliation | P2 |

---

## 5. Suggested Navigation

```text
Overview
Shops & Users
  └─ Shop Detail
      ├─ Overview / Account
      ├─ Records (authorized read-only)
      ├─ SMS & Credits
      ├─ Referrals
      ├─ Support
      └─ Activity
SMS Health & Credits
Referrals
Plans & Subscriptions          [P1]  ← admin create/edit/assign
Support Tickets
App Health                     [telemetry ke baad]
Releases                       [P1]
Announcements & Flags          [P1]
Reports & Exports              [P1]
Security & Rate Limits         [P1]
Backups & Audit
Admin Team & Security
```

UI desktop-first, emergency mobile usable. Dangerous actions par selected shop/name dobara confirm. Empty/loading/stale/error states explicitly design.

---

## 6. Build Order

1. **Access foundation:** admin auth, roles, tenant isolation, audit_logs
2. **Read-only ops:** overview, shops directory, guest/funnel views, scoped records, backup visibility
3. **Credits + referrals:** reconciliation views + top-up (live data se turant useful — naya client code nahi chahiye)
4. **Diagnostics:** app-side SMS/telemetry reporting → SMS event dashboard
5. **Support:** tickets + permission-based diagnostics
6. **Plans (P1):** `plans`/`subscriptions` tables → admin CRUD → app client (`CreditsExhaustedModal` API-driven) → (alag step) gateway
7. **P1 ops:** releases, announcements, reports, security view
8. **P2 growth:** billing reconciliation, multi-shop staff, gateway SMS

**Dependency note:** SMS event dashboard + version adoption se pehle app-side reporting banana padega. Plans CRUD gateway ke bina bhi chal sakta hai (manual assign). Subscription billing MVP ki dependency nahi.

---

## 7. MVP Acceptance Checklist

- [ ] Normal shop user admin UI **aur admin APIs** access nahi kar sakta
- [ ] Support role unauthorized shop/customer data, exports, mutations access nahi kar sakta
- [ ] ID change karke doosri shop ka data read/write — negative tests pass
- [ ] Suspension existing sessions par bhi effective; data delete nahi hota
- [ ] Dashboard metrics ki definition, source, freshness clear; missing = Unknown
- [ ] Credits: balance/consumed/exhausted counts live `sms_credits` se reconcile hote hain
- [ ] Referral bonuses audit trail me hain
- [ ] SMS statuses (Sent/Delivered/Failed/Unknown) distinguish; blind retry nahi
- [ ] Logs/exports me secrets/PII leak nahi
- [ ] Admin actions + sensitive access ka audit available, append-only
- [ ] Backup restore test hua, owner documented
- [ ] Admin pages/config/secrets **APK/static export me ship nahi hote** (`build-apk.js` boundary)
- [ ] **Plans admin-created hain — app me koi hardcoded price nahi**

---

## 8. Final Recommendation

Pehla panel: **secure admin access + shops directory (guest/funnel flags) + read-only dashboard + credit/referral reconciliation + support + audit**. Ye sab **live code** se seedha map hote hain (zero new client code). Uske baad telemetry + SMS event dashboard, phir **Plans CRUD** (hardcoded modal hata ke), phir gateway (jab paid model confirm ho).

Shops ki pisai sales aur Chakki Mitra ki platform revenue alag cheezein — dashboard par kabhi mix mat karo.

---
*🌾 Chakki Mitra — Har pisai ka hisaab, har grahak ka vishwaas.*
