# Codebase Health Plan — MealTime

**Author**: Tech Lead Audit
**Date**: 2026-02-18
**Scope**: Full codebase audit and remediation roadmap
**Goal**: Production-grade quality across every layer

---

## Executive Summary

After a comprehensive audit of the MealTime codebase, I found **7 critical**, **14 high**, **12 medium**, and **8 low** severity issues across security, architecture, code quality, and operations. The application works, but carries significant technical debt that will compound if left unaddressed.

The biggest systemic problems:
1. **The layered architecture exists on paper but is violated everywhere** — every single API route calls Prisma directly.
2. **1,125 console.log statements** and **218 `any` types** — basic hygiene is missing.
3. **V1/V2 API duplication** — 15 endpoint pairs exist in both versions with different auth mechanisms.
4. **Missing error boundaries** — only 2 out of ~15 page routes have error/loading states.

---

## Phase 0: Immediate Security Fixes (Day 1)

> These are bugs that could be exploited in production. Fix before anything else.

### 0.1 [CRITICAL] Unprotected Cron Endpoint
- **File**: `app/api/scheduled-notifications/deliver/route.ts`
- **Issue**: The v1 deliver endpoint has zero authentication. Anyone can trigger notification delivery.
- **Fix**: Add `CRON_SECRET` header validation (the v2 version already does this correctly — mirror that pattern).
- **Verification**: Confirm the v2 endpoint at `app/api/v2/scheduled-notifications/deliver/route.ts` is the one called by cron, then delete the v1 route entirely.

### 0.2 [CRITICAL] Header-Based User Spoofing in V1 Routes
- **Files**: `app/api/feedings/route.ts`, `app/api/schedules/route.ts`, `app/api/weight/goals/route.ts`
- **Issue**: V1 routes authenticate via `X-User-ID` request header — a client-provided value that can be trivially spoofed.
- **Fix**: Replace all `X-User-ID` header reads with `withHybridAuth` middleware (JWT/session validation). Or, if v2 equivalents exist and are consumed, deprecate these routes immediately.

### 0.3 [HIGH] Missing Rate Limiting on Auth Endpoints
- **Files**: `app/api/auth/mobile/route.ts`, `app/api/auth/mobile/register/route.ts`
- **Issue**: Login and registration endpoints have no rate limiting, enabling brute-force attacks.
- **Fix**: Wrap with `authRateLimiter` (5 requests / 15 minutes, already defined in `lib/middleware/rate-limit.ts`).

### 0.4 [MEDIUM] Wildcard CORS on Rate Limit Responses
- **File**: `lib/middleware/rate-limit.ts` (line 75)
- **Issue**: Rate limit error responses send `Access-Control-Allow-Origin: *` instead of using the origin allowlist.
- **Fix**: Use the same `getCorsOrigin()` helper from `lib/responses/api-responses.ts`.

---

## Phase 1: Code Hygiene Sweep (Days 2–4)

> Remove noise so that real problems become visible.

### 1.1 [HIGH] Eliminate 1,125 console.log Statements
- **Scope**: Every file outside `scripts/` and `tests/`
- **Approach**:
  1. Replace `console.log/warn/error` with `logger.info/warn/error` from `lib/monitoring/logger.ts`
  2. Delete pure debug statements (e.g., `console.log('[Debug FeedingProgress] ...')`)
  3. Keep `console.error` only in catch blocks that already re-throw
- **Worst offenders** (tackle first):
  - `lib/utils/dateUtils.ts` (~40 statements)
  - `lib/utils/indexeddb-manager.ts` (~50 statements)
  - `lib/services/api-feeding-service.ts` (~20 statements)
  - `lib/services/supabase-notification-service.ts` (~25 statements)
  - `components/feeding/feeding-progress.tsx` (~20 statements)

### 1.2 [HIGH] Replace 218 `any` Types
- **Scope**: All `.ts`/`.tsx` files in `app/`, `lib/`, `components/`, `hooks/`
- **Approach**:
  1. `catch (error: any)` → `catch (error: unknown)` + type guard
  2. Function params typed `any` → define proper interfaces
  3. Context state typed `any` → derive from Prisma types or Zod schemas
- **Priority files**:
  - `lib/context/FeedingContext.tsx` (4 instances)
  - `lib/context/WeightContext.tsx` (6 instances)
  - `lib/services/apiService.ts` (3 instances)
  - `lib/utils/EventSystem.ts` (callback types)
  - All API route catch blocks

