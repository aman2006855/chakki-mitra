# FEATURE_BREAKDOWN.md — Detailed Features

## MVP (shipped)

### Quick Entry
- **Priority**: P0 · **Complexity**: Medium
- **Story**: As an owner I want to save a grinding entry in seconds so that no sale is missed.
- **Acceptance**: [x] product toggle [x] customer search [x] weight/rate/amount calc [x] cash/credit [x] validation toasts [x] double-submit guard
- **APIs**: `GET/POST /api/transactions`, `GET /api/dashboard`, `GET /api/customers`, `GET /api/customers/detail`
- **Tables**: transactions

### KhataBook + Customer Detail
- **Priority**: P0 · **Complexity**: Medium
- **Story**: As an owner I want per-customer dues at a glance so that I collect on time.
- **Acceptance**: [x] dues-sorted list [x] search [x] add/edit/delete customer [x] transactions/payments tabs [x] local recalc, no reload
- **APIs**: `/api/customers*`, `/api/payments`, `/api/transactions`
- **Tables**: customers, transactions, payments

### Payments (advance/dues/partial)
- **Priority**: P0 · **Complexity**: Low
- **Acceptance**: [x] modal [x] local prepend + recalc [x] toasts
- **APIs**: `POST /api/payments`

### SMS Receipt (native)
- **Priority**: P0 · **Complexity**: High
- **Acceptance**: [x] auto-send after save [x] professional summary (atta/dalia kg+₹, totals, dues) [x] Unicode split [x] permission flow
- **Deps**: custom plugin + `MainActivity` registration + `SEND_SMS`

### WhatsApp Reminder + Bill
- **Priority**: P1 · **Complexity**: Low
- **Acceptance**: [x] reminder with summary [x] itemized bill with dates

### Auth + Registration
- **Priority**: P0 · **Complexity**: Medium
- **Acceptance**: [x] Google/email/guest [x] JWT session [x] register flow [x] offline settings fallback

### Offline-first + Sync
- **Priority**: P0 · **Complexity**: High
- **Acceptance**: [x] GET cache [x] write queue [x] auto-sync [x] online badge + pending count

### AutoUpdater
- **Priority**: P1 · **Complexity**: Medium
- **Acceptance**: [x] release check [x] prefers `app-release.apk` [x] install prompt

## V1.1 (proposed)

- SMS delivery callbacks (sent/delivered status) — Medium
- Customer edit from detail screen — Low
- Paginated transactions (beyond 100) — Low
- Rate limiting + JWT expiry/refresh — Medium
- Drop `test_table` — Low

## V2 (proposed)

- True background SMS queue (WorkManager) — High
- Multi-shop / staff roles — High
- PDF bill + print — Medium
- UPI payment links — Medium
