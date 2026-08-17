# Software Simplicity Assessment

## Executive Summary

- **Scope and assessment type:** Repository assessment of MealTime (`mealtime-react`) at `151b17f` (2026-07-26). Production TypeScript/TSX (~69.7k LOC), plus git history from the 2026 foundational-audit remediation through PR #100. Excludes `node_modules`, generated Prisma client, and binary artifacts. Docs were used as evidence of intent, not as proof of current behavior.
- **Overall score:** **1.00 / 3.00** (sum 8 / 8 scored principles).
- **Evidence coverage:** **100%** (8 / 8 applicable principles scored).
- **Gate result:** Not requested. Default gate would fail (Single Knowledge Owner is `0`; overall below 2.2).
- **Top strengths:** Auth and v1 deprecation are centralized (`withHybridAuth`, `block-v1` + proxy). Notification *payload* construction was pulled into `lib/notifications/event-payloads.ts`. Domain React Query hooks exist.
- **Top risks:** Household-membership authorization is copied into ~19 v2 route files. Cat validation, Cat types, and `useCats` exist in multiple independent forms. Unused layers (repositories, DTOs, duplicate feeding services) are hidden by a large Knip ignore list rather than removed. Fat page components and fat API handlers keep change cost high.

In plain terms: the app works, and recent work *did* hide some hard problems (login, old API shutdown). The remaining problem is that the same business facts — “is this user in this household?”, “what is a cat?”, “how do we fetch cats?” — are written in several places. Changing one rule still means hunting through many files.

## Scope and Method

