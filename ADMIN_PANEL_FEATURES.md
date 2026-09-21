diff --git a/ADMIN_PANEL_FEATURES.md b/ADMIN_PANEL_FEATURES.md
new file mode 100644
index 0000000..eff44d3
--- /dev/null
+++ b/ADMIN_PANEL_FEATURES.md
@@ -0,0 +1,426 @@
+# Chakki Mitra — Admin Panel Feature Plan
+
+**Document type:** Product planning / feature requirements  
+**Date:** 21 September 2026  
+**Status:** Proposed — is document se koi feature implement nahi hota.
+
+> **Assumption:** Yeh panel app owner / platform admin ke liye hai, jo Chakki Mitra use karne wali sabhi shops ko manage karega. Chakki owner ke daily kaam — entry, customer, khata, payment aur reports — existing app mein hi rahenge.
+>
+> **Recommendation:** Pehle secure, read-only operations panel banao. Uske baad SMS diagnostics, support aur release management add karo. Subscription billing aur advanced automation tabhi banao jab unki business need ho.
+
+---
+
+## 1. Admin panel ka main purpose
+
+Admin ko in sawalon ka answer milna chahiye:
+
+1. Kitni shops registered hain aur kitni actually app use kar rahi hain?
+2. Kis shop ko login, entry-save, SMS ya app-update ki problem aa rahi hai?
+3. Problem kis app version/device par aa rahi hai aur kya error report hua?
+4. Kaunsa support request pending hai aur usko kaun handle kar raha hai?
+5. Kya koi suspicious login, unauthorized access ya risky admin action hua?
+6. Naya APK safely release kaise karna hai?
+7. Agar paid plans launch hon, to platform ki actual subscription collection kitni hai?
+
+**Important:** Shops ki pisai sales aur Chakki Mitra ki platform revenue alag cheezein hain. Dono ko dashboard par mix nahi karna hai.
+
+## 2. Existing app se connection
+
+Available checkout mein in features ka base dikhta hai:
+
+| Existing area | Admin panel mein possible use |
+| --- | --- |
+| Users aur shop profile | Shop directory, registration status, support lookup |
+| Customers | Customer count; authorized, scoped support view |
+| Atta/dalia transactions | Usage analytics aur read-only entry history |
+| Cash/credit, dues payments aur advance | Shop-level ledger troubleshooting |
+| Android SMS plugin | SMS health aur device diagnostics, **new telemetry ke baad** |
+| APK build / update flow | Release history aur version adoption, **new version reporting ke baad** |
+
+Relevant references: [DB schema](src/db/schema.ts), [API routes](src/app/api), [SMS bridge](src/plugins/background-sms.ts), [APK workflow](.github/workflows/build-android.yml).
+
+**Planning boundary:** Current schema mein separate shops, admin roles, device heartbeat, SMS-event history, support tickets aur subscriptions ke models nahi dikhte. Neeche diye gaye modules proposed additions hain; inhe already available nahi maana gaya hai. Yeh previous SMS/toast fixes ka re-audit nahi hai.
+
+## 3. Priority overview
+
+- **P0 — MVP:** Pehli useful aur safe admin release ke liye.
+- **P1 — Next:** MVP stable hone ke baad operations improve karne ke liye.
+- **P2 — Optional:** Business grow hone par; first release ko block na karein.
+
+| Module | Priority | Primary benefit |
+| --- | --- | --- |
+| Secure admin login, roles, audit | P0 | Unauthorized access aur misuse rokna |
+| Overview dashboard | P0 | App usage aur current issues ka summary |
+| Shops / users directory | P0 | Shop identify aur account status manage karna |
+| Scoped read-only records | P0 | Customer/transaction complaints investigate karna |
+| Basic SMS + device health | P0 | SMS failure ka actual reason samajhna |
+| Basic support tickets | P0 | Complaints ko track aur resolve karna |
+| API health + backup visibility | P0 | Outage aur recovery readiness dekhna |
+| APK releases / version adoption | P1 | Safe updates aur problematic build identify karna |
+| Announcements / feature flags | P1 | Controlled communication aur rollout |
+| Advanced reports / exports | P1 | Usage trends aur authorized reporting |
+| Advanced diagnostics / toast telemetry | P1 | UI problems ko reproduce karna |
+| Subscription plans / platform billing | P2 | Monetization, agar paid app banana ho |
+| Multi-shop staff, gateway SMS | P2 | Future scale; separate implementation scope |
+
+---
+
+## 4. Secure login, roles aur permissions — P0
+
+### Required features
+
+- Separate admin login; normal shop login se admin access automatically na mile.
+- Admins ke liye MFA / two-step verification aur recovery process.
+- Invite-only admin creation; public admin signup nahi.
+- Session expiry, logout-all-devices aur compromised session revoke karna.
+- Login rate limits, failed-login alerts aur last-login history.
+- Sensitive actions par re-authentication aur reason mandatory.
+- Server-side role checks on **every admin API**; menu/button hide karna security nahi hai.
+
+### Suggested roles
+
+| Role | Access |
+| --- | --- |
+| Super Admin | Admin accounts, shop status, critical settings, approved sensitive actions |
+| Support Admin | Masked shop lookup, authorized read-only diagnostics, assigned support tickets |
+| Operations Admin — P1 | App health, approved announcements, releases aur feature flags |
+| Billing Admin — P2 | Platform subscriptions/invoices; shop customer-ledger edits nahi |
+
+MVP mein **Super Admin + Support Admin** enough hain. Kisi bhi role ko passwords, tokens, signing keys ya database credentials UI mein nahi dikhne chahiye.
+
+## 5. Overview dashboard — P0
+
+### Recommended cards
+
+- Total shops/accounts; completed vs incomplete registration.
+- New registrations: today, last 7 days, last 30 days.
+- Active shops in selected period.
+- Transactions created aur atta/dalia weight totals, jahan aggregation authorized ho.
+- SMS attempts, send-confirmed, failed, pending/unknown aur skipped counts.
+- Open support tickets aur high-priority unresolved issues.
+- API health aur last successful backup timestamp.
+
+### Filters aur metric definitions
+
+- Date range, shop/account, registration status; version filter telemetry add hone ke baad.
+- **Active shop:** selected period mein kam-se-kam ek successful business action. Sirf account exist karna activity nahi hai.
+- **Last seen:** last received app heartbeat/event. Yeh guaranteed real-time online status nahi hai.
+- **SMS send success:** confirmed send result; sirf plugin call resolve hona success nahi.
+- Har card par last-refreshed time aur metric definition available ho.
+- Missing telemetry ko `Unknown / Not reported` dikhao, zero failures ya healthy nahi.
+- DB timestamps UTC mein; user-facing reports default `Asia/Kolkata` mein.
+
+## 6. Shops / users management — P0
+
+### Directory
+
+- Search by shop name, owner name, account ID, email aur authorized phone lookup.
+- Registration status, created date aur last activity.
+- Customer count, entry count aur latest reported app version.
+- Pagination, sorting aur date/status filters.
+- Phone/email masked by default; full detail reveal permission-based aur audited ho.
+
+### Shop detail page
+
+Suggested tabs: **Overview · Account · Records · SMS & Devices · Support · Activity**.
+
+- Owner/shop profile, shop phone, atta/dalia rates — default read-only.
+- Registration incomplete hone par onboarding support notes.
+- Reported devices, app version aur diagnostics freshness.
+- Assigned tickets aur previous support interactions.
+
+### Account actions
+
+- Activate / suspend / reactivate with reason and audit entry.
+- Suspension ka clear scope: shop API access block, active sessions revoke, app ko understandable message.
+- Suspension se customer records, transactions ya payments delete na hon.
+- Suspended owner ke liye authorized support/data-retrieval process available rahe.
+- Account deletion alag approved workflow ho; dependency preview aur retention policy required.
+
+**Scope note:** MVP current owner-account ko shop scope maan sakta hai. Multiple shops per owner chahiye to explicit `shops` aur membership model add karna hoga; current user count ko bina definition ke shop count na bolo.
+
+## 7. Customer / transaction / ledger inspection — P0
+
+- Har view ek explicit shop/account scope mein open ho.
+- Customer search, transaction date/product/payment-mode filter aur read-only history.
+- Atta/dalia weight, rate, billed amount, cash/credit aur linked payments.
+- Pending dues aur advance ko separate labels mein dikhana.
+- Support access least-privilege, reason-based aur zarurat padne par time-limited ho.
+- Unnecessary customer phone, address ya notes platform-wide list mein expose na hon.
+
+### Financial safety rules
+
+- MVP admin panel se transaction/payment edit ya delete **nahi**.
+- Future correction ke liye adjustment/reversal workflow; original history preserve ho.
+- Customer payment ko shop ki nayi sale ya platform revenue dobara count na karein.
+- Advance collection ko automatic earned revenue na maanein.
+- Due date model ke bina outstanding amount ko automatically `Overdue` label na dein.
+- Shops ke customer records ka cross-tenant access server-side ownership checks se restricted ho.
+
+## 8. SMS monitoring aur diagnostics — P0
+
+Yeh Chakki Mitra ke liye sabse useful admin modules mein se ek hoga.
+
+### 8.1 SMS event list
+
+Har attempt ke liye minimum information:
+
+- Shop/account ID, linked transaction ID aur unique logical-message ID.
+- Unique attempt/event ID for duplicate-event detection.
+- Masked recipient number; full message body default logs mein nahi.
+- Device/app version, template version, timestamps aur report source.
+- Expected part count; available per-part send/delivery result.
+- Normalized error code, retry count aur latest known outcome.
+
+### 8.2 Status ka correct meaning
+
+| Status | Meaning |
+| --- | --- |
+| Created | Receipt/SMS intent create hua, abhi send prove nahi hua |
+| Queued | Device/app queue mein pending |
+| Submitted | Android/provider ko request di gayi; sending confirmed nahi |
+| Sent | Available send callback se success confirmed |
+| Delivered | Delivery receipt actually mili, agar supported ho |
+| Failed | Explicit send failure report hui |
+| Partial | Multipart message ke kuch parts success aur kuch failed/unknown |
+| Skipped | Unsupported platform, invalid/missing data ya policy ke kaaran attempt nahi hua |
+| Unknown | Final confirmation nahi aayi; ise success ya definite failure na maanein |
+
+**Sent aur Delivered ko ek status mat banao.** Multipart message ko poori tarah sent tabhi mark karo jab required parts ka send result successful ho. Late, repeated aur out-of-order events reconcile hone chahiye.
+
+### 8.3 Useful diagnostics
+
+- Last reported SMS permission state.
+- Plugin available / unavailable / not reported.
+- Default SMS SIM available / unknown, jitni information app legitimately report kar sake.
+- Invalid-number, permission-denied, no-service aur send-failure categories.
+- Failure breakdown by app version, Android version aur shop.
+- Device report ka timestamp; stale report ko live state ki tarah na dikhayein.
+- Failure spikes ke alerts; threshold configurable ho aur minimum sample size use ho.
+
+### 8.4 Device SIM vs server gateway — important boundary
+
+Current flow device-side Android SMS plugin par based hai. **Sirf admin website bana dene se kisi phone ki SIM se remotely SMS send nahi hoga.**
+
+Is module ke liye app ko native results collect karke authenticated backend par sync karne honge. Offline reports later sync hon; app killed/offline hone par panel device ko reachable assume na kare.
+
+- Remote retry ke liye separate command delivery, device acknowledgment aur expiry design chahiye — MVP mein nahi.
+- Device permission remotely grant nahi ki ja sakti; user ko device par consent dena hoga.
+- `Unknown` result par automatic retry nahi: pehla SMS send ho chuka ho sakta hai.
+- Retry future mein ho to idempotency, explicit confirmation, cost warning aur audit required.
+- SIM balance / SMS cost reliably available na ho to fabricated balance/cost card na dikhayein.
+- Server gateway future option hai: provider integration, consent, billing aur applicable messaging requirements ka separate review hoga.
+- Transactional receipt SMS aur promotional bulk SMS ko alag scope rakhein; customer data marketing ke liye default available na ho.
+
+## 9. App health, errors aur toast diagnostics — P0 / P1
+
+### Basic health — P0
+
+- API availability, error rate, response latency aur database connectivity.
+- Error grouping by route, app version, environment aur correlation ID.
+- Affected shops ki count; production aur test data separate.
+- Sanitized diagnostics: tokens, passwords, full phone numbers aur SMS bodies logs mein nahi.
+- App event uploads authenticated, size-limited aur rate-limited hon.
+
+### UI / toast diagnostics — P1
+
+Optional, sampled telemetry:
+
+- Action attempted → API outcome → notification requested → component rendered/dismissed.
+- Screen/tab, notification type, duration aur dismissal reason.
+- Unmount/navigation ke baad notification drop hone ki diagnostic information.
+- Ticket ke saath user-authorized diagnostic bundle attach karna.
+
+**Boundary:** `Rendered` event user ne message dekha, iska proof nahi hai. Panel se toast ka real appearance verify nahi hoga; small-screen, keyboard-open, scrolled-page aur tab-switch tests bhi required rahenge.
+
+## 10. Support / complaint management — P0
+
+- Ticket create, assign, reply, close aur reopen.
+- Categories: login, registration, entry-save, khata/payment, SMS, APK update, backup, other.
+- Statuses: New → In progress → Waiting for user → Resolved → Closed.
+- Priority, owner, created time, last reply aur resolution note.
+- User ki permission se shop ID, app version aur selected diagnostics auto-attach.
+- Screenshots optional; upload size/type validation aur private storage.
+- Internal notes ko user-visible replies se clearly separate rakhein.
+- Support admin ko full customer data ya unrestricted impersonation automatically na mile.
+- P1: response-time targets, canned replies, duplicate-ticket linking aur escalation.
+
+## 11. APK releases aur app-version management — P1
+
+- Released version name, numeric version code, release date, changelog aur APK link.
+- Package ID, signing identity aur artifact checksum verification.
+- Reported installations/activity ka version-wise distribution; unreported devices separately.
+- Beta/stable channels aur staged rollout, jab app update flow support kare.
+- Recommended version vs minimum supported version.
+- Minimum-version restriction carefully apply ho: clear reason, working download path aur recovery/support option.
+- Har release ka numeric version code strictly increase ho; same-day releases bhi unique hon.
+- Broken release par rollout halt aur corrected, higher-version build ka recovery flow.
+- Silent install ya older APK downgrade ko guaranteed rollback mechanism na maanein.
+- Release publish / minimum-version change ke liye approval, re-authentication aur audit.
+- Signing credentials admin browser mein kabhi expose na hon.
+
+Existing GitHub build/release flow ko reuse karna preferable hai; panel ko separate APK compiler banane ki zarurat nahi.
+
+## 12. Announcements, configuration aur feature flags — P1
+
+- In-app banners: maintenance, new feature, important issue, support notice.
+- Hindi-first copy, optional English; start/end time aur preview.
+- Target all shops / selected shops / compatible app versions.
+- Frequency caps, dismiss behavior aur emergency removal.
+- SMS template versions with allowed placeholders, preview aur character/segment estimate.
+- Placeholder example: `{shop_name}`, `{product}`, `{weight}`, `{amount}`, `{payment_mode}`.
+- Staged feature flags aur safe defaults if configuration cannot load.
+- Versioned config, audit trail aur rollback of config changes.
+
+**Safety:** Permission prompt ko bypass, arbitrary code execute ya shop ki pricing/billing silently change karne wala remote control nahi. Shop-specific rates owner-controlled rahen. New remote configuration tabhi effective hogi jab app mein uska client-side support implement ho.
+
+## 13. Reports aur exports — P1
+
+- Registration/activation trend, active-shop retention aur feature usage.
+- Version adoption, SMS outcome trend, support volume aur resolution time.
+- Shop-level ledger summary only for explicitly authorized use.
+- Platform-wide aggregate reports mein unnecessary personal data avoid karein.
+- CSV export with date/shop scope, permission check aur export audit.
+- Large exports background jobs mein; time-limited authorized download links.
+- Exported cells ko spreadsheet formula injection se protect karna.
+- Har report par filters, timezone, generated-at time aur metric definitions.
+
+## 14. Backups, privacy aur audit — P0 foundation / P1 tooling
+
+### Backup and recovery
+
+- Managed backup enabled ho; panel par latest success/failure aur retention visible ho.
+- Backup restore ka staging drill aur last-tested date track ho.
+- Failed backup alerts aur accountable owner.
+- Recovery targets define karein: kitna data loss tolerable hai aur recovery kitni jaldi chahiye.
+- Production restore one-click casual action na ho: approval, current-data backup aur maintenance plan required.
+- Existing account records ke cascade relationships ko deletion/restore design mein account karein.
+
+### Audit trail
+
+Record: actor admin, role, action, target shop/entity, timestamp, reason, outcome, correlation ID aur sanitized before/after values where relevant.
+
+Audit these actions: account suspension, role change, data reveal/export, SMS retry, release/config publish, deletion request aur restore approval.
+
+Audit records append-only/tamper-resistant hon; normal admins unhe edit/delete na kar sakein. Logs mein secrets aur unnecessary customer content na store karein.
+
+### Privacy
+
+- Customer data masked by default; purpose-based, least-privilege access.
+- SMS diagnostics, device events, tickets aur exports ki retention policy define karein.
+- User data access/export/deletion requests ka reviewed workflow.
+- Hard delete se pehle impact preview; applicable retention obligations check karein.
+- Privacy notice mein diagnostic data collection explain ho; extra attachments ke liye user control rahe.
+
+## 15. Subscription / platform billing — P2, only if needed
+
+Agar Chakki Mitra paid service banani hai:
+
+- Plans, trial period, monthly/yearly subscriptions aur explicit feature limits.
+- Subscription state, expiry, grace period, renewals aur cancellation.
+- Payment gateway integration, verified webhooks aur duplicate-event handling.
+- Invoices, refunds aur reconciliation with gateway records.
+- Platform collection vs refund vs recurring revenue ki clear definitions.
+- Expiry par owner ko notice; customer khata/history silently delete ya inaccessible na ho.
+
+**Do not reuse the current `payments` table for subscriptions.** Existing customer dues/advance payments aur app subscription payments alag financial domains hain.
+
+No pricing amount is assumed in this plan. Agar app free rehni hai to poora module skip ho sakta hai.
+
+---
+
+## 16. Suggested navigation
+
+```text
+Overview
+Shops & Users
+  └─ Shop Detail
+      ├─ Overview / Account
+      ├─ Records (authorized read-only)
+      ├─ SMS & Devices
+      ├─ Support
+      └─ Activity
+SMS Health
+App Health
+Support Tickets
+Releases                 [P1]
+Announcements & Flags    [P1]
+Reports & Exports        [P1]
+Backups & Audit
+Admin Team & Security
+Subscriptions            [P2, optional]
+```
+
+UI desktop-first ho, lekin emergency mobile access usable rahe. Global shop scope clearly visible ho; dangerous actions par selected shop/name dobara confirm karvao. Empty, loading, stale-data aur error states explicitly design karo.
+
+## 17. Suggested technical structure
+
+### Deployment boundary
+
+- Admin panel **web-only authenticated application** rahe; Android APK ka part nahi.
+- Existing Next.js + PostgreSQL + Drizzle stack reuse ki ja sakti hai.
+- Prefer separate admin web build/deployment with server-side admin APIs.
+- Agar same codebase use ho, admin/server routes ko Android static export se explicitly separate rakhein.
+- Browser se direct production database ya unrestricted service credentials access nahi.
+- Dedicated `/api/admin/*` endpoints with admin authentication, permissions, pagination aur explicit tenant scope.
+- Customer/device events ke liye separate authenticated ingestion endpoints; client-supplied shop ID ko bina authorization trust na karein.
+
+### Proposed data additions
+
+| Model / data | Purpose | Phase |
+| --- | --- | --- |
+| `admin_accounts`, `admin_sessions` | Admin access, roles/MFA reference, revocation | P0 |
+| Account status + status history | Suspension/reactivation with reasons | P0 |
+| `devices` | Installation ID, version, last reported capability/heartbeat | P0 |
+| `sms_attempts`, `sms_events` | Outcomes, timestamps, deduplication, part status | P0 |
+| `support_tickets`, `ticket_messages` | Complaint lifecycle and replies | P0 |
+| `audit_logs` | Sensitive/admin activity | P0 |
+| Sanitized error/event storage | Correlated diagnostics; DB or observability service | P0/P1 |
+| `app_releases`, `announcements`, `feature_flags` | Versioned operations | P1 |
+| `export_jobs`, `data_requests` | Authorized export/privacy workflows | P1 |
+| `plans`, `subscriptions`, `billing_events` | Separate platform billing | P2 |
+| `shops`, `shop_memberships` | Multiple shops / staff per owner | P2, if needed |
+
+Yeh logical suggestions hain, final migration schema nahi. Sessions, MFA, errors aur backups ke liye managed services bhi use ho sakti hain; har cheez ki custom table banana zaroori nahi.
+
+## 18. Build order aur MVP acceptance checklist
+
+### Recommended build order
+
+1. **Access foundation:** admin auth, MFA, roles, tenant isolation aur audit.
+2. **Read-only operations:** overview, shops, scoped records, health/backup visibility.
+3. **Diagnostics:** native SMS event reporting, offline event sync, basic SMS dashboard.
+4. **Support:** tickets aur permission-based diagnostic linking.
+5. **P1 operations:** releases, announcements, advanced diagnostics aur exports.
+6. **Optional growth:** subscriptions, multi-shop staff aur gateway messaging.
+
+SMS dashboard se pehle app-side result reporting banana dependency hai. Subscription billing core admin MVP ki dependency nahi hai.
+
+### MVP acceptance checklist
+
+- [ ] Normal shop user admin UI **aur admin APIs** access nahi kar sakta.
+- [ ] Support role unauthorized shop/customer details, exports ya mutations access nahi kar sakta.
+- [ ] IDs change karke doosri shop ka data read/write karne ke negative tests pass hain.
+- [ ] Suspension/revocation existing sessions par bhi effective hai.
+- [ ] Dashboard metrics ki definitions aur source/freshness clear hain.
+- [ ] SMS `Submitted`, `Sent`, `Delivered`, `Failed`, `Skipped` aur `Unknown` distinguish hote hain.
+- [ ] Offline, duplicate, partial-multipart aur out-of-order SMS events safely handle hote hain.
+- [ ] Diagnostics dekhne se SMS resend trigger nahi hota; unknown result par blind retry nahi.
+- [ ] Logs/exports mein secrets aur unapproved personal data leak nahi hota.
+- [ ] Admin actions aur sensitive data access ka audit available hai.
+- [ ] API failure par fake success toast nahi; feedback scroll/tab change ke cases mein tested hai.
+- [ ] Backup restore test hua hai aur recovery owner/process documented hai.
+- [ ] Admin pages/config/secrets Android APK/static export mein ship nahi hote.
+
+## 19. Abhi kya nahi banana chahiye
+
+First version ko unnecessary bada na banayein:
+
+- Full ERP, inventory, payroll ya accounting suite.
+- Har shop ke customers ko unrestricted bulk SMS.
+- Arbitrary remote commands / phone control.
+- One-click permanent ledger deletion ya unaudited financial edits.
+- Fake live-device, SIM-balance ya SMS-delivery indicators.
+- Complex subscription/payment flows jab paid model decide hi nahi hua.
+
+**Final recommendation:** Pehla panel secure shop directory + read-only dashboard + SMS/app health + support + audit par focus kare. Isse real problems diagnose hongi, bina customer accounts aur financial records ko unnecessary risk mein daale.
