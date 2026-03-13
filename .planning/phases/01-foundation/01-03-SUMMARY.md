---
phase: 01-foundation
plan: 03
subsystem: role-management
tags: [nextjs16, server-actions, zod, shadcn-dialog, react19, typescript]

# Dependency graph
requires:
  - 01-01 (db, schema, roles/candidates tables, Role type)
  - 01-02 (app shell, layout, DynamicIcon, constants.ts with LUCIDE_ROLE_ICONS)
provides:
  - Server Actions for role CRUD: createRole, updateRole, toggleRoleActive, reorderRoles
  - Zod v4 validation schemas: roleCreateSchema, roleUpdateSchema
  - Settings page with full role management UI
  - IconPicker component (20 Lucide icons in grid)
  - RoleForm component (create/edit, React 19 useActionState)
  - RoleList component (edit/deactivate/activate/reorder)
  - AddRoleDialog component (modal trigger)
affects: [02-pipeline-board, 03-import-system]

# Tech tracking
tech-stack:
  added:
    - Zod v4 .flatten() error API (changed from v3 .flatten().fieldErrors)
    - React 19 useActionState hook for form state management
    - sonner toast for success/error notifications
  patterns:
    - Server Actions with 'use server' directive + revalidatePath('/', 'layout') for sidebar cache invalidation
    - Zod v4 safeParse + error.flatten() for field-level validation errors
    - useActionState with FormData — icon value injected via formData.set('icon', icon) before passing to action
    - Slug generation: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    - Candidate guard: count() query before deactivating roles
    - Optimistic reorder: setRoles immediately, then server action, revert on error

key-files:
  created:
    - src/lib/validations/role.ts
    - src/lib/actions/roles.ts
    - src/components/ui/textarea.tsx
    - src/components/roles/icon-picker.tsx
    - src/components/roles/role-form.tsx
    - src/components/roles/role-list.tsx
    - src/components/roles/add-role-dialog.tsx
  modified:
    - src/app/settings/page.tsx (full replacement of stub)

key-decisions:
  - "Zod v4 uses z.flattenError(error) or error.flatten() — same API as v3 for fieldErrors"
  - "Icon is managed as React state in RoleForm and injected into FormData via formData.set before server action is called"
  - "Deactivation guard uses Drizzle count() not raw SQL — more type-safe"
  - "Reorder uses optimistic UI: local state updates immediately, reverts on server error"
  - "textarea.tsx created manually — was missing from initial shadcn install but needed for description field"

# Metrics
duration: 30min
completed: 2026-03-13
---

# Phase 1 Plan 03: Role Management Summary

**Server Actions with Zod v4 validation + complete Settings page (icon picker, create/edit form, reorder/deactivate list) implementing full role CRUD with candidate guard and cache invalidation**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-13T10:43:49Z
- **Completed:** 2026-03-13T11:55:00Z
- **Tasks:** 3 of 3 (Task 3 human verification: APPROVED)
- **Files modified:** 8

## Accomplishments

- Zod v4 validation schemas for create and update with field-level error messages
- 4 Server Actions: createRole (slug uniqueness), updateRole (slug re-generation), toggleRoleActive (candidate guard), reorderRoles (ordered array)
- All actions return `{ error }` or `{ success: true }` — no unhandled throws
- Settings page fetches all roles (including inactive) and renders RoleList + AddRoleDialog
- IconPicker renders 20 Lucide icons in a 5-column grid with blue ring selection state
- RoleForm uses React 19 useActionState, shows field errors from Zod, shows toast on success
- RoleList renders active roles with reorder arrows, edit dialog, deactivate/activate buttons; inactive roles shown below with muted styling
- Build passes with 7 routes

## Task Commits

1. **Task 1: Zod validation + Server Actions** - `9202569` (feat)
2. **Task 2: Settings page with role list, form, icon picker** - `1d4c9da` (feat)
3. **Task 3: Human verification checkpoint** - APPROVED — all 12 verification steps passed

## Files Created/Modified

- `src/lib/validations/role.ts` — roleCreateSchema, roleUpdateSchema, inferred types
- `src/lib/actions/roles.ts` — createRole, updateRole, toggleRoleActive, reorderRoles
- `src/components/ui/textarea.tsx` — shadcn-compatible textarea (was missing)
- `src/components/roles/icon-picker.tsx` — 20-icon grid selector
- `src/components/roles/role-form.tsx` — create/edit form with useActionState
- `src/components/roles/role-list.tsx` — role management list with reorder and toggle
- `src/components/roles/add-role-dialog.tsx` — modal wrapper for create form
- `src/app/settings/page.tsx` — replaced stub with full role management page

## Decisions Made

- Zod v4 `error.flatten()` returns same `{ fieldErrors, formErrors }` structure as v3
- Icon state managed in React, injected into FormData before server action call (cannot include icon in FormData from a hidden input when icon is selected via JS click)
- Drizzle `count()` function used for candidate guard check (type-safe, no raw SQL)
- Optimistic UI for reorder: instant visual feedback, reverts on server error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added textarea.tsx shadcn component**
- **Found during:** Task 2 (RoleForm description field)
- **Issue:** `@/components/ui/textarea` was imported but the component didn't exist in the initial shadcn install
- **Fix:** Created `src/components/ui/textarea.tsx` following the same shadcn/base-ui pattern as existing components
- **Files modified:** src/components/ui/textarea.tsx (new)
- **Verification:** TypeScript compiled clean, build passed

---

**Total deviations:** 1 auto-fixed (missing component)
**Impact on plan:** Minor — textarea is a standard shadcn component, creation was straightforward.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/validations/role.ts | FOUND |
| src/lib/actions/roles.ts | FOUND |
| src/components/roles/icon-picker.tsx | FOUND |
| src/components/roles/role-form.tsx | FOUND |
| src/components/roles/role-list.tsx | FOUND |
| src/app/settings/page.tsx | FOUND |
| Commit 9202569 (Task 1) | FOUND |
| Commit 1d4c9da (Task 2) | FOUND |
| npm run build | PASSED — 7 routes, 0 errors |
| Task 3 human verification | APPROVED — all 12 steps passed |
