# ENVIRONMENT_SETUP.md — Dev Setup

## 1. Prerequisites

- Node.js 22, npm, Git.
- PostgreSQL connection string (Supabase).
- (Android APK builds happen in CI; local Android SDK not required.)

## 2. Setup

```bash
git clone https://github.com/aman2006855/chakki-mitra.git
cd chakki-mitra   # or your checkout dir
npm install
cp .env.example .env   # then fill DATABASE_URL, JWT_SECRET
npm run db:push        # drizzle-kit push --force
npm run dev            # http://localhost:3000
```

## 3. Environment Variables

| Variable | Description | Example | Required |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://...` | Yes |
| `JWT_SECRET` | JWT HMAC secret | long random string | Yes (prod) |
| `NEXT_STATIC_EXPORT` | `1` enables static export (APK) | `1` | APK only |
| `NEXT_PUBLIC_API_BASE_URL` | CI build-time API base | `https://chakki-mitra.vercel.app` | CI |

## 4. Scripts

| Script | What |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | `db:push` + `next build` (Vercel) |
| `npm run build:apk` | static export with API routes moved aside |
| `npm run lint` / `typecheck` | `eslint .` / `tsc --noEmit` |
| `npm run db:push` / `db:studio` | push schema / open Drizzle Studio |

## 5. Common Issues

- `drizzle-kit studio` asks for newer `drizzle-orm` → upgrade dep.
- Low-storage machines: skip `npm install` locally; edit + push, let CI build.
- Capacitor `MainActivity` errors → ensure static `MainActivity.java` is copied after `cap sync` (see DEPLOYMENT.md).
