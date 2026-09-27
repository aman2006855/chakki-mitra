# Changelog

All notable changes to this project are documented here. Format follows Keep a Changelog.

## [Unreleased]

### Added
- Offline-first v2 (WhatsApp-jaisa, bina permission): IndexedDB cache (50MB+, 7-din TTL, stale-while-revalidate), app-start cache warming, sync-done auto-refresh, offline-aware entry toast, pending badge hamesha, 📴 offline banner.
- Write-path hardened: fetch-fail par entry queue (navigator.onLine unreliable), safe body parse — offline/weak-net par "network error" nahi, ⏳ sync pending.
- Truthful online badge: heartbeat se state (fetch fail = offline, success = online) — airplane/weak-net me galat "Online" nahi.
- No-duplicate guarantee: X-Idempotency-Key har write par + server dedupe (transactions/payments/customers) — sync retry par ek entry ek hi baar.
- Pending SMS queue: offline/airplane entry ka SMS save + banner se ek-tap resend (📩 N SMS bhejo).
- Bill/Reminder fix: date me "undefined" aata tha (created_at vs createdAt mismatch) — txDate helper + null-safe formatters.
- Purana SMS disclaimer home + Settings se hataya; naya SIM/subscription note sirf Subscription tab me.
- **Offline stuck fix (root cause):** `X-Idempotency-Key` CORS allow-list me nahi tha → APK har write me preflight fail → "offline" hamesha + sync band. Ab allow-list me hai + preflight 10 min cache.
- **Offline deadlock fix:** ek fail ke baad state kabhi recover nahi hoti thi — ab heartbeat `/api/health` probe (offline: 6s, online: 60s, app focus par turant) + sync retry timer (15s).
- Net wapas aane par queue sync ke saath lists bhi auto-refresh (`cm:sync-done`).
- auth/guest + auth/session routes me CORS/OPTIONS add (APK cross-origin ke liye).
- Typo: "शेष балан्स" (mixed Cyrillic) → "शेष बैलेंस" — customer detail summary me.
- **Duplicate khata = ZERO (3 layer):** client pre-check (`createOrReuseCustomer`) → server POST dedupe (same phone = wahi row wapas) → DB `UNIQUE (user_id, phone_norm)` + purane duplicate auto-merge (kharche usi khate par shift karke, data loss nahi).
- Phone normalization (`normalizePhone`): +91 / 0 / spacing sab ek maane — client aur SQL dono identical (4021 test cases me 0 mismatch).
- **Offline khata ab poora kaam karta hai:** offline me banaya khata turant list me (temp `tmp_` id), entry usse judti hai, sync hone par temp id → asli id remap hoti hai — duplicate nahi, entry kabhi atakti nahi.
- **Time-to-time sync:** queue flush har 15s + list refresh har 60s + app focus/visibility par turant sync + refresh.
- Health endpoint me deploy marker (`rev`) — verify karne ke liye ki naya build live hai.
- Subscription tab (BottomNav me 5th tab): current plan hero + validity progress, total kharch / plans / SMS stats, plan cards with Coming Soon ribbon, buy history, shimmer + stagger animations.
- Settings me 🆘 Support section: Call/WhatsApp buttons (NEXT_PUBLIC_SUPPORT_PHONE se), in-app ticket form + mere tickets list with admin reply.
- New API: GET/POST /api/support (10/hour spam guard) — tickets seedhe admin panel ke Support tab me dikhte hain.
- Support auto-refresh: har 30s silent reload + manual Refresh button + naya admin jawab auto-expand with notice (tab display:none rehta hai isliye interval zaroori).
- Header me 🎧 Support button (full-screen Help & Support sheet, slide-up animation) + admin jawab par red dot badge; Android back button pehle sheet band karta hai.
- Subscription tab me 🔄 Refresh button (silent reload, skeleton flash nahi).
- Settings me 📴 battery-saver guidance card (app auto-close ho to No restrictions + Autostart steps).
- Update crash fix: storage null fallback (NPE), full try/catch, safe listeners; double-tap guard; browser fallback sirf plugin-missing par (transient error par Retry + browser option).
- New APIs: GET /api/plans (active catalog), GET /api/subscriptions (current + history + totalSpent); new `subscriptions` table.
- In-app APK auto-install update: ApkUpdater native plugin (in-app download + progress + auto installer via FileProvider), background periodic check (start + 15min + app-active), native-only (web skip), Browser fallback.
- Update popup + Settings me APK download size display (~MB).
- Update fail hone par explicit "Browser se download karo" fallback button (popup + Settings).
- Supabase Auth Email OTP for signup verification + forgot-password reset (hamara JWT session same; Supabase sirf OTP mailer+verifier, `/api/auth/password/reset`).
- Settings me email change (OTP hamesha NAYI email par, `/api/auth/email/change`).
- "Last used" badge on Email/Google login options.
- scrypt password hashing with transparent legacy migration.
- **Online/Offline flap = ZERO (state machine, sirf proof se state change):**
  - Naya `/api/ping` probe endpoint (koi DB call nahi) — pehle probe `/api/health` par tha jo `SELECT 1` karta tha, isliye DB slow hone par app galat "Offline" bolti thi jabki net bilkul theek tha.
  - Asymmetric hysteresis: 3 lagatar failed probe = Offline, 1 safal probe = turant Online. Ek akeli API call fail ab state nahi badalti — sirf probe kick karti hai (debounced + starvation-free).
  - Browser `online`/`offline` events ab sirf hint hain — state unse seedhe kabhi nahi badalta (WiFi ↔ mobile-data switch par bhi koi flicker nahi).
  - Simulation se verify: 3 sec ki lagatar API failures par bhi state ONLINE rehti hai; asli net loss par ~8-10s me Offline (airplane mode me navigator hint se ~0.3s); recovery max 4s.
