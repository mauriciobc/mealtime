# MealTime — Current Engineering Status

**Last updated:** 2026-07-02 (post remediation R3–R6)  
**Source of truth:** [FOUNDATIONAL-AUDIT-2026-MASTER.md](../reports/FOUNDATIONAL-AUDIT-2026-MASTER.md)

## Completed

- **R1–R2:** v1 spoofable → 410; CI lint/typecheck/build; test-prisma removed
- **R3:** Frontend migrated to `/api/v2/*`; all v1 routes return 410; auth on feedings/cats & schedules blocked; rate limit on `/api/auth/mobile*`
- **R4:** Removed `new-feeding-sheet` duplicate; orphan facades removed
- **R5:** Deleted `.bak` routes; gated `test-*` pages in production; edge function duplicates removed; Supabase migration for `cleanup_system_tables`
- **R6:** Vitest unit tests; `.env.test.local` template; E2E staging expanded; security spec decoupled from auth.setup

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
