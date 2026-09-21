# TESTING_STRATEGY.md — Testing Plan

Status: **no automated tests today**. This is the plan to adopt.

## 1. Pyramid

70% unit (utils/calc), 20% API integration, 10% E2E (critical flows). No component snapshot tests.

## 2. Tools (proposed)

| Layer | Tool |
|---|---|
| Unit | Vitest |
| API | Vitest + Supertest-style `next` route calls |
| E2E | Playwright (web); manual APK checklist for native |

## 3. What To Test First

1. `recalcSummary` math (billed/jama/dues/advance).
2. Phone cleaning (esp. `9123456789` stays intact).
3. JWT sign/verify round-trip + tamper rejection.
4. `offline-db` cache TTL + queue add/remove.
5. `POST /api/transactions` + `DELETE /api/transactions?id=` ownership.
6. SMS text builder (totals formatting).

## 4. Conventions

- `*.test.ts` next to source; mocks for `fetch`/`localStorage`.
- Coverage target: 80% on `src/lib/*` before E2E expansion.
- CI: run `lint + typecheck + unit` on PR; E2E nightly — [TBD].

## 5. Manual APK Checklist (until E2E)

Entry save → SMS received → toast visible → tab switch instant → offline entry queues → online syncs → updater finds new release.
