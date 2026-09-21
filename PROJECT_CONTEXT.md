# PROJECT_CONTEXT.md — Master Brain File

> Single source of truth for AI agents working on this repo.
> Read this file first in every new chat, then load only the 2-3 topic files you need.

## 1. Project Overview

**Chakki Mitra** is a digital ledger + billing app for flour-mill (atta chakki) shop owners. It runs as a Next.js web app on Vercel and as a 100% static Android APK built with Capacitor. The APK bundles only the frontend; all API calls go cross-origin to the Vercel backend.

## 2. Target Users

- Flour-mill shop owners (single-user per shop, Hindi-speaking, mobile-first).
- Their customers (indirectly, via SMS receipts and WhatsApp reminders/bills).

## 3. Core Problem

Shop owners track grinding orders (atta/dalia, weight, rate, cash/credit) and customer dues in paper notebooks. This causes lost records, forgotten dues, and no customer communication.

## 4. Key Goals

- Fast one-screen entry: customer + weight + payment mode in seconds.
- Accurate per-customer ledger (billed, paid, advance, pending dues).
- Automatic SMS receipt after every entry (Android SIM, no server cost).
- WhatsApp reminder + itemized bill sharing.
- Offline-first: app works without internet, syncs when back online.
- Auto-update inside the APK via GitHub Releases.

## 5. Current Phase

Production. Web is live at `https://chakki-mitra.vercel.app`. APK is distributed via GitHub Releases (`v*` tags trigger the build).

## 6. What's Done

- JWT auth (email login, Google OAuth, guest) with `localStorage` token.
- QuickEntry: atta/dalia entry with rates from settings.
- KhataBook: customer list with dues, customer detail with transactions/payments tabs.
- Payments: advance / dues_payment / partial_payment.
- Transaction delete with confirmation modal.
- Background SMS plugin (custom Capacitor plugin, `SmsManager`, Hindi Unicode split).
- WhatsApp reminder (summary) + full bill share.
- Pull-to-refresh, bottom tabs, back-button handling, pinch-zoom disabled.
- Offline-first layer: GET cache, pending-ops queue, auto-sync, online/offline badge in Header.
- In-app updater (`AutoUpdater.tsx`) pulling APK from GitHub Releases.
- CI: tag-triggered signed release + debug APK build.

## 7. What's Pending / Known Gaps

- No true background service: SMS fires only while the app is open during save.
- SMS delivery status is not tracked (request handed to `SmsManager` = reported success).
- No automated tests.
- `test_table` in DB schema is leftover, unused.
- `JWT_SECRET` must be set on Vercel for production signing.
- No staging environment; `main` deploys straight to production.

## 8. Critical Constraints

- No heavy local commands: developer machine is low-storage Termux. Prefer file edits + `git push`; CI does builds.
- `package-lock.json` is NOT committed; CI generates it fresh.
- APK must stay fully static (`output: "export"` via `NEXT_STATIC_EXPORT=1`, API routes moved aside by `scripts/build-apk.js`).
- Capacitor pinned: CLI 6.2.0, `@capacitor/app@6.0.3`, `@capacitor/browser@6.0.6`.

## 9. Key Decisions Made

| Decision | Reason |
|---|---|
| Static APK + remote Vercel API | One backend to maintain; APK stays small; no on-device DB to migrate |
| Custom SMS plugin, not npm package | Full control over Hindi Unicode splitting + phone cleaning; zero dependency |
| `registerPlugin()` via static `MainActivity.java` in repo | `sed` patching in CI was fragile; static file copy is deterministic |
| JWT in `localStorage` (`chakki_mitra_token`) | Works in both web and Capacitor WebView without cookie issues |
| CORS open (`*`) on API routes | APK origin is `capacitor://`; allowlist would break native builds |
| Tab content kept mounted (`display:none`) | Prevents reload flash + preserves form state on tab switch |
| Local recalculation after delete/payment | Avoids full `fetchDetail()` + parent re-render (no page flash) |

## 10. Glossary

- **Khata**: customer ledger.
- **Jama**: money received from customer.
- **Bakaya / Dues**: pending amount customer owes.
- **Advance**: prepaid credit.
- **Pisai**: a grinding transaction (atta or dalia, weight × rate).
- **Pending op**: a write (POST/PUT/DELETE) queued locally while offline.

## 11. Reference Files Map

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | System design + data flow |
| `TECH_STACK.md` | Versions + why each tech |
| `DATABASE_SCHEMA.md` | Tables, enums, relations |
| `API_SPEC.md` | Endpoints, auth, formats |
| `FILE_STRUCTURE.md` | Folder map |
| `USER_FLOWS.md` | User journeys |
| `UI_UX_GUIDELINES.md` | Design system |
| `AUTH_FLOW.md` | Login/session/RBAC |
| `STATE_MANAGEMENT.md` | Client/server/offline state |
| `CODING_STANDARDS.md` | Code rules |
| `ENVIRONMENT_SETUP.md` | Dev setup |
| `DEPLOYMENT.md` | Vercel + APK release |
| `FEATURE_BREAKDOWN.md` | Features with priority |
| `TESTING_STRATEGY.md` | Testing plan |
| `ERROR_HANDLING.md` | Error patterns |
| `CHANGELOG.md` | Change log |
