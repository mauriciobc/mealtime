# E2E Coverage Matrix — 2026-07-02

**Playwright specs:** 19  
**test.skip occurrences:** ~37 across 17 files  
**Live run:** security.spec blocked by auth.setup timeout on mealtime.app.br

## Spec × Status

| Spec | Skips | Blocker | CI |
|------|-------|---------|-----|
| security.spec.ts | 0 | auth.setup dependency | e2e-staging.yml only |
| auth.spec.ts | 2 | testUser | No |
| dashboard.spec.ts | 0 | auth.setup | No |
| cats.spec.ts | 2 | testUser.userId | No |
| e2e-cats.spec.ts | 2 | testUser.userId | No |
| feedings.spec.ts | 2 | testUser.userId | No |
| households.spec.ts | 2 | testUser.userId | No |
| e2e-households.spec.ts | 3 | testUser + householdId | No |
| e2e-weight.spec.ts | 3 | auth redirect | No |
| e2e-complete.spec.ts | 4 | mixed | No |
| settings.spec.ts | 3 | testUser.userId | No |
| schedules.spec.ts | 1 | credentials | No |
| statistics.spec.ts | 1 | credentials | No |
| profile.spec.ts | 1 | credentials | No |
| notifications.spec.ts | 1 | credentials | No |
| join.spec.ts | 1 | credentials | No |
| history.spec.ts | 1 | credentials | No |
| onboarding.spec.ts | 3 | feature incomplete | No |
| api-gender.spec.ts | 5 | testUser + runtime | No |
| error-offline.spec.ts | 0 | — | No |

## Proposals (R6)

1. Split `security.spec.ts` into project without `dependencies: ['setup']`
2. Add `tests/api-security.spec.ts` for request-only tests
3. Create `.env.test.local` with dedicated Supabase test user
4. Expand `e2e-staging.yml` to: cats, feedings, households after R3 deploy
