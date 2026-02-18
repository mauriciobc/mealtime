# CLAUDE.md — MealTime Codebase Guide

This file provides context for AI assistants working in this repository. It covers the codebase structure, technology stack, development workflows, and key conventions.

---

## Project Overview

**MealTime** is a full-stack web application for managing cat feeding schedules, tracking weight, and coordinating care across multi-member households. It is built with Next.js App Router and deployed on Netlify, using Supabase for authentication and PostgreSQL (via Prisma) as the database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1 (App Router) |
| Language | TypeScript 5.9 (strict mode) |
| UI | React 19, TailwindCSS 3, shadcn/ui, Radix UI |
| Animations | Framer Motion 12 |
| Charts | Recharts 3 |
| State/Data | TanStack React Query 5, React Hook Form 7 |
| Validation | Zod 4 |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL (via Supabase, pgbouncer-compatible) |
| Auth | Supabase Auth (JWT + Session cookies, hybrid mobile support) |
| Email | MailerSend |
| Edge Functions | Supabase Edge Functions (Deno) |
| Testing | Playwright 1.57 (E2E only) |
| Deployment | Netlify + OpenNext v3 adapter |
| Node.js | >= 20.19.0 required |

---

## Directory Structure

```
/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # API route handlers
│   │   ├── v2/             # Current API version (preferred)
│   │   └── ...             # Legacy routes (avoid adding new ones here)
│   ├── auth/               # Auth callback and related pages
│   ├── cats/               # Cat management pages
│   ├── feedings/           # Feeding log pages
│   ├── households/         # Household management pages
│   ├── schedules/          # Feeding schedule pages
│   ├── weight/             # Weight tracking pages
│   ├── statistics/         # Analytics/reporting pages
│   ├── notifications/      # Notification pages
│   └── (root pages)        # login, signup, profile, settings, dashboard, etc.
├── components/             # React components organized by domain
│   ├── ui/                 # Base shadcn/ui components (do not modify directly)
│   ├── auth/               # Authentication components
│   ├── cat/                # Cat-related components
│   ├── feeding/            # Feeding log components
│   ├── household/          # Household components
│   ├── layout/             # Layout and navigation components
│   ├── notifications/      # Notification components
│   ├── schedule/           # Schedule components
│   └── weight/             # Weight tracking components
├── lib/                    # Shared business logic and utilities
│   ├── actions/            # Next.js Server Actions
│   ├── services/           # Business logic services
│   ├── repositories/       # Data access layer (Prisma queries)
│   ├── middleware/         # Auth, rate limiting, deprecation helpers
│   ├── prisma/             # Prisma client setup
│   ├── responses/          # Standardized API response helpers
│   ├── validations/        # Zod input schemas
│   ├── monitoring/         # Structured logging
│   ├── supabase/           # Supabase client utilities
│   └── (other utilities)   # hooks, types, utils, image processing, etc.
├── hooks/                  # Custom React hooks (prefixed with `use`)
├── prisma/                 # Prisma schema, migrations, seed, and clean scripts
│   ├── schema.prisma       # Data model (source of truth for DB)
│   ├── migrations/         # Auto-generated migration files
│   ├── seed.ts             # Database seed script
│   └── clean-db.ts         # Database cleanup script
├── tests/                  # Playwright E2E tests
│   ├── *.spec.ts           # Test spec files
│   ├── auth.setup.ts       # Auth setup (runs before all tests)
│   ├── fixtures/           # Test data and stored auth state
│   ├── helpers/            # Test utility functions
│   └── pages/              # Page object models
├── supabase/functions/     # Supabase Edge Functions (Deno runtime)
├── scripts/                # Utility/maintenance scripts (ts-node)
├── docs/                   # Comprehensive project documentation
├── public/                 # Static assets
└── config/                 # Misc configuration files
```

---

## Architecture Layers

Follow this layering strictly — do not skip layers or mix concerns:

```
API Route / Server Action
        ↓
    Service Layer          (lib/services/)    — business logic, orchestration
        ↓
  Repository Layer         (lib/repositories/) — Prisma queries, no business logic
        ↓
    Prisma Client          (lib/prisma.ts)    — DB singleton
```

- **API routes** handle HTTP concerns (auth, input validation via Zod, response formatting).
- **Services** contain all business rules and orchestrate multiple repository calls.
- **Repositories** contain only Prisma queries. They must not contain business logic.
- **Server Actions** (lib/actions/) are used for form submissions from Server Components.

---

## Key Files

| File | Purpose |
|---|---|
| `lib/prisma.ts` | Prisma client singleton (uses PG adapter + pgbouncer) |
| `lib/auth.ts` | JWT and Supabase session authentication, hybrid auth support |
| `lib/responses/api-responses.ts` | `ApiResponse` class — use for all API responses |
| `lib/middleware/hybrid-auth.ts` | Combined JWT + session auth for API routes |
| `lib/middleware/rate-limit.ts` | Rate limiting logic |
| `lib/monitoring/logger.ts` | Structured logger — use instead of `console.log` |
| `prisma/schema.prisma` | Prisma data model (source of truth) |
| `next.config.mjs` | Next.js configuration (Turbopack, image domains, server actions) |
| `tailwind.config.ts` | Tailwind theme with CSS variables |
| `playwright.config.ts` | E2E test configuration |

