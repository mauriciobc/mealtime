# Development Memory: Weight Tracker Feature

This file tracks key decisions, findings, and potential points of interest during the development of the Weight Tracker feature.

## Initial Codebase Overview (Sprint 1)

*   **Framework:** Next.js (App Router)
*   **Styling:** Tailwind CSS with Shadcn UI components (`components/ui`)
*   **Database:** PostgreSQL with Prisma ORM (`prisma/schema.prisma`, `lib/prisma.ts`)
*   **Authentication:** NextAuth.js (`lib/auth.ts`, `getServerSession`)
*   **Validation:** Zod (expected use in API routes)
*   **API Routes:** Located in `app/api/...` following Next.js conventions.
*   **Components:** Reusable components likely in `components/`.
*   **Hooks:** Custom hooks in `hooks/`.
*   **Utilities:** General helpers in `lib/`.
*   **Notifications:** Existing system (`lib/notifications.ts`, `hooks/useNotifications.ts`, `public/service-worker.js`) to be leveraged later.
*   **Branch:** `new-weight-tracking`

## Sprint 1 Milestones

1.  [x] Update Prisma Schema (`WeightMeasurement`, `weightGoal`)
2.  [x] Run Prisma Migration
    *   _Note:_ Encountered and resolved schema drift by resetting the dev DB.
    *   _Note:_ Seeding failed due to `bcrypt` build issue (`invalid ELF header`). Deferred fix.
3.  [x] Commit Schema Changes
4.  [ ] Implement APIs (CRUD for Measurement, CRUD for Goal)
5.  [ ] Implement Static UI (Page, Cards)
6.  [ ] Commit API & UI changes 