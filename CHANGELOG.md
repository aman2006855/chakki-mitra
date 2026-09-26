# Changelog

All notable changes to this project are documented here. Format follows Keep a Changelog.

## [Unreleased]

### Added
- Offline-first v2 (WhatsApp-jaisa, bina permission): IndexedDB cache (50MB+, 7-din TTL, stale-while-revalidate), app-start cache warming, sync-done auto-refresh, offline-aware entry toast, pending badge hamesha, 📴 offline banner.
- Write-path hardened: fetch-fail par entry queue (navigator.onLine unreliable), safe body parse — offline/weak-net par "network error" nahi, ⏳ sync pending.
- Truthful online badge: heartbeat se state (fetch fail = offline, success = online) — airplane/weak-net me galat "Online" nahi.
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
