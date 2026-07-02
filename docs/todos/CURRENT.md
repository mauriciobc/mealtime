# MealTime — Current Engineering Status

**Last updated:** 2026-07-02 (post remediation R3–R6)  
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

## Next (R9)

## Deploy (Fase 0)

Push `main` → Netlify auto-deploy → verify:

```bash
npm run smoke:prod
```

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
