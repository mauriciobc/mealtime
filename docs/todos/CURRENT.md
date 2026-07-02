# MealTime — Current Engineering Status

**Last updated:** 2026-07-02 (post remediation R10)  
**Source of truth:** [FOUNDATIONAL-AUDIT-2026-MASTER.md](../reports/FOUNDATIONAL-AUDIT-2026-MASTER.md)

## Completed

- **R1–R2:** v1 spoofable → 410; CI lint/typecheck/build; test-prisma removed
- **R3–R6:** Frontend migrated to `/api/v2/*`; all v1 routes return 410; auth on feedings/cats & schedules blocked; rate limit on `/api/auth/mobile*`; Vitest; E2E staging
- **R7:** Zero v1/`X-User-ID` leaks in active frontend hooks (PR #89)

## Completed (R8)

- **R8.1:** Unit tests for event-driven notification payloads (`lib/notifications/event-payloads.ts`)
- **R8.2:** Wired feedings, household join, and schedule update routes to shared payload builders
- **R8.3:** Fixed `test.skip` guards in `*-complete.spec.ts` (userId → email/password)
- **R8.4:** Applied Supabase migration `revoke_cleanup_system_tables_anon` on remote project

## Completed (R9)

- **R9.1:** Docs — `docs/INDEX.md` → MASTER audit + `CURRENT.md`; `CONTRIBUTING.md` env/auth updates
- **R9.2:** Centralized E2E credential guard in `tests/fixtures/test-fixtures.ts` (removed ~40 duplicate `test.skip` lines)
- **R9.3:** `tests/notifications-triggers.spec.ts` — API E2E for feeding + duplicate warning notifications
- **R9.4:** Removed legacy `X-User-ID` from `tests/helpers/api-helper.ts`; fixed `createFeeding` body (`meal_type`)

## Completed (R10)

- **R10.1:** Middleware-level v1 deprecation in `proxy.ts` (`isDeprecatedV1ApiPath` → 410 before auth)
- **R10.2:** Deprecated remaining active v1 feeding sub-routes (`complete`, `skip`)
- **R10.3:** Post-build smoke test in CI (`scripts/smoke-test-prod.mjs` against local `next start`)
- **R10.4:** Scheduled/workflow_dispatch production smoke (`.github/workflows/smoke-production.yml`)

## Next

- Confirm Netlify production deploy publishes latest `main` (TD-001) — preview already passes smoke; prod was stale
- Optional: un-skip cat detail UI tests when SSR auth context aligns with API-created cats

## Deploy verification

Push `main` → Netlify auto-deploy → verify:

```bash
npm run smoke:prod
```

Expected: **410** on `/api/feedings`, **410** on `/api/feedings/cats`, **401** on `/api/v2/cats`.

## Commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e -- --project=chromium-unauthenticated tests/security.spec.ts
npm run smoke:prod
```

## Deprecated

- `docs/todos/TASKS.md` — use this file instead
