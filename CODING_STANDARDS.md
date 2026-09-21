# CODING_STANDARDS.md — Code Rules

Language: TypeScript 5.9 strict. Java (Android plugin) follows existing style.

## 1. Naming

- Variables/functions: `camelCase` (`handleSave`, `weightNum`).
- Components: `PascalCase` (`QuickEntry.tsx`).
- Files: components `PascalCase`, lib `kebab-case` (`offline-db.ts`), routes `kebab-case`.
- Constants: `UPPER_SNAKE` (`CACHE_TTL`, `API_BASE`).
- DB: `snake_case` tables/columns.

## 2. Organization

- One feature per component file (~≤400 lines); modals inline in owner.
- All HTTP via `src/lib/api.ts` — never raw `fetch` in components (offline queue bypass risk).
- Import order: react/next → third-party → `@/` internal → styles.
- Early returns for validation; max nesting 3.

## 3. Patterns (must follow)

- Mutations: `savingRef` guard + `showMessage/showToast` with timer cleanup.
- After mutation: update local arrays + `recalcSummary`; do NOT full `fetchDetail()` + parent refresh.
- `res.ok` must be checked before success toast.
- Numbers from DB are strings (`numeric`) → always `parseFloat()` before math.
- Dates: PG timestamps may lack `T`; normalize with `replace(" ", "T")` before `new Date()`.
- Phone: strip only `+91`/`0` prefix, never bare `91` (valid 10-digit numbers start with 91).

## 4. Commits

Conventional: `feat:`, `fix:`, `docs:`, `chore:`. Small focused commits, push per fix.

## 5. DO / DON'T

- ✅ DO use `router.replace()` for internal nav.
- ✅ DO keep tabs mounted (`display:none`).
- ✅ DO clear toast timers before setting new message.
- ❌ DON'T add `key={...}` to force remounts.
- ❌ DON'T `await` SMS before resetting form.
- ❌ DON'T use `any` for new code (legacy `any` remains, migrate opportunistically).
- ❌ DON'T commit `package-lock.json` (CI generates), secrets, or `.env`.