### 1.3 [MEDIUM] Resolve 20 TODO/FIXME Comments
- **Action for each**:
  - If it's a missing feature → create a GitHub Issue and remove the TODO
  - If it's a broken import (`// TODO: Component not found`) → fix or delete the dead code
  - If it's a security concern (`// TODO: Add admin role check`) → fix immediately (these are in `app/api/v2/weight-logs/route.ts` lines 118, 181, 260, 365)

### 1.4 [LOW] Remove Dead Code Files
Delete these files that have zero imports anywhere:
```
lib/utils/StateSelectors.ts
lib/utils/data-loader.ts
lib/utils/PerformanceMonitor.ts
lib/utils/StorageAnalytics.ts
lib/utils/Memoization.ts
lib/utils/api-utils.ts
lib/monitoring/error-monitor.ts
lib/context/FeedingContext.use-hook-example.tsx
lib/context/FeedingContext.use-hook-example.client.tsx
lib/context/FeedingContext.v2.tsx
lib/context/StateSync.tsx
lib/context/ContextBridge.tsx
lib/hooks/use-animation.ts
lib/hooks/use-local-storage.ts
lib/hooks/useDataFetching.ts
```

### 1.5 [LOW] Remove Unused Dependencies
Uninstall these packages from `package.json`:
```
@emotion/is-prop-valid
@react-pdf/renderer
lottie-react
form-data
baseline-browser-mapping
node-gyp
react-doctor
```
Run `npm audit` after cleanup.

---

## Phase 2: Architecture Enforcement (Days 5–12)

> This is the most impactful phase. The declared architecture is Route → Service → Repository → Prisma, but literally zero routes follow it.

### 2.1 [CRITICAL] Create Missing Service Layer
Every v2 API route currently imports `prisma` directly. The fix requires creating proper services:

**New services to create (or complete)**:
| Service | File | Covers |
|---------|------|--------|
| `CatService` | `lib/services/cat-service.ts` | CRUD, ownership validation, household access checks |
| `FeedingService` | `lib/services/feeding-service.ts` | CRUD, duplicate detection, notification triggers, stats |
| `ScheduleService` | `lib/services/schedule-service.ts` | CRUD, interval/time validation, enable/disable |
| `HouseholdService` | `lib/services/household-service.ts` | CRUD, member management, invite codes, access checks |
| `WeightService` | `lib/services/weight-service.ts` | Logs, goals, milestones, cat weight sync |
| `NotificationService` | `lib/services/notification-service.ts` | CRUD, bulk ops, scheduled delivery |
| `UserService` | `lib/services/user-service.ts` | Profile CRUD, preferences |

**Pattern for each service**:
```typescript
// lib/services/cat-service.ts
import { CatRepository } from "@/lib/repositories/cat-repository";
import { HouseholdRepository } from "@/lib/repositories/household-repository";

export const CatService = {
  async getCatsForUser(userId: string) {
    const households = await HouseholdRepository.getByUserId(userId);
    return CatRepository.getByHouseholdIds(households.map(h => h.id));
  },
  async create(data: CreateCatInput, userId: string) {
    // authorization check
    // business validation
    // repository call
  },
};
```

### 2.2 [CRITICAL] Refactor All V2 API Routes
After services exist, every v2 route must be refactored:
- **Remove** all `import prisma from '@/lib/prisma'` lines
- **Remove** all inline business logic (authorization checks, duplicate detection, notification creation)
- **Replace** with service calls
- **Keep in route**: only auth middleware, Zod validation, and `ApiResponse` formatting

**Routes to refactor** (prioritized by traffic/risk):
1. `app/api/v2/feedings/route.ts` — most complex, has inline duplicate detection + notification logic
2. `app/api/v2/households/route.ts` — has inline transaction logic
3. `app/api/v2/cats/route.ts` — direct Prisma with auth checks
4. `app/api/v2/weight-logs/route.ts` — has inline `createWeightLogAndUpdateCat()` function
5. `app/api/v2/schedules/route.ts` — direct Prisma
6. `app/api/v2/notifications/route.ts` — direct Prisma
7. All remaining v2 routes

### 2.3 [HIGH] Fix Repository Layer
Current issues in repositories:
- `cat-repository.ts` lines 87-101: Manual cascade delete (business logic) — move to service, let Prisma cascade handle it
- `feeding-repository.ts` lines 29-62: Conditional pagination logic — split into two methods (`getByHousehold` and `getByHouseholdPaginated`)
- `user-repository.ts` lines 106-113: Manual cascade delete — move to service

### 2.4 [HIGH] Fix Server Actions
- `lib/actions/userActions.ts` lines 72-88, 180: Direct Prisma calls — route through `UserService`

