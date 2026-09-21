# API_SPEC.md — API Documentation

- **Base URLs:** dev `http://localhost:3000`, prod `https://chakki-mitra.vercel.app` (`src/lib/config.ts` → `API_BASE`).
- **Auth:** `Authorization: Bearer <JWT>` on every protected route. Unsigned → `401`.
- **Common headers:** `Content-Type: application/json`.
- **Success format:** raw JSON object/array (no envelope).
- **Error format:** `{ "error": "<message>" }` with HTTP status.
- **CORS:** `Access-Control-Allow-Origin: *`, methods `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type, Authorization` (`src/lib/cors.ts`).

## Auth

| Method | Path | Description | Body | Response |
|---|---|---|---|---|
| GET | /api/auth/google/login | Start Google OAuth (redirect) | — | 302 redirect |
| GET | /api/auth/google/callback | OAuth callback → issues JWT | query `code` | `{ token, userId, name, ... }` |
| POST | /api/auth/email | Email login/link | `{ email }` | `{ token, ... }` |
| POST | /api/auth/guest | Guest session | `{}` | `{ token, ... }` |
| GET | /api/auth/session | Validate session | — (Bearer) | `{ userId, name }` |

## Settings

| Method | Path | Description |
|---|---|---|
| GET | /api/settings | Current shop settings (rates, shop name). Auth required. |
| PUT | /api/settings | Update `{ shopName, shopPhone, attaRate, daliaRate }`. Auth required. |

## Customers

| Method | Path | Description |
|---|---|---|
| GET | /api/customers | Own customers list. Auth required. |
| POST | /api/customers | Create `{ name, phone, address }`. Auth required. |
| PUT | /api/customers | Update customer (edit name/phone/address). Auth required. |
| DELETE | /api/customers | Delete customer (cascades ledger). Auth required. |
| GET | /api/customers/detail?id= | Customer + transactions + payments + summary `{ totalBilled, totalJama, pendingDues, totalAdvance, netBalance }`. Auth required. |
| GET | /api/customers/bills | Per-customer bill status list. Auth required. |

## Transactions (pisai entries)

| Method | Path | Description |
|---|---|---|
| GET | /api/transactions | Latest 100 own transactions, desc. Auth required. |
| POST | /api/transactions | Create `{ customerId, productType, weight, rate, amount, paymentMode, notes }`. Auth required. |
| DELETE | /api/transactions?id= | Delete own transaction. Auth required. 404 if not found. |

Example POST:
```json
{ "customerId": 2, "productType": "atta", "weight": "15", "rate": "5", "amount": "75", "paymentMode": "credit", "notes": "" }
```

## Payments

| Method | Path | Description |
|---|---|---|
| GET | /api/payments | Own payments list. Auth required. |
| POST | /api/payments | Create `{ customerId, amount, type, description }`, type ∈ `advance\|dues_payment\|partial_payment`. Auth required. |

## Dashboard / Reports / Health

| Method | Path | Description |
|---|---|---|
| GET | /api/dashboard | Today's sales/cash/outstanding aggregates. Auth required. |
| GET | /api/reports | Aggregated report data for charts. Auth required. |
| GET | /api/health | Unauthenticated health check. |
| GET | /api/debug/cookies | Debug helper. |

## Rate Limit

None currently — [TBD].

## REST Conventions

- Collection paths plural (`/api/customers`, `/api/transactions`, `/api/payments`).
- Single-resource fetch via query `?id=` on `detail`/DELETE (not `/:id` segments) — follow existing style for new endpoints.
