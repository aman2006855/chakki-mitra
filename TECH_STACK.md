# TECH_STACK.md — Technologies

## 1. Frontend

| Tech | Version | Why |
|---|---|---|
| Next.js (App Router) | 16.2.6 | One codebase for web + static APK export |
| React | 19.2.6 | Required by Next 16 |
| Tailwind CSS | 4.1.17 (+ `@tailwindcss/postcss` 4.1.17) | Utility-first, Hindi mobile UI is fast to build |
| lucide-react | ^1.47.0 | Icons (no emoji-image dependency) |
| recharts | ^3.10.1 | Reports charts |
| Capacitor core/cli/android | 6.2.0 | Static WebView wrapper for APK |
| @capacitor/app | 6.0.3 (pinned) | Back-button + exitApp |
| @capacitor/browser | 6.0.6 (pinned) | External links (WhatsApp) |

Pinned Capacitor plugins WHY: minor bumps broke the native bridge before; pin for reproducible APKs.

## 2. Backend

| Tech | Version | Why |
|---|---|---|
| Node.js | 22 (CI) | Next 16 requirement |
| Next.js API routes | 16.2.6 | Zero extra server; deploys with web |
| Drizzle ORM | 0.45.2 / drizzle-kit 0.31.10 | Type-safe SQL, lightweight vs Prisma |
| pg | 8.20.0 (+ @types/pg) | Postgres driver |
| Custom JWT (crypto HMAC-SHA256) | Node built-in | No auth library needed for simple Bearer tokens |

## 3. Database

| Tech | Why |
|---|---|
| PostgreSQL (Supabase) | Managed, relational ledger fits SQL; `DATABASE_URL` env |
| No Redis | Client-side `localStorage` cache is enough at this scale |
| No search engine | Search is simple name/phone substring filter in memory |

## 4. DevOps & Infra

| Tech | Why |
|---|---|
| Vercel | Native Next.js hosting for web + API |
| GitHub Actions (`build-android.yml`) | Tag-triggered (`v*`) APK build, sign, release |
| `scripts/build-apk.js` | Moves `src/app/api` aside so `next build` can static-export |
| Android keystore in GitHub Secrets | Signed release APKs |
| No Docker | Vercel + GH runners need none |

## 5. Third-Party Services

| Service | Use |
|---|---|
| Google OAuth | Login option |
| Android `SmsManager` (via custom plugin) | Free SIM-based SMS receipts |
| WhatsApp `wa.me` links | Reminders + bills, no API key |
| GitHub Releases | APK distribution + `AutoUpdater` source |

## 6. Language & Tooling

TypeScript 5.9.3 (strict), ESLint 9 + `eslint-config-next`, PostCSS 8.5.8.
