# FILE_STRUCTURE.md — Folder Map

Naming: components `PascalCase`, lib `kebab-case`, routes `kebab-case`, constants `UPPER_SNAKE`, DB tables `snake_case`.

```text
.
├── capacitor.config.ts          # appId com.chakkimitra.app, webDir out, BackgroundSms
├── next.config.ts               # static export only when NEXT_STATIC_EXPORT=1
├── drizzle.config.ts            # drizzle-kit config (DATABASE_URL)
├── package.json                 # scripts: dev, build, build:apk, db:push, db:studio
├── scripts/
│   └── build-apk.js             # moves src/app/api aside → next build → restores
├── native/
│   ├── android-plugin/com/chakkimitra/plugin/BackgroundSmsPlugin.java
│   └── android/app/.../MainActivity.java   # static copy with registerPlugin()
├── .github/workflows/build-android.yml    # tag (v*) → build → sign → release APK
├── src/
│   ├── app/
│   │   ├── layout.tsx           # metadata, viewport, AuthProvider + SyncProvider
│   │   ├── page.tsx             # protected shell, 4 tabs (all mounted)
│   │   ├── globals.css          # tailwind + scroll/zoom guards
│   │   ├── login/page.tsx       # login screen
│   │   ├── register/page.tsx    # shop registration
│   │   └── api/                 # server only (excluded from APK build)
│   │       ├── auth/email|guest|google/*|session/
│   │       ├── customers/route.ts + detail/route.ts + bills/route.ts
│   │       ├── transactions/route.ts
│   │       ├── payments/route.ts
│   │       ├── dashboard/route.ts  reports/route.ts  settings/route.ts
│   │       └── health/route.ts  debug/cookies/route.ts
│   ├── components/
│   │   ├── QuickEntry.tsx       # entry form + SMS trigger
│   │   ├── KhataBook.tsx        # customer list, hosts CustomerDetail
│   │   ├── CustomerDetail.tsx   # ledger tabs, WhatsApp, payment/delete modals
│   │   ├── BillsList.tsx        # bill cards
│   │   ├── Reports.tsx          # charts
│   │   ├── Settings.tsx         # shop config + backup
│   │   ├── Header.tsx           # shop name + online/offline badge
│   │   ├── BottomNav.tsx        # 4 tabs
│   │   ├── PullToRefresh.tsx    # touch pull + floating pill
│   │   ├── AutoUpdater.tsx      # GitHub Releases APK check/install
│   │   ├── AddCustomer.tsx      # add-customer modal
│   │   └── SyncProvider.tsx     # runs useSyncPending (client)
│   ├── contexts/AuthContext.tsx # JWT session, localStorage token
│   ├── db/
│   │   ├── schema.ts            # users/customers/transactions/payments + enums
│   │   └── index.ts             # drizzle client
│   ├── lib/
│   │   ├── api.ts               # fetch wrapper + offline queue/cache
│   │   ├── offline-db.ts        # localStorage cache + pending ops + online listeners
│   │   ├── use-sync-pending.ts  # replay queue when online (client hook)
│   │   ├── auth.ts              # JWT sign/verify
│   │   ├── cors.ts              # ok()/err()/options()
│   │   ├── config.ts            # API_BASE
│   │   └── capacitor.ts         # isNativePlatform()/getPlatform()
│   └── plugins/background-sms.ts# TS bridge for BackgroundSms plugin
└── docs (this set of .md files, project root)
```

## Responsibilities

- `src/app/api/*`: per-user CRUD, always `getUserIdFromRequest()` first.
- `src/lib/api.ts`: single HTTP entry; handles offline cache/queue.
- `src/components/*`: one feature per file, max ~400 lines; modals inline in owner component.
- `native/*`: source of truth for Android Java; CI copies into generated `android/`.