| Item | Value |
| --- | --- |
| Assessment type | `repository` |
| Revision | `151b17f` (`main`, merge of PR #100, 2026-07-26) |
| Time window | Code as of HEAD; history sampled 2026-01 through 2026-07 (remediation R1–R10 and later UI fixes) |
| Included | `app/`, `lib/`, `components/` (non-shadcn samples), `hooks/`, `proxy.ts`, `tests/`, `knip.json`, architecture/status docs |
| Excluded | `node_modules/`, `.next/`, `docs/` volume as implementation, `bfg.jar`, user-guide copy, generated Prisma runtime |
| Intended behavior | Multi-household cat feeding, schedules, weight tracking, notifications; web session + mobile JWT; v1 HTTP API retired |
| Compatibility | `/api/v1` (unversioned `/api/*` except allowlisted prefixes) must return 410; v2 is the live contract |
| Sampling | 100% of `app/api/**/route.ts` (83 files). 100% of `lib/context`, `lib/hooks/domain`, `lib/middleware`, `lib/repositories`. Largest 25 TS/TSX files by LOC. Git `--stat` on feeding, household, auth, and weight paths. |
| Unsampled | Full UI component internals beyond the largest pages; runtime/prod smoke this session; Knip execution; incident logs |
| Limitations | No live production probe. Architecture README is stale vs code. Scores are decision support, not a scientific ranking against other products. |

### Representative change scenarios

Chosen from domain operations and recent history (not only easy edits):

1. **Record a feeding** (create feeding log + duplicate warning + UI refresh).
2. **Invite / accept a household member** (authorization + notification + UI).
3. **Add a field on cat** (historical analogue: gender normalization, `b7f5323`).
4. **Log a weight measurement** (API + datetime UI + dashboard; PR #100).
5. **Tighten household authorization** (e.g. require admin for a mutation) — policy change across routes.

### Principle applicability

All eight catalog principles apply. None marked `N/A`. No principle left `Unknown`.

## Scorecard

| Principle | Score | Measured values | Evidence | Confidence | Finding |
| --- | --- | --- | --- | --- | --- |
| Single Responsibility | 1 | Distinct change-driver count for a typical v2 handler ≥ 4 (auth, validation, Prisma, notifications, HTTP mapping). `WeightPageContent.tsx` 1004 LOC; `proxy.ts` 554 LOC; `FeedingContext.tsx` 509 LOC; `apiService.ts` 302 LOC mixing localStorage + v2 + feeding notifications. | `app/api/v2/feedings/route.ts:33-96`; `app/weight/WeightPageContent.tsx`; `proxy.ts:1-60`; `lib/services/apiService.ts:1-80`; `lib/context/FeedingContext.tsx:1-80`. | High | Domain folders exist, but live units still change for unrelated reasons (security headers, CORS, mapping, UI). Size is a signal, not the proof; co-located policies are. |
| Deep Modules | 1 | Interface Burden Profile (v2): **~62** exported HTTP operations across **35** route files, **13** v2 files without Zod, callers must know `{success,data,error}` *or* raw arrays. Pass-through: **5** empty domain providers (`CatsProvider` etc.). Domain hooks are thin (`useCatsQuery` 11 LOC). Repositories exist (5 files) but production import count from routes = **0** (only `statistics-service` imports a repository). | `lib/middleware/hybrid-auth.ts:129`; `lib/api/v2-client.ts:17-47`; `lib/hooks/domain/useCatsQuery.ts:1-11`; `lib/context/CatsContext.tsx:104`; `lib/repositories/index.ts`; grep of `@/lib/repositories` → 1 consumer. | High | Auth fetch wrappers are reasonably deep. Domain capability is not: callers still see Prisma-shaped fields, dual envelopes, and empty Context providers. |
| Single Knowledge Owner | 0 | Duplicate Rule Count (selected): household membership **18** (`19` independent `household_members.find*` sites − 1); cat create/update validation **3** (two unused schemas + two live `validateWeight` copies); `useCats` **1**; DateTime picker **1**; hybrid auth **1** (`withHybridAuth` vs `getAuthenticatedUser`). Historical amplification: gender normalize **20 files** (`b7f5323`). | Membership grep in `app/api/v2/**`; `lib/validations/cats.ts` (zero importers); `lib/dto/cat.dto.ts` (zero importers); `app/api/v2/cats/route.ts:11-44` and `cats/[catId]/route.ts:12`; `lib/hooks/useCats.ts` vs `lib/context/CatsContext.tsx:106`; `knip.json:79` ignores `lib/dto/**` and `lib/validations/**`. | High | The same facts have several owners. This is the critical violation: a membership or cat-shape change cannot be made in one place. |
| Design Boundaries Twice | 1 | Alternative coverage: **0 documented ADRs**. Material decisions observed: v1 stubs vs delete; Context facade vs drop Context; Prisma vs Supabase RLS; repositories vs inline Prisma; `ApiResponse` vs ad-hoc `NextResponse.json`. Trade-off coverage in `FOUNDATIONAL-AUDIT-2026-MASTER.md` is a debt list, not option comparison. | No `ADR*` files. `docs/architecture/README.md:24-33` still says Next.js 14 + Context API. `docs/architecture/contexts.md:11` still says NextAuth. `knip.json:44-110` ignore list papers over unused layers. R1–R10 in `docs/todos/CURRENT.md` records sequence, not alternatives. | Medium | Boundaries were migrated under time pressure. Leftover layers (v1 files, repositories, DTOs, Context providers) were kept without a recorded “why not delete.” |
| Pull Complexity Downward | 1 | Repeated caller-policy: membership checks **19 files**; error JSON constructed inline in most v2 handlers (`ApiResponse` used in **3** files, none of them v2 domain routes); feedings mapping duplicated in `useFeedingsQuery` (raw `fetch`, `fed_at` → `timestamp`) instead of `v2-client`. Pulled down successfully: JWT/session (`withHybridAuth`), v1 410 (`block-v1` + `proxy.ts`), notification rows (`event-payloads.ts`). | `lib/notifications/event-payloads.ts:38-63`; `lib/hooks/domain/useFeedingsQuery.ts:5-40`; `lib/responses/api-responses.ts` vs grep of `ApiResponse` (3 files); `app/api/v2/feedings/route.ts` inlines duplicate + notify. | High | Mechanical auth/deprecation moved down. Business authorization, mapping, and error envelopes did not. |
| Valid States and Failures | 2 | Invalid construction: Zod on **22 / 35** v2 route files (63%). Invariant enforcement: v1 blocked at proxy (`isDeprecatedV1ApiPath`); duplicate feeding at POST `/api/v2/feedings`; cron deliver gated by `X-Cron-Secret`. Actionable failure ratio: v2 errors usually include `error` string + HTTP status; `V2ApiError` carries `status`. Gap: `user.household_id` is **first membership only** (`hybrid-auth.ts:87-90`); cat POST still uses ad-hoc `validateWeight` (`any`); E2E comments record context/API cat mismatch. Unit tests: 3 files (`hybrid-auth`, `block-v1`, notification triggers). | `lib/middleware/block-v1.ts:13-28`; `app/api/v2/feedings/route.ts:22-47,96`; `app/api/v2/scheduled-notifications/deliver/route.ts:267-281`; `lib/middleware/hybrid-auth.ts:87-90`; `tests/unit/*.test.ts`; `tests/cats-detail.spec.ts:94-109`. | Medium | Core “who are you / is v1 dead / is this a duplicate meal” invariants are enforced. Authorization completeness and cat validation are not one boundary. |
| Names and Contracts | 1 | Conflicting-term count (sampled): `Cat` vs `CatType` vs `BaseCat` (≥6 local `interface Cat`); `useCats` (context: `{state, dispatch}` vs hook: `{cats, addCat}`); `timestamp` vs `fed_at`; `datetime-picker` vs `datetime-picker-new`; `notification-service` vs `notificationService` vs `supabase-notification-service`. Undocumented public contracts: unused DTO/validation modules; architecture docs name NextAuth. Time-to-locate probe not run (sample size 0). | `lib/hooks/useCats.ts:7-19`; `lib/context/CatsContext.tsx:106-137`; `lib/types.ts:55`; `app/weight/weight-page-types.ts:6`; `docs/architecture/contexts.md:11`; `components/ui/datetime-picker.tsx` vs `datetime-picker-new.tsx`. | High | Developers cannot trust a name to mean one module. Tests already comment that `useCats()` context does not see API-created cats. |
| Conventions and Scope | 1 | Unexplained deviations: dual cat fetchers; dual DateTime pickers; domain hooks mix `v2-client` and raw `fetch`; Knip ignore **~40+** files plus entire `lib/dto/**` and `lib/validations/**`. Speculative abstractions without current consumer: `lib/repositories/*` (except statistics), `lib/dto/*`, `lib/services/feeding-service.ts`, `api-feeding-service.ts` (zero importers). v1: **48** stub `route.ts` files still in tree. Docs markdown: **167** files. Directly-related-hunk ratio N/A (not a single diff). | `knip.json:44-151`; glob `app/api/**/route.ts` 83 = 35 v2 + 48 non-v2; `lib/services/feeding-service.ts` grep importers = 0; `docs/INDEX.md`. | High | The intended convention (v2 + hybrid auth + React Query) is visible, but the repo still ships the previous convention beside it. |

**Overall score** = 8 / 8 = **1.00 / 3**.  
**Evidence coverage** = 8 / 8 = **100%**.

Static metrics (LOC, file counts) are **signals**. The verdicts above rest on ownership, duplication, and history — not on “this file is long.”

## Change Scenario Results

| Scenario | Files | Modules | Duplicated rules | Caller burden | Notes |
| --- | --- | --- | --- | --- | --- |
| 1. Record a feeding | **8–12** production files in the live path (`app/api/v2/feedings/route.ts`, `feeding-notification-service.ts`, `event-payloads.ts`, `FeedingContext.tsx`, `useFeedingsQuery.ts`, `new-feeding-sheet.tsx`, `use-new-feeding-sheet.ts`, plus optional `feeding-form.tsx` / `apiService.ts`) | API, notification policy, context facade, RQ hook, UI | Duplicate-feeding rule also exists in unused `feeding-service.ts` and `api-feeding-service.ts` | UI talks to Context reducer *and* RQ; hook remaps `fed_at` itself | Median live path ~10 files. Dead copies do not run but still confuse owners. |
| 2. Invite / accept household member | **6–9** (`invite/route.ts`, `accept/route.ts`, `reject/route.ts`, `HouseholdContext.tsx`, `InvitePageContent.tsx`, `household-invite-notification.tsx`, members routes) | API, household context, notifications, UI | Membership/role checks copied per route (no `requireMembership`) | Callers re-specify Prisma membership queries | Invite UX is feature-documented; authorization is not a shared module. |
| 3. Add a field on cat (gender analogue) | **20 files** historically (`b7f5323`, 64 insertions / 35 deletions) | Prisma schema, v1 stubs, v2 cats routes, types, UI forms, tests | `createCatSchema`, `createCatDtoSchema`, and inline `validateWeight` / `parseGender` | Every cat HTTP + form layer needed the field | Range: a true schema field still fans out. DTO/validation modules were **not** the owner (unused). |
| 4. Log weight | **6 files** in PR #100 (`610b9a1`, +556 / −177) | Weight API (`weight-logs/route.ts` 421 LOC, 4 verbs), WeightContext, `WeightPageContent` (1004 LOC), datetime picker, quick-log | Two DateTimePicker implementations (`datetime-picker` vs `datetime-picker-new`) | Page owns defaults, calendar layout, and cat scrolling together | Even a UI-default fix touched picker + dashboard + cats scroll — weak isolation. |
| 5. Tighten household authorization | **~19 route files** (every `household_members.find*` site) + possibly `hybrid-auth.ts` (first-household assignment) | All v2 domain routes | Membership rule DRC = 18 | Each handler encodes the policy | Highest amplification scenario. No shared helper exists (grep `requireMembership` / `assertMember` = 0). |

**Change amplification (production files):** values `10, 8, 20, 6, 19`. **Median 10.** **Range 6–20.**

## Findings and Recommendations

### P0 Same authorization fact, nineteen owners

- **Observation:** “User must belong to the household of the resource” is re-implemented with Prisma `household_members.findFirst/Unique/Many` in 19 v2 files (~39 call sites). There is no shared `requireMembership` helper. `withHybridAuth` only authenticates and then stamps `household_id` from the **first** membership.
- **Evidence:** Grep counts under `app/api/v2/**`; `lib/middleware/hybrid-auth.ts:87-90`; zero matches for `requireMembership|assertMember|ensureHouseholdMember`.
- **System impact:** A role or multi-household rule change requires a 19-file edit. Missing a copy is an authorization bug, not a style issue.
- **Smallest recommendation:** Add one server helper used by v2 handlers, e.g. `requireHouseholdMember(userId, householdId)` / `requireCatAccess(userId, catId)`, returning a typed 403/404. Replace in-route copies. Do not introduce a new repository framework.
- **Validation criterion:** Membership `find*` in `app/api/v2` drops to the helper module plus ≤2 justified exceptions (deliver cron, swagger). A unit test covers “member / non-member / missing resource.” Scenario 5 becomes a 1–2 file change.

### P0 Cat knowledge has no single owner

- **Observation:** Cat create/update rules live in unused `lib/validations/cats.ts`, unused `lib/dto/cat.dto.ts`, and live ad-hoc `validateWeight` copied into `cats/route.ts` and `cats/[catId]/route.ts`. Frontend has a second `useCats` (`lib/hooks/useCats.ts`) with a different `Cat` interface and query key `['cats', householdId]` versus `domainKeys.cats`.
- **Evidence:** `createCatSchema` importers = 0; DTO importers = 0; `validateWeight` in two route files; `tests/cats-detail.spec.ts:94` comments that context `useCats()` does not contain API-created cats; `knip.json` ignores `lib/dto/**` and `lib/validations/**`.
- **System impact:** Schema changes fan out (20 files for gender). Cache invalidation can miss. E2E cat UI tests are already untrusted.
- **Smallest recommendation:** Pick **one** Zod schema as the API owner and import it from both cat routes. Delete or re-export the unused duplicate. Collapse to one `useCats` (the domain hook + context facade, or the CRUD hook — not both names). Align query keys to `domainKeys`.
- **Validation criterion:** `rg createCatSchema` has production importers; duplicate `validateWeight` functions = 0; a single `useCats` export path; cat-detail E2E comments about context mismatch can be removed because tests pass.

### P1 Empty Context providers + fat facades

- **Observation:** `CatsProvider`, `HouseholdProvider`, `FeedingProvider`, `WeightProvider` render `{children}` only. Hooks still expose reducer `dispatch` over React Query cache. `FeedingContext.tsx` (509 LOC) still owns insertion order, timezone, and schedule joining. `provider-groups.tsx` already documents “domain data via React Query.”
- **Evidence:** `lib/context/CatsContext.tsx:104-137`; `FeedingContext.tsx:40-77,130`; `components/layout/provider-groups.tsx:32-40`.
- **System impact:** Callers think they are using Context. They are using a compatibility shim. New code copies `dispatch` instead of mutations. Cognitive load stays high.
- **Smallest recommendation:** Stop adding reducer actions. For one domain (cats), replace `dispatch` call sites with query invalidation / mutations only. Leave other domains until cats is done.
- **Validation criterion:** `CatsAction` / `catsReducer` unused; cat pages import one hook; FeedingContext LOC does not grow on the next feeding UI change.

### P1 Unused parallel layers (repositories, twin feeding services, v1 stubs)

- **Observation:** Five repositories are unused by API routes. `feeding-service.ts` and `api-feeding-service.ts` duplicate `registerFeeding` and have zero importers. 48 non-v2 `route.ts` files remain as 410 stubs. Knip is configured to ignore the evidence.
- **Evidence:** `lib/repositories/index.ts`; grep `@/lib/repositories` → `statistics-service.ts` only; feeding service importers = 0; 48 stub routes returning `v1DeprecatedResponse`; `knip.json:88-90,142-145`.
- **System impact:** Search and “go to definition” land on dead code. New contributors implement against the wrong layer. Proxy still lists incomplete `apiRoutes` (`proxy.ts:37-45`).
- **Smallest recommendation:** Delete unused feeding service twins and unused DTO/validation duplicates **after** P0 schema owner is chosen. Keep v1 stubs only if a public client still needs 410 bodies; otherwise rely on proxy `isDeprecatedV1ApiPath` and delete files in one PR. Shrink Knip ignore as files die.
- **Validation criterion:** Knip ignore entries for `lib/dto`, `lib/validations`, `feeding-service`, and repositories are gone or justified in a one-line comment; `rg registerFeeding` has a single live definition.

### P2 Mapping and error envelopes stay in callers

- **Observation:** `v2-client.ts` already unwraps `{ success, data, error }`. `useFeedingsQuery` and `useHouseholdsQuery` still use raw `fetch` and remap snake_case. `ApiResponse` exists but v2 handlers inline `NextResponse.json({ success: false, error })`. `lib/auth.ts` duplicates hybrid auth for `/api/users/me` (itself a deprecated v1 path).
- **Evidence:** `lib/api/v2-client.ts:17-47`; `lib/hooks/domain/useFeedingsQuery.ts:8-40`; `lib/hooks/domain/useHouseholdsQuery.ts:24-30`; `ApiResponse` used in `lib/auth.ts`, `rate-limit.ts`, `app/api/users/me/route.ts` only.
- **System impact:** Envelope or field rename (e.g. `fed_at`) edits hooks *and* routes. Failure shape is not one contract.
- **Smallest recommendation:** Make domain hooks call `v2Get` / `v2Post` only. Map Prisma → DTO once in the route (or one mapper module owned by feedings). Do not add a new error framework; pick `success/error` and use it in new handlers.
- **Validation criterion:** `useFeedingsQuery` / `useHouseholdsQuery` contain no raw `fetch`; feeding field mapping exists in one module; new v2 routes do not invent a third envelope.

### P2 Names that lie (docs and pickers)

- **Observation:** Architecture docs still describe Next.js 14, Context as the data layer, and NextAuth. Two DateTime pickers are both imported. `datetime-picker-new` is an unfinished rename.
- **Evidence:** `docs/architecture/README.md:24-29`; `docs/architecture/contexts.md:11`; DateTimePicker imports split across weight vs cats.
- **System impact:** Wrong mental model; UI bugs split across two pickers (PR #100 had to touch calendar layout).
- **Smallest recommendation:** Point architecture README at v2 + Supabase + React Query in one page. Delete or re-export one DateTimePicker.
- **Validation criterion:** Docs mention NextAuth = 0; one DateTimePicker import path in app code.

## Validation and Limitations

### Commands and analyses used

```text
git rev-parse HEAD                    # 151b17f
git log --stat                        # scenarios 1–5, 2026 history
find + wc -l                          # ~69655 TS/TSX LOC; largest files
glob app/api/**/route.ts              # 83 routes: 35 v2 + 48 non-v2
rg withHybridAuth / withV1Blocked / zod / household_members.find
rg useCats / createCatSchema / ApiResponse / repositories
rg test.skip                          # 2 actual skips; cats-detail uses comments not skip()
```

Unit/E2E/lint/build were **not** re-run in this session. Prior remediation docs claim lint/typecheck/build green as of 2026-07-02; that is historical, not re-verified here.

### Missing evidence (explicit)

- Production smoke (`npm run smoke:prod`) not executed here — deploy drift vs `docs/todos/CURRENT.md` TD-001 remains **Unknown**.
- Knip not executed; ignore list is evidence of intent to hide unused files, not a live unused-export count.
- No incident database; failure actionability inferred from code and unit tests only.
- Comprehension / time-to-locate probe not run (sample size 0).

### Residual uncertainty

- Some “unused” services might be reached by dynamic import not matched by grep (low probability; feeding twins have no matching import strings).
- v1 stub files may be required by a specific Netlify/Next routing behavior; deleting them needs a deploy check (410 still returned by `proxy.ts`).
- Multi-household users: `household_id` = first membership may be intentional. It is still an unenforced product invariant.

### How to read this score

1.00 / 3 means **the system is operable but expensive to change**, especially for authorization and cat shape. It does **not** mean “rewrite.” The smallest coherent improvement is: **one membership helper + one cat schema + one `useCats`**, then delete the proven-dead twins. Re-score the same five scenarios after that work; median files-per-scenario is the trend that matters, not the absolute 1.00.