- **Offline ka asli reason dikhta hai:** banner/header ab batate hain — `📴 Offline — internet band hai` (no-internet) vs amber `⚠️ Net chalu hai, par server tak nahi pahunch rahe` (server) + header me amber "Server down" chip; dono case me entries queue me save hoti hain.
- **Sync speed: 5-6 min → ~1 min (queue drain fast + server roundtrips kam):**
  - Queue ab **6 op ek saath** bhejta hai (pehle ek-ek karke) + khata (customer create) hamesha entries se pehle — temp id remap usi round me ho jata hai.
  - Har sync op ko **10s timeout** — pehle browser default ~300s (5 min) tha; ek hi latka hua request poora sync rok deta tha (syncingRef block). UI requests ka bhi **20s timeout**.
  - Server reject (4xx/5xx) wale op ko **exponential backoff** (15s → 2 min max) — ek kharaab op baaki queue ko har round me nahi rokta; net wapas aate hi saara backoff reset.
  - Naya op queue hote hi **~1.2s me turant sync** (`cm:queue-write` event) — pehle 15s flush intezaar tha.
  - Server per write **5 DB roundtrip → 3**: `isUserActive` SELECT ab 60s cache me + idempotency ki purani-keys **DELETE scan har write par nahi** (ab ghante me ek baar, bina await).
- **Stuck ⏳ badge fix (badge kabhi 0 nahi hota tha):**
  - **Orphan entry self-heal:** entry temp khata (`tmp_...`) par atak sakti thi agar khata ka create op queue se gayab tha ya mapping kabhi bani hi nahi — wo op hamesha `ready:false` rehta tha (⏳1 hamesha, kabhi sync nahi). Ab sync se pehle orphan detect hota hai aur server par phone se create dobara bheja jata hai (dedupe = wahi row wapas, id aate hi entry **usi drain me** khul jati hai).
  - Server **4xx (400/401/404/422...)** = permanent reject → auto-retry band (pehle backoff me bhi har round koshish karte the → badge kabhi khatam nahi hota). Sirf manual Retry.
  - **Banner ab sach dikhata hai:** green `✅ Net wapas! ⏳N sync ho raha hai` (asli me chal raha) vs amber `⚠️ N entry ruki — {server ka error}` + **🔄 Retry** button (backoff/permanent hata kar foran bhejta hai).
  - Storage full par entry ab fake success nahi deti: pehle cache eviction try, warna `❌ सेव नहीं हो पाई` (507) — chup-chaap entry gayab hone se bachav.

