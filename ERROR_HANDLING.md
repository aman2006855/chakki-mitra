# ERROR_HANDLING.md — Error Patterns

## 1. Categories

| Category | Example | UI |
|---|---|---|
| Client 4xx | validation, missing id, 404 not-found | error toast, stay on screen |
| Server 5xx | DB fail | error toast |
| Auth 401 | missing/invalid JWT | redirect `/login` |
| Network/offline | fetch fail | queued write + success toast, or cached GET; 503 `{ error: "offline" }` |
| Native | SMS denied/failed | 5s error toast with reason |

## 2. Formats

Server: `{ "error": "<message>" }`. Offline synthetic success: `{ success: true, offline: true, opId }`.

## 3. Frontend Rules

- Always check `res.ok` before success toast (Settings bug taught this).
- `try/catch` every `api()` call; `catch` → error toast, never silent (except `fetchDetail` initial load which logs).
- Toast timers: clear-then-set via ref.
- Loading states only on first mount, never on refresh (avoids flash).

## 4. Logging

`console.error` for caught errors; `Log.d/e` in Java plugin (check via `adb logcat -s BackgroundSms`). No remote logging — [TBD Sentry].

## 5. Message Map

| Situation | Message |
|---|---|
| No customer/weight/mode | `⚠️ ग्राहक चुनें / वजन डालें / पेमेंट मोड चुनें` |
| Save ok | `✅ एंट्री सेव हो गई!` |
| SMS ok/fail | `✅ SMS भेजा गया!` / `⚠️ SMS नहीं भेजा: <reason>` (5s) |
| Offline queued | same success toast (syncs later) |
| Payment ok/fail | `✅ जमा हो गई!` / `❌ जमा नहीं हो पाई` |
| Delete ok/fail | `✅ एंट्री डिलीट हो गई!` / `❌ डिलीट नहीं हो पाई` |
| Network | `❌ नेटवर्क एरर` |