### 2.5 [MEDIUM] Consolidate Duplicate Services
- `apiService.ts` + `api-feeding-service.ts` → merge into `feeding-service.ts`
- `notificationService.ts` (camelCase) → merge into `notification-service.ts` (kebab-case)
- `statistics-service.ts` (root) → merge into `lib/services/api/statistics-service.ts`

---

## Phase 3: V1 API Deprecation and Removal (Days 13–16)

> 15 endpoint pairs are fully duplicated across v1 and v2. V1 uses insecure header auth. Remove them.

### 3.1 [CRITICAL] Migrate All Frontend Consumers to V2
These files still call v1 endpoints — update them first:
- `lib/context/FeedingContext.tsx` → change `/api/feedings` to `/api/v2/feedings`
- `lib/context/ScheduleContext.tsx` → change `/api/schedules` to `/api/v2/schedules`
- `lib/context/HouseholdContext.tsx` → change `/api/households` to `/api/v2/households`
- `lib/data.ts` → change `/api/cats` to `/api/v2/cats`
- `lib/hooks/useCats.ts` → update endpoints
- `lib/hooks/useHouseholdDetail.ts` → update endpoints
- `lib/hooks/useProfile.ts` → update endpoints

### 3.2 [HIGH] Delete V1 Route Files
After confirming no consumers remain, delete:
```
app/api/feedings/           (entire directory)
app/api/cats/               (entire directory)
app/api/households/         (most routes — keep auth-specific ones)
app/api/schedules/          (entire directory)
app/api/weight-logs/        (entire directory)
app/api/weight/             (entire directory)
app/api/goals/              (entire directory)
app/api/feeding-logs/       (entire directory)
app/api/notifications/      (keep feeding-check cron route if needed)
app/api/scheduled-notifications/deliver/  (v1 — unprotected)
```

### 3.3 [MEDIUM] Consolidate Remaining Non-Duplicate V1 Routes
Move to v2 namespace:
- `app/api/auth/callback/` → keep as-is (auth-specific)
- `app/api/auth/mobile/` → keep as-is (auth-specific)
- `app/api/mobile/cats/` → merge into `app/api/v2/cats/` with mobile-specific handling
- `app/api/monitoring/errors/` → move to `app/api/v2/monitoring/errors/`
- `app/api/test-prisma/` → delete (should not exist in production)

---

## Phase 4: Database Schema Hardening (Days 17–19)

### 4.1 [HIGH] Add Missing Cascade Delete Rules
Create a Prisma migration to add `onDelete: Cascade` (or `SetNull` where appropriate):

| Relation | Current | Should Be |
|----------|---------|-----------|
| `feeding_logs.cat_id → cats.id` | No rule | `onDelete: Cascade` |
| `feeding_logs.household_id → households.id` | No rule | `onDelete: Cascade` |
| `feeding_logs.fed_by → profiles.id` | No rule | `onDelete: SetNull` |
| `notifications.user_id → profiles.id` | No rule | `onDelete: Cascade` |
| `household_members.household_id → households.id` | No rule | `onDelete: Cascade` |
| `household_members.user_id → profiles.id` | No rule | `onDelete: Cascade` |
| `cat_weight_logs.measured_by → profiles.id` | No rule | `onDelete: SetNull` |
| `weight_goals.created_by → profiles.id` | No rule | `onDelete: SetNull` |

### 4.2 [MEDIUM] Fix Missing `@updatedAt` Annotations
Change `@default(now())` to `@updatedAt` on `updated_at` fields for:
- `cats`
- `households`
- `feeding_logs`
- `cat_weight_logs`
- `weight_goals`
- `notifications`

### 4.3 [MEDIUM] Normalize Naming Conventions
The `scheduledNotification` model uses camelCase while all others use snake_case. Create a migration to rename the model and its fields to follow the convention, updating all references.

### 4.4 [LOW] Optimize Queries
- Add `select` clauses to repository queries that fetch full records unnecessarily
- Fix N+1 pattern in `app/api/v2/feedings/route.ts` lines 169-180 (sequential household members + profile queries)

---

## Phase 5: Frontend Hardening (Days 20–24)

### 5.1 [CRITICAL] Add Missing `"use client"` Directives
These components use hooks but lack the directive:
- `app/feedings/FeedingsPageContent.tsx`
- `app/schedules/SchedulesPageContent.tsx`
- `app/statistics/StatisticsPageContent.tsx`
- `app/households/[id]/HouseholdPageContent.tsx`
- `components/notifications/notification-center.tsx`
- `components/weight/recent-history-list.tsx`
- (Audit all components using `useState`, `useEffect`, `useContext`, `useCallback`, `useMemo`)

