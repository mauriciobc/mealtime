# MealTime — Current Engineering Status

**Last updated:** 2026-07-02 (post remediation R3–R6)  
**Source of truth:** [FOUNDATIONAL-AUDIT-2026-MASTER.md](../reports/FOUNDATIONAL-AUDIT-2026-MASTER.md)

## Completed

- **R1–R2:** v1 spoofable → 410; CI lint/typecheck/build; test-prisma removed
- **R3–R6:** Frontend migrated to `/api/v2/*`; all v1 routes return 410; auth on feedings/cats & schedules blocked; rate limit on `/api/auth/mobile*`; Vitest; E2E staging
- **R7 (in progress):** Zero v1/`X-User-ID` leaks in active frontend hooks — household page, weight page, milestone archive, settings hook

## Next (R8)

- Notification event-driven tests (`docs/todos/notifications-cron-todo.md`)
- Reduce E2E `test.skip` to <5
- Apply Supabase `cleanup_system_tables` migration on remote
- Docs reconciliation (README, INDEX, CONTRIBUTING)

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
