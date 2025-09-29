# Mealtime App Flutter Porting Documentation

---

## Progress Tracker

- [x] File and page listing completed
- [ ] System overview and architectural mapping
- [ ] UI/UX mapping table
- [ ] API endpoint documentation
- [ ] Migration strategy and notes

---

## 1. File and Page Listing

### Top-Level Files

- `_error.tsx`
- `error.tsx`
- `globals copy.csbkp`
- `globals.css`
- `layout.tsx`
- `loading-skeleton.tsx`
- `loading.tsx`
- `page.tsx`

### Main Folders and Contents

#### `api/`
- `auth/`
  - `callback/route.ts`
  - `mobile/route.ts`
  - `mobile/register/`
- `cats/`
  - `route.ts`
  - `[catId]/route.ts`
  - `[catId]/next-feeding/`
- `feeding-logs/route.ts`
- `feedings/route.ts`
  - `[id]/route.ts`
  - `cats/route.ts`
  - `last/[catId]/`
  - `stats/route.ts`
  - `stats/swagger.yaml`
- `households/route.ts`
  - `[id]/route.ts`
  - `[id]/cats/`
  - `[id]/feeding-logs/`
  - `[id]/invite/`
  - `[id]/members/`
  - `join/route.ts`
  - `mobile/cats/route.ts`
- `monitoring/errors/route.ts`
- `notifications/`
  - `admin-send.ts`
  - `route.ts`
  - `feeding-check/`
  - `read-all/route.ts`
  - `unread-count/route.ts`
- `profile/[idOrUsername]/route.ts`
- `scheduled-notifications/route.ts`
- `schedules/route.ts`
  - `[id]/route.ts`
- `statistics/route.ts`
- `test-prisma/route.ts`
- `upload/route.ts`
  - `preferences/`
- `weight/goals/route.ts`
- `weight/logs/route.ts`
- `weight-logs/route.ts`

- `auth-code-error/page.tsx`

#### `cats/`
- `page.tsx`
- `[id]/client.tsx`
- `[id]/error.tsx`
- `[id]/layout.tsx`
- `[id]/loading.tsx`
- `[id]/not-found.tsx`
- `[id]/page.backup.tsx`
- `[id]/page.tsx`

#### `components/`
- `cat-details.tsx`
- `feeding-form.tsx`
- `dashboard/dashboard-content.tsx`

#### `feedings/`
- `page.tsx`
- `new/page.tsx`

#### `history/`
- `[id]/page.tsx`

#### `households/`
- `page.tsx`
- `[id]/cats/`
- `[id]/edit/`
- `[id]/members/`
- `new/page.tsx`

- `page.tsx`

#### `login/`
- `layout.tsx`
- `page.tsx`
#### `notifications/`
- `page.backup.tsx`
- `page.tsx`


#### `privacy/`
- `page.tsx`

- `page.tsx`
- `edit/page.tsx`

- `page.tsx`
- `new/page.tsx`

- `page.tsx`
- `[id]/page.tsx`

#### `signup/`
- `page.tsx`

#### `statistics/`
- `page.tsx`
#### `terms/`
- `page.tsx`

#### `test-calendar/`
- `page.tsx`

#### `test-notifications/`
- `page.tsx`

#### `weight/`
- `page.tsx`

---

## Next Steps

- [ ] Map each page to a Flutter screen/widget
- [ ] Document API endpoints for backend integration
- [ ] Begin architectural diagram and UI/UX mapping

---