---

## Database Models (Prisma)

All models are in the `public` schema. UUIDs are used for all primary keys.

| Model | Description |
|---|---|
| `cats` | Cat records linked to a household and owner |
| `profiles` | User profiles linked to Supabase Auth (UUID matches auth.users) |
| `households` | Multi-member households; each cat belongs to one household |
| `household_members` | Many-to-many: users ↔ households, with `admin` or `member` role |
| `feeding_logs` | Individual feeding records (amount, unit, meal_type, fed_at) |
| `schedules` | Feeding schedules per cat (interval-based or time-based) |
| `cat_weight_logs` | Historical weight entries per cat |
| `weight_goals` | Weight management goals per cat |
| `weight_goal_milestones` | Checkpoints within a weight goal |
| `notifications` | User notification records |
| `scheduledNotification` | Future notifications polled by a cron job |
| `schema_migrations` | Custom migration tracking |

**Important Prisma notes:**
- Partial indexes (e.g., for enabled schedules, unread notifications) are created via raw SQL migrations, not in `schema.prisma`, because Prisma does not support `WHERE` clauses in index definitions.
- Always run `npm run prisma:generate` after modifying `schema.prisma`.
- Use `npm run db:reset` (destructive) or `npx prisma migrate dev` for schema migrations.
- Row-level security (RLS) is enabled on most models in Supabase. Direct DB connections bypass RLS; API routes use the Prisma client with the service role where needed.

---

## API Conventions

### Versioning
- All new API routes go under `app/api/v2/`.
- Legacy routes under `app/api/` exist for backwards compatibility — do not add new endpoints there.

### Response Format
Always use the `ApiResponse` class from `lib/responses/api-responses.ts`:

```typescript
import { ApiResponse } from "@/lib/responses/api-responses";

// Success
return ApiResponse.success(data);

// Error
return ApiResponse.error("Not found", 404);

// Paginated
return ApiResponse.paginated(items, { total, page, limit });
```

### Authentication
Protect API routes using the hybrid auth middleware:

```typescript
import { withHybridAuth } from "@/lib/middleware/hybrid-auth";

export const GET = withHybridAuth(async (req, { user }) => {
  // user is the authenticated Supabase user
});
```

- Mobile clients send a JWT `Authorization: Bearer <token>` header.
- Browser clients use Supabase session cookies.
- The `withHybridAuth` wrapper handles both automatically.

### Input Validation
Always validate request bodies with Zod before using data:

```typescript
import { z } from "zod";

const schema = z.object({ name: z.string().min(1) });
const parsed = schema.safeParse(await req.json());
if (!parsed.success) return ApiResponse.error("Invalid input", 400);
```

### CORS
`ALLOWED_ORIGINS` env var controls which origins are permitted. The middleware reads this automatically — do not hardcode origins.

---

## Authentication

- Auth is provided by **Supabase Auth** (JWT-based).
- `profiles` table mirrors Supabase `auth.users` — the `profiles.id` UUID matches the Supabase user UUID.
- `lib/auth.ts` exports helpers for extracting the current user from both session cookies and JWT headers.
- The `lib/supabase/` directory has server and client Supabase client factories.
- Never store sensitive auth tokens client-side beyond what Supabase SSR handles automatically.

---

## Frontend Conventions

### Components
- Use **functional components** with hooks only.
- Custom hooks live in `hooks/` and must be prefixed with `use`.
- Base UI components (shadcn/ui) live in `components/ui/` — do not edit these directly; instead extend or wrap them.
- Use `React.memo` for expensive list-item components.

### Styling
- TailwindCSS utility classes only — no custom CSS files unless absolutely necessary.
- Use CSS variables defined in `tailwind.config.ts` for colors (e.g., `bg-primary`, `text-muted-foreground`).
- Dark mode is class-based; use `dark:` variants.
- Fonts: Outfit (primary) and Atkinson Hyperlegible (accessibility).

### Data Fetching
- Use **TanStack React Query** for all client-side data fetching and caching.
- Use **Server Actions** (`lib/actions/`) for form mutations from Server Components.
- Do not call API routes directly from Server Components — use repositories or services instead.

### Forms
- Use **React Hook Form** + **Zod** via `@hookform/resolvers/zod`.
- Keep form schemas in `lib/validations/`.

---

## State Management

- No global state library (no Redux/Zustand). Application state is local or server-state via React Query.
- Auth state is managed by Supabase SSR + React context where needed.
- Toasts/notifications use **Sonner** (`sonner` package).

---

## Environment Variables

