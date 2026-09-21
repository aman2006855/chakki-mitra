# USER_FLOWS.md — User Journeys

Personas: **Owner** (shop keeper, Hindi, Android), **Customer** (receives SMS/WhatsApp), **Guest** (tries app before registering).

## 1. Onboarding / Registration

```mermaid
flowchart TD
    A[Open app] --> B{Has token?}
    B -- No --> C[/login]
    C --> D[Google / Email / Guest]
    D --> E{isRegistered?}
    E -- No --> F[/register: shop name, phone, rates]
    F --> G[PUT /api/settings]
    G --> H[Home]
    B -- Yes --> E
```

Edge: token present but API offline → settings fall back to `localStorage`.

## 2. Core Flow: Quick Entry + SMS

1. Owner opens Home → selects product (atta/dalia) → picks customer (search) → enters weight → selects cash/credit → Save.
2. `POST /api/transactions` → success toast → form resets.
3. Native only: fetch `/api/customers/detail?id=` → build summary SMS (atta kg/₹, dalia kg/₹, total, paid, dues) → `BackgroundSms.sendSms`.
4. Success → "SMS भेजा गया!"; failure → error toast (5s).
5. Offline → write queued (`cm_pending_ops`), success toast still shows; syncs later.

Edge: new customer saved but list not refreshed → SMS skipped silently (known gap).

## 3. Khata (Ledger) Flow

Khata tab → search customer → open `CustomerDetail` → tabs: Bills / Pisai / Payments.
- Payment: modal → amount + type → `POST /api/payments` → local list prepend + `recalcSummary` (no page reload).
- Delete entry: trash icon → warning modal ("वापस नहीं हो सकती") → `DELETE /api/transactions?id=` → local remove + recalc.
- WhatsApp reminder: summary message via `wa.me`. Bill share: itemized bill via `wa.me`.

## 4. Reports Flow

Reports tab → `GET /api/reports` → charts (sales, cash vs credit). Offline → cached data or empty state.

## 5. Settings Flow

Edit shop/phone/rates → Save → `PUT /api/settings` (checks `res.ok`) → toast. Backup → downloads JSON of customers+transactions+payments+settings.

## 6. Update Flow (APK)

`AutoUpdater` on mount → GitHub Releases API → compare version → if newer, show banner → download `app-release.apk` (prefers asset with "release") → install prompt (`REQUEST_INSTALL_PACKAGES`).

## 7. Login/Logout

Logout clears `chakki_mitra_token` → redirects to `/login`. No server-side session invalidation (JWT is stateless, no expiry).
