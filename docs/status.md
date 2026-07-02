## 2026-05-10 - Warm Aesthetic Redesign
- [x] Fixed: Removed redundant "more" dropdown menu from cat profile page (`app/cats/[id]/client.tsx`)
- [x] Fixed: Cat photo aspect ratio in list cards - changed to 4:3 with `object-contain` (`components/cat/cat-card.tsx`)
- [x] Fixed: Cat photo aspect ratio in profile avatars - using `object-cover` for circular avatars (`components/ui/avatar.tsx`)
- [x] Fixed: Direct URL navigation error - improved loading state checks in `hooks/use-feeding.ts`
- [x] Fixed: Border inconsistency - removed default borders from Card, Dialog, and Drawer components to match DESIGN.md ("no borders by default")
- [x] Redesigned: Cat detail cards with warm terracotta colors, rounded corners (24px), better spacing
- [x] Redesigned: Feeding form with rounded inputs (16px), better spacing, full-width buttons
- [x] Redesigned: Schedule items - removed dropdown, direct action buttons, warm badges
- [x] Redesigned: Feeding bottom sheet - borderless sections, enlarged cat avatars (h-14 w-14), gradient selected state
- [x] Redesigned: Base UI components - Input, Select, Textarea, Button now use rounded-xl (16px) and h-11 globally
- [x] Redesigned: All form pages - improved spacing (space-y-5) for consistency across new cat, edit cat, new schedule, and goal forms
- [x] Redesigned: Desktop dashboard layout - 2-column grid on lg screens, max-width constraint (max-w-7xl), 4-column stat cards on md+, hidden FAB on desktop
- [x] Applied: Consistent warm color palette throughout (terracotta #E8A87C primary)
- [x] Applied: Warm gradient backgrounds (`from-primary/5 to-primary/10`) for avatars and containers
- [x] Applied: Shadow-only elevation (no borders) - cards use shadow-sm with hover:shadow-md for depth

## 2024-06-04
- [x] Fixed: Marked `app/profile/page.tsx` as a client component (added 'use client' directive) to resolve Next.js error about importing hooks in a server component. All tests run after the change; no new regressions related to this fix. 

## Scheduled Notifications
- In progress: Schema, API endpoints, service layer, and test scaffolds implemented.
- Pending: Delivery logic integration, advanced tests, and production scheduling setup. 