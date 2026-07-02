# Baseline Delta — 2026-07-02 vs Initial Audit

**Previous baseline:** [`FOUNDATIONAL-AUDIT-2026.md`](./FOUNDATIONAL-AUDIT-2026.md) (same day, pre re-baseline)  
**Artifacts:** `docs/reports/baseline-2026-07-02/`

## Quality gates

| Command | Jul 2026 (initial) | Jul 2026 (re-baseline) | Delta |
|---------|-------------------|------------------------|-------|
| `npm run lint` | Exit 1 (2 warnings) | **Exit 0** | Fixed |
| `npm run typecheck` | Exit 1 (11 errors) | **Exit 0** | Fixed |
| `npm run build` | Exit 1 (HapticsContext) | **Exit 0** (~62s) | Fixed |
| `npx react-doctor .` | 363 warnings / 227 files | **373 warnings / 228 files** | +10 warnings |
| `npx depcheck` | Unused deps listed | Same pattern | Unchanged |

## Static inventory

| Metric | Initial | Re-baseline |
|--------|---------|-------------|
| API `route.ts` files | 76 | **75** (40 v1 + 35 v2) |
| v1 routes returning 410 | 11 spoofable | **12 files** blocked (410) |
| v1 routes still active | — | **28 files** (~70%) |
| React Context files | 11 | **17** (incl. examples/legacy) |
| Playwright specs | 19 | **19** |
| `test.skip` occurrences | 40+ | **~37** (17 spec files) |
| `.bak` API files | 10 | **10** |
| Docs markdown | 155 | **~177** |
| GitHub workflows | 0 (initial audit) | **2** (`ci.yml`, `e2e-staging.yml`) |
| Health score | 54/100 | **57/100** (codebase) / **48/100** (production live) |

## R1–R2 verification (codebase)

| Item | Status |
|------|--------|
| v1 spoofable routes → 410 | **Verified** in 12 route files via `v1DeprecatedResponse` |
| `test-prisma` removed | **Verified** (404 locally and on production) |
| v2 deliver cron-only | **Verified** (`X-Cron-Secret` required, lines 267–283) |
| CI lint + typecheck + build | **Verified** `.github/workflows/ci.yml` |
| HapticsContext build | **Verified** (typecheck + build pass) |

## Production drift (not in initial delta)

Live `https://mealtime.app.br` still returns **401** on v1 feedings/deliver instead of **410** — deploy pending.

## Raw outputs

- `lint.txt`, `typecheck.txt`, `build.txt`
- `react-doctor.txt`, `depcheck.txt`
- `access-confirmation.md`
- `netlify-env-keys.txt`, `netlify-site.json`
- `security-live.txt` (auth setup failure)