- **Stuck ⏳ ka asli poison mila (400 forever):** offline khata edit karne par `PUT /api/customers` me `id: "tmp_x"` jata tha → server `Number("tmp_x")` = NaN → **400 har retry me** → badge kabhi 0 nahi (aapke screenshots wala ⏳1 yahi ho sakta hai). Ab 3 layer guard: (1) offline khate par Edit button hi nahi dikhta — `⏳ sync baaki` pill, (2) `api()` temp-id wala PUT queue hi nahi karta (turant error), (3) v1.0.60 ka amber banner + Retry aise ops dikhata hai.
- Offline khata delete ab phone se hi saaf hota hai (pending record + queued ops) — ghost khata ya orphan entry nahi banti.
- **Settings → ऐप जानकारी me Sync status:** `✅ सब sync` / `⏳N sync ho raha` / `⚠️N ruki — Retry` + server ka error text — ab ek screenshot me poori diagnosis (version + wajah) milegi.

- **Purana poison op auto-clear (`purgeDeadOps`):** queue me jo op server par KABHI nahi chal sakta wo sync shuru hote hi hat jata hai — `PUT /api/customers` jisme id integer nahi (tmp_/missing → hamesha 400) aur `DELETE /api/transactions?id=<tmp_/NaN>` (hamesha 404). Data loss nahi — ye op server par kabhi accept hi nahi hote the. Purana atka ⏳ badge isi se khud clear hoga.

- **Stuck-1 ka aakhri root cause: `removePendingOp` me try/catch hi NAHI tha.** Phone storage full hote hi entry server par pahunchne ke baad bhi phone se hat-ti nahi thi — error kahin record nahi hota tha (attempts=0, stuck=0), isliye banner hamesha green `sync ho raha hai` dikhata tha. Proof: v1.0.62 + Settings `stuck=0` phir bhi badge 1.
- **Sab localStorage writes ab `safeSetItem` se:** full hone par sirf cache (dikhawa data) hata kar jagah banti hai — queue/khata/SMS kabhi nahi. Sab fail ho to `storageFull` flag → banner/Settings batayenge `phone storage full hai`.
- **Backoff bhi ab stuck me gina jata hai** (pehle green jhooth dikhta tha) + server 5xx/429 lagatar 5 fail = permanent reject (Retry se wapas). Settings sync row me `HTTP status · N try` detail.

- **Stuck-1 ka ASLI root cause mila (Supabase logs se): `COLUMN "PHONE_NORM" DOES NOT EXIST` (42703).** drizzle-kit push build me chalta hai par prod DB tak apply nahi hota tha — isliye: `ensureCustomerUnique()` ke saare queries 42703 me fail (fail-open, chup-chaap) → customer insert 42703 → `findByPhone` ka `SELECT *` bhi 42703 → **500 `Khata save nahi ho paya`, har retry me**. Saath me `idempotency_keys` table bhi missing thi (DDL sirf admin routes par chalta tha) → har write par 42P01 + dedupe protection dead.
- **Runtime schema self-heal (`ensureAppSchema`):** har cold start me ek baar `ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_norm` + `CREATE TABLE IF NOT EXISTS idempotency_keys` (cached, no-op uske baad). `claimIdempotencyKey` + `ensureCustomerUnique` dono isko pehle chalate hain. Deploy ke baad Supabase logs me 42703/42P01 band + atka badge khud clear. APK update ki zaroorat nahi (server-only fix).

## [1.0.24] - 2026-09-21

### Added
- Offline-first layer (`offline-db.ts`, `use-sync-pending.ts`, `SyncProvider`): GET cache, pending-ops queue, auto-sync.
- Online/offline badge with pending count in Header.
- Full documentation set (PROJECT_CONTEXT through CHANGELOG).

### Fixed
- `use client` boundary for sync hook; `SyncProvider` client component.
- KhataBook re-fetch loop + loading flash.

## [1.0.22] - 2026-09-21

### Fixed
- Delete/payment use local state + `recalcSummary`; no full page reload.

## [1.0.21] - 2026-09-21

### Added
- `DELETE /api/transactions?id=` + delete confirmation modal.

## [1.0.20] - 2026-09-21

### Added
- Professional SMS with per-customer totals (atta/dalia kg+₹, billed/paid/dues).

## [1.0.19] - 2026-09-21

### Fixed
- Double-submit guard (`savingRef`); non-blocking SMS.

## [1.0.17] - 2026-09-21

### Fixed
- Toast remount bug (`key={refreshKey}` removed); static `MainActivity.java` plugin registration.

## [1.0.0] - 2026-09-20

### Added
- Initial production release: auth, QuickEntry, KhataBook, payments, SMS plugin, WhatsApp share, APK CI.
