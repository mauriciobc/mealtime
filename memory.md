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
4.  [x] Implement APIs (CRUD for Measurement, CRUD for Goal)
    *   Created `app/api/cats/[catId]/weight/route.ts` (POST, GET)
    *   Created `app/api/cats/[catId]/goal/route.ts` (PUT, GET)
    *   Includes Zod validation, Auth checks, Transaction for POST weight.
5.  [x] Implement Static UI (Page, Cards)
    *   Created `app/cats/[catId]/weight/page.tsx`
    *   Used Shadcn Cards, Buttons, Skeleton.
    *   Placeholders for data, graph, actions.
6.  [x] Commit API & UI changes

## Sprint 2 Milestones

1.  [x] Connect UI to Data (Fetch cat, goal, latest weight)
    *   Fetched goal via API `/api/cats/[catId]/goal`.
    *   Simulated fetching basic cat info (name, current weight) - **Needs real API endpoint**. 
    *   Used `useState`, `useEffect`, `fetch`.
    *   Handled loading/error states.
2.  [x] Implement Calculations (Portions since last, Avg. portions)
    *   Fetched weight history `/api/cats/[catId]/weight`.
    *   Simulated fetching feeding logs - **Needs real API endpoint with date filtering**.
    *   Calculated portions and average daily portions between last two measurements.
    *   Displayed calculated values or N/A.
3.  [x] Implement Add Weight Form/Dialog
    *   Used Shadcn Dialog, Input, Select, Label.
    *   Added form state and submission logic (`handleWeightSubmit`).
    *   Included API call (`POST /api/cats/[catId]/weight`), error handling, toast feedback, and data refetch.
4.  [x] Commit Frontend Integration & Calculation changes

## Sprint 3 Milestones

1.  [x] Implement Graph (MVP - Line Chart)
    *   Installed `recharts`.
    *   Formatted fetched `weightHistory` for chart.
    *   Rendered `LineChart` with axes, tooltip, legend.
    *   Included optional line for `weightGoal`.
2.  [x] Implement History Page (MVP - List View)
    *   Created `app/cats/[catId]/weight/history/page.tsx`.
    *   Fetched weight history `/api/cats/[catId]/weight`.
    *   Displayed history using Shadcn `Table`.
    *   Included loading/error states and back button.
3.  [x] Link "View Full History" button.
    *   Confirmed existing `Link` component was correct.
4.  [x] Commit Graph & History changes

## Sprint 4 Milestones

1.  [x] Implement Notification Trigger (e.g., Cron job / Scheduled Task)
    *   Created API endpoint `GET /api/cron/send-weight-reminders`.
    *   Requires `CRON_SECRET` env var and `Authorization: Bearer` header.
    *   Logic finds cats overdue for weighing (threshold: 14 days).
    *   Groups by user and calls `sendNotification` (needs verification).
    *   **Needs external trigger configuration (Vercel Cron, etc.).**
    *   **Needs `sendNotification` lib verification/adaptation.**
2.  [ ] Implement E2E Tests (Basic Flow)
3.  [x] Refactor & Document
    *   [x] Replaced simulated fetches (cat info, feeding logs) in main page.
        *   Created `GET /api/cats/[catId]/basic-info`.
        *   Created `GET /api/cats/[catId]/feeding` with `?since=` filter.
        *   Updated frontend fetch logic.
    *   [x] Fixed deferred `bcrypt` seeding issue.
        *   Ran `npm rebuild bcrypt --build-from-source`.
        *   Successfully ran `npx prisma db seed`.
    *   Added basic JSDoc to new API routes.
4.  [x] Commit Notification & Refinement changes 