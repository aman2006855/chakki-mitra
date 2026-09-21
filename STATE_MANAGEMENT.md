# STATE_MANAGEMENT.md — State Logic

## 1. State Types

| Type | Tool | Location |
|---|---|---|
| Server state | `fetch` via `src/lib/api.ts`, cached in `localStorage` | page/QuickEntry/KhataBook/CustomerDetail |
| Global client | `AuthContext` (user/loading/session) | `src/contexts/AuthContext.tsx` |
| Local | `useState` per component (forms, modals, toasts) | each component |
| URL state | None (tabs are `useState`, not routes) | `page.tsx` |
| Form state | `useState` per field | QuickEntry/Settings/modals |
| Offline | `localStorage` cache + pending queue | `src/lib/offline-db.ts` |

WHY no Redux/Zustand/React-Query: app is small; Context + fetch + localStorage cover it without extra deps.

## 2. Key Shapes

```ts
// page.tsx
settings: { shopName, shopPhone, attaRate, daliaRate }
customers: { id, name, phone, address }[]
tab: "home" | "khata" | "reports" | "settings"

// CustomerDetail summary
summary: { totalBilled, totalJama, pendingDues, totalAdvance, netBalance }

// offline-db pending op
{ id, method, url, body, timestamp }
```

## 3. Data Fetching

- On mount: settings + customers (page), dashboard + recent (QuickEntry), detail (CustomerDetail/CustomerDetail on `customer.id`).
- After mutations: **local recalculation** (`recalcSummary`, array filter/prepend), NOT full refetch — WHY: avoids loading flash.
- Parent `refreshData()` only refreshes settings/customers props.
- Offline: GET served from 5-min TTL cache; writes queued.

## 4. Toast Pattern

`showMessage(msg, duration)` / `showToast(...)` with `useRef` timer; each call clears previous timer first (prevents early-clear bug). Auto-clear 3s (5s for errors). Toasts are sticky-positioned, not native.

## 5. Double-submit Guard

`savingRef` (`useRef<boolean>`) checked synchronously at top of `handleSave`/`handlePayment`; SMS fires via `.then()` (non-blocking) so the guard releases right after API success.

## 6. When To Use What

- New server data needed once → `useEffect` on mount.
- Mutation result → update local arrays + recalc, skip refetch.
- Cross-component session → `AuthContext`.
- Offline-tolerant → go through `api()` (never raw `fetch`).