Copy `.env.example` to `.env` and populate all values. Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pgbouncer-compatible) |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Base URL (e.g., `http://localhost:3000`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `CRON_SECRET` | Secret header for authenticating cron job requests |
| `MAILERSEND_API_KEY` | MailerSend API key for email sending |

Optional:
| Variable | Description |
|---|---|
| `EDGE_FUNCTION_URL` | Supabase Edge Function URL for push notifications |
| `CRON_BASE_URL` | Base URL used by the cron runner |
| `PORT` | Server port (defaults to 3000) |

---

## Development Commands

```bash
# Install dependencies
npm install

# Generate Prisma client (required after schema changes)
npm run prisma:generate

# Start development server (Turbopack)
npm run dev

# Lint (zero warnings policy)
npm run lint
npm run lint:fix

# Build for production
npm run build

# Database
npx prisma migrate dev        # Apply pending migrations
npm run prisma:seed           # Seed database
npm run db:reset              # Reset and re-migrate (destructive)
npm run db:clean              # Clean test data

# E2E Tests
npm run test:e2e              # Run all tests (headless)
npm run test:e2e:ui           # Interactive Playwright UI
npm run test:e2e:headed       # Run with browser visible
npm run test:e2e:cats         # Run cats.spec.ts only
npm run test:e2e:auth         # Run auth.spec.ts only
npm run test:e2e:feedings     # Run feedings.spec.ts only
npm run test:e2e:dashboard    # Run dashboard.spec.ts only
npm run test:e2e:mobile       # Run mobile projects
npm run test:e2e:report       # Show Playwright HTML report
npm run test:e2e:install      # Install Playwright browsers

# Cron runner (background notifications)
npm run cron
```

---

## Testing

- All tests are **Playwright E2E** — there are no unit tests currently.
- Test files are in `tests/*.spec.ts`.
- `tests/auth.setup.ts` runs before all tests to establish a Supabase session; stored in `tests/fixtures/auth.json`.
- Page object models are in `tests/pages/`.
- Test helpers are in `tests/helpers/`.
- Tests run against `http://localhost:3000` by default (override with `PLAYWRIGHT_BASE_URL`).
- CI runs with 2 retries; local runs with 0 retries.
- Screenshots and videos are captured on failure.

When writing new tests:
1. Create or reuse a page object in `tests/pages/`.
2. Use `tests/helpers/api-helper.ts` for API-level setup/teardown.
3. Do not rely on leftover test data — clean up after each test.

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New features
fix:      Bug fixes
docs:     Documentation changes
style:    Code formatting (no logic change)
refactor: Code restructuring without behavior change
test:     Adding or updating tests
chore:    Maintenance tasks (deps, config, etc.)
```

Branch naming:
- `feature/<description>` — new features
- `bugfix/<description>` — bug fixes
- `hotfix/<description>` — critical production fixes
- `docs/<description>` — documentation
- `refactor/<description>` — refactoring

---

## TypeScript Conventions

- **Strict mode** is enabled. Do not disable it or add `// @ts-ignore` without a comment explaining why.
- No `any` types. Use `unknown` and narrow it, or define proper interfaces.
- Prefer `interface` over `type` for object shapes.
- Path alias `@/*` maps to the root — use it consistently (e.g., `import { X } from "@/lib/utils"`).
- `noUncheckedIndexedAccess` is enabled — always guard array index access.

---

## Logging

Use the structured logger from `lib/monitoring/logger.ts` instead of `console.log`:

```typescript
import { logger } from "@/lib/monitoring/logger";

logger.info("Feeding log created", { catId, amount });
logger.error("Failed to fetch household", { error });
```

In development, all log levels are output. In production, only `warn` and `error`.

---

## Deployment

- Deployed to **Netlify** using the `@netlify/plugin-nextjs` plugin (OpenNext v3 adapter).
- Build command: `npm run build` (runs `prisma:generate` then `next build --webpack`).
- Node.js 20.18.0 on Netlify.
- Supabase Edge Functions (Deno) handle push notifications asynchronously.
- Scheduled notification delivery is triggered by an external cron scheduler hitting `/api/notifications/feeding-check` with the `CRON_SECRET` header.

---

## Documentation

Comprehensive docs are in the `docs/` directory, organized by topic:

- `docs/INDEX.md` — full navigation index
- `docs/DEVELOPMENT-GUIDE.md` — developer workflow
- `docs/API-V2-MIGRATION-GUIDE.md` — migrating from v1 to v2 API
- `docs/api/` — API documentation
- `docs/architecture/` — architectural decisions
- `docs/testing/` — E2E testing guides

---

## Common Pitfalls

1. **Do not bypass the layered architecture** — API routes should not directly call Prisma; use services and repositories.
2. **Always validate user input with Zod** before using it in any business logic or DB operation.
3. **Never hardcode user IDs, household IDs, or secrets** in code. Read them from auth context or environment variables.
4. **Partial indexes are in SQL migrations**, not in `schema.prisma` — if you add a conditional index, write a raw SQL migration alongside the Prisma schema change.
5. **`npm run lint` must pass with zero warnings** before committing. Run `npm run lint:fix` to auto-fix most issues.
6. **After any change to `schema.prisma`**, always run `npm run prisma:generate` to regenerate the Prisma client.
7. **Do not add new API routes to `app/api/` root** — always use `app/api/v2/` for new endpoints.
8. **`DIRECT_URL`** (not `DATABASE_URL`) must be used for `prisma migrate` commands to bypass pgbouncer.
