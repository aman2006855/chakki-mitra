# Changelog

All notable changes to this project are documented here. Format follows Keep a Changelog.

## [Unreleased]

### Added
- Subscription tab (BottomNav me 5th tab): current plan hero + validity progress, total kharch / plans / SMS stats, plan cards with Coming Soon ribbon, buy history, shimmer + stagger animations.
- Settings me 🆘 Support section: Call/WhatsApp buttons (NEXT_PUBLIC_SUPPORT_PHONE se), in-app ticket form + mere tickets list with admin reply.
- New API: GET/POST /api/support (10/hour spam guard) — tickets seedhe admin panel ke Support tab me dikhte hain.
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
