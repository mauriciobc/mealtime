# Access Confirmation — Foundational Audit Re-baseline

**Date:** 2026-07-02  
**Auditor:** Automated + MCP + live HTTP checks

## Summary

| System | Status | Notes |
|--------|--------|-------|
| **Supabase MCP** (`plugin-supabase-supabase`) | **Partial** | `list_projects` OK; `list_tables` + `get_advisors` OK with `project_id=zzvmyzyszsqptgyqwqwt`; `project-0-mealtime-supabase` timeout / project not found |
| **Netlify MCP** | **Failed** | HTTP 401 on `get-projects` |
| **Netlify REST API** | **OK** | Token from `.env` works; site `meowtime` (`ea7083ac-4ad2-49ed-a2d7-84ca93435c31`) |
| **Staging E2E** | **Partial** | `PLAYWRIGHT_BASE_URL=https://mealtime.app.br`; auth setup times out (login redirect); security tests blocked by setup dependency |
| **`.env.test.local`** | **Missing** | Only `.env.test.example` exists; dotenv loads `.env.local` (8 vars) |
| **CRON_SECRET** | **Not in local `.env`** | Documented in `.env.example`; production v2 deliver returns 401 without secret (expected) |

## Supabase (live)

- **Project:** Mealtime (`zzvmyzyszsqptgyqwqwt`), region `sa-east-1`, status `ACTIVE_HEALTHY`
- **Tables:** 13 public tables; RLS enabled on 11; `_prisma_migrations` and `schema_migrations` without RLS (expected for Prisma)
- **Edge functions (deployed):** 0 in cloud; local Deno sources in `supabase/functions/` (not deployed via MCP)
- **Security advisors:** 8 warnings (OTP expiry, leaked password protection off, Postgres patches, `cleanup_system_tables` SECURITY DEFINER callable by anon, function search_path mutable, pg_net in public)

## Netlify (live)

- **Site name:** `meowtime` (custom domain likely `mealtime.app.br`)
- **Build command:** `npm run build`
- **Publish dir:** `.next` (note: `netlify.toml` does not set `publish`; plugin Next.js handles)
- **Node:** `netlify.toml` specifies `20.19.0` (aligned with `package.json` engines)

## Production vs codebase drift (CRITICAL)

Live checks against `https://mealtime.app.br` (2026-07-02):

| Endpoint | Codebase (local) | Production (live) |
|----------|------------------|-------------------|
| `GET /api/feedings` | **410** Gone | **401** Unauthorized |
| `POST /api/scheduled-notifications/deliver` | **410** Gone | **401** Unauthorized |
| `POST /api/v2/scheduled-notifications/deliver` (no secret) | **401** | **401** |
| `GET /api/test-prisma` | **404** | **404** |
| `GET /api/v2/cats` (no auth) | **401** | **401** |

**Conclusion:** R1 v1→410 hardening is merged locally but **not yet deployed** to production. Deploy is a blocker before production security sign-off.

## E2E blockers

1. Playwright Chromium installed during audit (`npx playwright install chromium`)
2. `auth.setup.ts` fails against production: login does not redirect within 15s
3. `security.spec.ts` depends on `setup` project — cannot run in isolation without config change
4. ~37 `test.skip` occurrences across 17 spec files when `TEST_USER_*` unset

## Recommended actions (post-audit)

1. Create `.env.test.local` with staging credentials or dedicated test user
2. Deploy R1–R2 changes to Netlify production
3. Fix Netlify MCP auth (401) or use REST API via token
4. Link `project-0-mealtime-supabase` MCP to correct project ref
5. Deploy edge functions or document that cron uses Next.js route only