### 5.2 [CRITICAL] Add Error Boundaries and Loading States
Create `error.tsx` and `loading.tsx` for every route group:
```
app/weight/error.tsx + loading.tsx
app/feedings/error.tsx + loading.tsx
app/schedules/error.tsx + loading.tsx
app/statistics/error.tsx + loading.tsx
app/households/[id]/error.tsx + loading.tsx
app/notifications/error.tsx + loading.tsx
app/profile/error.tsx + loading.tsx
app/settings/error.tsx + loading.tsx
```

### 5.3 [HIGH] Split Oversized Components
- `app/weight/WeightPageContent.tsx` (1,103 lines) → extract into 4-5 sub-components
- `app/settings/page.tsx` (855 lines) → extract each settings section
- `app/households/[id]/HouseholdPageContent.tsx` (707 lines) → extract members list, cats list, settings panel
- `components/feeding/new-feeding-sheet.tsx` (709 lines) → extract form logic, validation, display

### 5.4 [MEDIUM] Consolidate Duplicate DateTime Pickers
Three overlapping implementations:
- `components/ui/datetime-picker.tsx` (449 lines)
- `components/ui/datetime-picker-new.tsx` (360 lines)
- `components/ui/simple-time-picker.tsx` (370 lines)

Determine which is canonical, migrate all consumers, delete the others.

### 5.5 [MEDIUM] Standardize Hook Location
All custom hooks should live in `/hooks/` per project conventions. Move:
- `lib/hooks/useCats.ts` → `hooks/use-cats.ts`
- `lib/hooks/useProfile.ts` → `hooks/use-profile.ts`
- `lib/hooks/useDashboard.ts` → `hooks/use-dashboard.ts`
- (and all others in `lib/hooks/`)

### 5.6 [LOW] Accessibility Quick Wins
- Add contextual alt text to cat images (use cat name, not generic "Cat")
- Verify all icon-only buttons have `aria-label`

---

## Phase 6: API Response Consistency (Days 25–27)

### 6.1 [HIGH] Standardize All V2 Routes on `ApiResponse`
Every v2 route must use `ApiResponse.success()`, `ApiResponse.error()`, `ApiResponse.paginated()`. No raw `NextResponse.json()`.

### 6.2 [MEDIUM] Fix HTTP Status Codes
- DELETE operations should return `204 No Content`, not `200` with `{ success: true }`
- Distinguish `401 Unauthorized` (missing auth) from `403 Forbidden` (insufficient permissions) consistently

### 6.3 [MEDIUM] Remove Debug Code from Production Routes
- `app/api/v2/feedings/[id]/route.ts` lines 231-363: Contains extensive agent/debug logging blocks

---

## Phase 7: Testing & CI (Days 28–30)

### 7.1 [HIGH] Add Missing Admin Role Checks (from TODOs)
The v2 weight-logs route has 4 TODO comments about missing admin role checks. These are authorization gaps.

### 7.2 [MEDIUM] Update .env.example
Add all environment variables actually used in the code but missing from `.env.example`:
- `MAX_UPLOAD_SIZE_MB`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_DEBUG_FEEDING`

### 7.3 [MEDIUM] Verify E2E Tests Pass After Refactoring
After each phase, run `npm run test:e2e` to ensure nothing is broken. Tests reference specific API responses and page elements that may change.

### 7.4 [LOW] Add Lint to CI Pipeline
Ensure `npm run lint` runs in CI with the zero-warnings policy enforced.

---

## Summary: Issue Count by Severity

| Severity | Count | Phases |
|----------|-------|--------|
| CRITICAL | 7 | 0.1, 0.2, 2.1, 2.2, 3.1, 5.1, 5.2 |
| HIGH | 14 | 0.3, 1.1, 1.2, 2.3, 2.4, 3.2, 4.1, 5.3, 6.1, 7.1 |
| MEDIUM | 12 | 0.4, 1.3, 2.5, 3.3, 4.2, 4.3, 5.4, 5.5, 6.2, 6.3, 7.2, 7.3 |
| LOW | 8 | 1.4, 1.5, 4.4, 5.6, 7.4 |

---

## Execution Order (Recommended)

```
Week 1:  Phase 0 (security) + Phase 1 (hygiene)
Week 2:  Phase 2 (architecture) — this is the heaviest lift
Week 3:  Phase 3 (v1 removal) + Phase 4 (database)
Week 4:  Phase 5 (frontend) + Phase 6 (API consistency)
Week 5:  Phase 7 (testing/CI) + regression testing + documentation updates
```

Each phase should end with:
1. `npm run lint` passes (zero warnings)
2. `npm run build` succeeds
3. `npm run test:e2e` passes
4. A commit following conventional commit format
