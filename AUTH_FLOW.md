# AUTH_FLOW.md — Authentication & Authorization

## 1. Method & Provider

Custom JWT (HMAC-SHA256, `src/lib/auth.ts`), no expiry (`iat` only). Providers: Google OAuth, email, guest. WHY custom: avoids NextAuth/cookie complexity inside Capacitor WebView.

## 2. Token Strategy

- Access token = JWT `{ userId, name, iat }`, stored in `localStorage` as `chakki_mitra_token`.
- No refresh token. Session ends only on logout (token deleted client-side).
- Server validates per request via `getUserIdFromRequest()` (`Authorization: Bearer`).

## 3. Session Management

`AuthContext` (`src/contexts/AuthContext.tsx`): on mount reads token → decodes `userId/name` from payload → fetches `/api/settings` for `isRegistered/shopName` (falls back to `localStorage` offline) → exposes `{ user, loading, login, logout, saveSession }`.

## 4. RBAC

Single role: shop owner. All data scoped by `userId` in every query. No admin/moderator roles. Route protection: `page.tsx` redirects to `/login` if no user, `/register` if `!isRegistered`.

## 5. Flows

```mermaid
flowchart TD
    L[/login] --> G[Google/Email/Guest]
    G --> CB[Callback issues JWT]
    CB --> S[saveSession: token + user]
    S --> R{isRegistered?}
    R -- No --> REG[/register]
    R -- Yes --> H[Home]
    REG --> PUT[PUT /api/settings]
    PUT --> H
```

- Logout: clear token + `setUser(null)`.
- Forgot/reset password: not implemented — [TBD].

## 6. Security

- `JWT_SECRET` env (fallback dev string — must override on Vercel).
- Timing-safe compare NOT used for HMAC (`!==`) — acceptable risk noted, [TBD hardening].
- CORS `*`; brute-force protection none — [TBD].
- Google OAuth handled server-side; tokens never logged.
