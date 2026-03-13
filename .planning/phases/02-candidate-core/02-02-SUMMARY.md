---
phase: 02-candidate-core
plan: 02
subsystem: candidate-ui
tags: [react, client-components, table, badge, form, useActionState]
dependency_graph:
  requires:
    - 02-01 (candidates server actions: createCandidate, changeStatus, changeTier)
    - src/lib/constants.ts (STATUS_LABELS, STATUS_COLORS, TIER_LABELS, TIER_COLORS)
    - src/types/index.ts (Candidate, CandidateStatus, Tier, CANDIDATE_STATUSES, TIERS)
    - src/components/ui/dropdown-menu.tsx (@base-ui/react DropdownMenu)
  provides:
    - CandidateTable: table shell for candidate list view
    - CandidateRow: 8-column candidate table row
    - CandidateAddRow: inline add-candidate form row
    - StatusBadge: clickable status dropdown badge
    - TierBadge: click-to-cycle tier badge
    - EditField: click-to-edit text field primitive
  affects:
    - 02-03 (candidate drawer — uses CandidateTable and EditField)
    - roles/[roleSlug]/page.tsx (will mount CandidateTable)
tech_stack:
  added: []
  patterns:
    - useActionState for inline form submission with typed state
    - useTransition for async server action pending states
    - e.stopPropagation on badge clicks to prevent row click bubbling
    - TIERS.indexOf + modulo for click-cycle tier advancement
    - CANDIDATE_STATUSES.map for rendering all 12 pipeline statuses in dropdown
key_files:
  created:
    - src/components/candidates/status-badge.tsx
    - src/components/candidates/tier-badge.tsx
    - src/components/candidates/edit-field.tsx
    - src/components/candidates/candidate-row.tsx
    - src/components/candidates/candidate-add-row.tsx
    - src/components/candidates/candidate-table.tsx
  modified: []
decisions:
  - useActionState with concrete state type (not union) to satisfy TypeScript inference in candidate-add-row
  - CandidateAddRow uses colSpan=8 layout (inline form inside tr, not matching column layout) for simplicity
  - StatusBadge uses onClick on DropdownMenuTrigger (not onSelect) because base-ui Menu.Item.Props uses onClick
metrics:
  duration: 4 min
  completed_date: 2026-03-13
  tasks_completed: 2
  files_created: 6
  files_modified: 0
---

# Phase 02 Plan 02: Candidate UI Components Summary

**One-liner:** Six client components — status/tier badges with click mutations, click-to-edit field primitive, and candidate table shell with 8-column rows and inline add form.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Status badge, tier badge, edit-field primitives | 7616ea0 | status-badge.tsx, tier-badge.tsx, edit-field.tsx |
| 2 | Candidate table, row, inline add-row | 3a734d4 | candidate-table.tsx, candidate-row.tsx, candidate-add-row.tsx |

## What Was Built

### StatusBadge (`status-badge.tsx`)
- DropdownMenu trigger wrapping a colored badge span
- Lists all 12 CANDIDATE_STATUSES with color dot + label
- Calls `changeStatus` server action via `useTransition`
- `e.stopPropagation()` on trigger's onClick prevents row click from firing
- Pending state: `opacity-50` on badge while transition is active

### TierBadge (`tier-badge.tsx`)
- Button that cycles: untiered → junior → senior → both → untiered
- Uses `TIERS.indexOf(tier) + 1 % TIERS.length` for modulo cycling
- Calls `changeTier` server action via `useTransition`
- `e.stopPropagation()` on click handler

### EditField (`edit-field.tsx`)
- NOT editing: `<span>` with `cursor-text hover:bg-gray-50`, click to edit
- Editing: `<input>` with blue border, auto-focused via `setTimeout + ref.focus()`
- Saves on `blur` or `Enter` key (only if value changed)
- Cancels on `Escape` key (resets draft to original value)
- `useTransition` for loading opacity during save

### CandidateRow (`candidate-row.tsx`)
- 8 columns: Name, Email, Portfolio Link, Phone, Instagram, Status, Tier, Date Added
- Portfolio: clickable anchor (stopPropagation), domain-only display via URL parsing
- Instagram: auto-prepends `@` if missing
- Date: relative time for <7 days ("2d ago"), short date for older
- Row click calls `onSelect(candidate)` — badges stop propagation so they don't trigger drawer

### CandidateAddRow (`candidate-add-row.tsx`)
- Inline `<tr>` with `colSpan=8` containing a flex form
- `useActionState` with concrete `AddRowState` type (fieldErrors, generalError, success)
- Wraps `createCandidate` server action, handles error/success states
- Shows per-field validation errors below each input
- Auto-focuses Name input on mount
- Calls `onCancel` on success to collapse the row

### CandidateTable (`candidate-table.tsx`)
- Manages `showAddRow` and `selectedCandidate` state
- "Add Candidate" button toggles `showAddRow` (dismisses selected candidate)
- Row click handler calls `handleRowSelect` (dismisses add row, sets selectedCandidate)
- Empty state with SVG icon when no candidates and no add row
- "Showing X of Y candidates" count display
- Pagination indicator when `totalPages > 1`
- Selected candidate state placeholder (drawer integration in Plan 03)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useActionState type inference error**
- **Found during:** Task 2 TypeScript check
- **Issue:** `useActionState` with a loose union type `{ error?: ... } | { success: boolean }` caused TS2769 overload resolution failure. TypeScript required `success` to be `boolean` (not `boolean | undefined`) in the initial state.
- **Fix:** Replaced the union type with a concrete `AddRowState` interface having all optional fields (`fieldErrors?`, `generalError?`, `success?`), and updated JSX references accordingly.
- **Files modified:** `src/components/candidates/candidate-add-row.tsx`
- **Commit:** 3a734d4 (fixed inline before commit)

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (full project) | PASS |
| All 6 files exist | PASS |
| All files meet minimum line counts | PASS |
| StatusBadge imports changeStatus | PASS |
| TierBadge imports changeTier | PASS |
| CandidateRow renders StatusBadge + TierBadge | PASS |
| stopPropagation on badge clicks | PASS |
| CANDIDATE_STATUSES.map (all 12 statuses) | PASS |
| TIERS modulo cycling | PASS |
| useActionState in CandidateAddRow | PASS |

## Self-Check: PASSED

All 6 component files confirmed on disk. Both commits (7616ea0, 3a734d4) confirmed in git log. TypeScript compilation clean.
