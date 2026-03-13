---
phase: 01-foundation
plan: 02
subsystem: app-shell
tags: [nextjs16, shadcn-ui, sidebar, tailwind, typescript, layout]

# Dependency graph
requires:
  - 01-01 (Drizzle db client, Role type, seeded roles)
provides:
  - Full app shell: SidebarProvider + AppSidebar + Topbar + AppShell wrapper
  - Root layout fetching active roles server-side and passing to sidebar
  - Root redirect (/ → /dashboard)
  - Dashboard with stats bar and role cards grid
  - Role pages with tab strip and empty state (/roles/[roleSlug])
  - Master view empty state (/master)
  - Settings stub (/settings)
  - src/lib/constants.ts with STATUS_LABELS, STATUS_COLORS, TIER_LABELS, TIER_COLORS, LUCIDE_ROLE_ICONS
affects: [02-pipeline-board, 03-import-system, 04-ai-extraction, 05-settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@base-ui/react render prop pattern — this shadcn port uses render= not asChild="
    - "SidebarMenuButton uses render={<Link href=... />} for navigation items"
    - "DropdownMenuTrigger uses render={<button ... />} for custom trigger elements"
    - "AppShell server component wraps SidebarProvider + AppSidebar + Topbar + main"
    - "Root layout fetches roles server-side (db.select from roles where isActive)"
    - "DynamicIcon maps icon name strings to Lucide components with Briefcase fallback"

key-files:
  created:
    - src/lib/constants.ts
    - src/components/layout/topbar.tsx
    - src/components/layout/dynamic-icon.tsx
    - src/components/layout/app-sidebar.tsx
    - src/components/layout/app-shell.tsx
    - src/app/settings/page.tsx
  modified:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/dashboard/page.tsx
    - src/app/master/page.tsx
    - src/app/roles/[roleSlug]/page.tsx

key-decisions:
  - "Use @base-ui/react render prop pattern (render=) not asChild= — this shadcn port is base-ui not radix-ui"
  - "AppShell is a server component wrapping SidebarProvider — sidebar client state lives in sidebar.tsx"
  - "Settings stub created in Phase 1 — full role management comes in Plan 03"
  - "LUCIDE_ROLE_ICONS constant (20 icons) defined in constants.ts for consistent icon picker in settings"

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 1 Plan 02: App Shell Summary

**Full navigable app shell with shadcn sidebar (collapsible/icon-only/mobile overlay), topbar with mock user, and all route skeletons (dashboard, role pages, master view, settings) powered by server-side role fetching**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T10:43:13Z
- **Completed:** 2026-03-13T10:47:09Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Root layout now fetches active roles server-side and passes them to the sidebar
- Sidebar renders all 4 seeded roles with dynamic icons, grouped navigation, and collapsible behavior
- Topbar shows HireFlow logo, disabled search input, and mock user avatar dropdown
- All 6 routes build and render cleanly: /, /dashboard, /master, /roles/[roleSlug], /settings, /_not-found
- Dashboard shows 6 stat cards (zero state) + role cards grid + Create New Role card
- Role pages show tab strip across all active roles + empty state ready for Phase 2
- Constants file established with STATUS_LABELS, STATUS_COLORS, TIER_LABELS, TIER_COLORS for reuse in pipeline board

## Task Commits

1. **Task 1: Build app shell — root layout, sidebar, and topbar** - `52278e2` (feat)
2. **Task 2: Create all page skeletons** - `13c1723` (feat)

## Files Created/Modified

- `src/lib/constants.ts` - MOCK_USER, LUCIDE_ROLE_ICONS, STATUS_LABELS, STATUS_COLORS, TIER_LABELS, TIER_COLORS
- `src/components/layout/topbar.tsx` - HireFlow logo, disabled search, mock user avatar
- `src/components/layout/dynamic-icon.tsx` - Maps 20 Lucide icon name strings to components
- `src/components/layout/app-sidebar.tsx` - Collapsible sidebar with roles group and settings footer
- `src/components/layout/app-shell.tsx` - SidebarProvider wrapper combining sidebar + topbar + main
- `src/app/layout.tsx` - Root layout fetching active roles and rendering AppShell
- `src/app/page.tsx` - Root redirect to /dashboard
- `src/app/dashboard/page.tsx` - Stats bar + role cards + Create New Role card
- `src/app/master/page.tsx` - Master view empty state
- `src/app/roles/[roleSlug]/page.tsx` - Role header + tab strip + empty state
- `src/app/settings/page.tsx` - Settings stub (full implementation in Plan 03)

## Decisions Made

- Used `render=` prop pattern instead of `asChild=` — this project's shadcn port uses `@base-ui/react` not Radix UI. `SidebarMenuButton render={<Link href="..." />}` and `DropdownMenuTrigger render={<button ... />}` follow base-ui's composition API.
- `AppShell` is a server component that imports `SidebarProvider` from the client-side sidebar. Client interactivity (collapse state, mobile overlay) lives entirely within the pre-built `sidebar.tsx` component.
- Created `/settings` stub in this plan — full role management (Phase 1 Plan 03) lands next. Without a stub the sidebar "+ New Role" and Settings links would 404.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SidebarMenuButton and DropdownMenuTrigger API — no asChild prop**
- **Found during:** Task 1 (TypeScript build failure)
- **Issue:** The plan specified `asChild` prop on `SidebarMenuButton` and `DropdownMenuTrigger`, but this project's shadcn components are built on `@base-ui/react` (not Radix UI). `asChild` doesn't exist — the base-ui API uses a `render` prop for polymorphic rendering.
- **Fix:** Changed all `asChild` usages to `render={<Component />}` pattern throughout the sidebar and topbar
- **Files modified:** src/components/layout/app-sidebar.tsx, src/components/layout/topbar.tsx
- **Verification:** TypeScript compiled clean, `npm run build` passed

**2. [Rule 2 - Missing] Added /settings stub page**
- **Found during:** Task 2
- **Issue:** Both sidebar "+ New Role" and Settings footer links point to `/settings`. No settings page existed — navigating would result in a 404 error.
- **Fix:** Created `src/app/settings/page.tsx` with a minimal placeholder explaining full role management comes in Plan 03
- **Files modified:** src/app/settings/page.tsx (new)
- **Verification:** Build shows `/settings` as a static route

---

**Total deviations:** 2 auto-fixed (1 type error, 1 missing route)
**Impact on plan:** Both fixes were necessary. The render prop change is the correct base-ui API. Settings stub prevents broken navigation without adding Plan 03 scope.

## Self-Check: PASSED

All files verified present. All task commits verified in git log.

| Check | Result |
|-------|--------|
| src/lib/constants.ts | FOUND |
| src/components/layout/topbar.tsx | FOUND |
| src/components/layout/app-sidebar.tsx | FOUND |
| src/components/layout/app-shell.tsx | FOUND |
| src/components/layout/dynamic-icon.tsx | FOUND |
| src/app/settings/page.tsx | FOUND |
| .planning/phases/01-foundation/01-02-SUMMARY.md | FOUND |
| Commit 52278e2 (Task 1) | FOUND |
| Commit 13c1723 (Task 2) | FOUND |
| npm run build | PASSED — 6 routes, 0 errors |
