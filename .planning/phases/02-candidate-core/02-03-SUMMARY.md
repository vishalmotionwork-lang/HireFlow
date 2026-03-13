---
phase: 02-candidate-core
plan: 03
subsystem: ui
tags: [react, nextjs, sheet, drawer, timeline, edit-field, server-actions]

# Dependency graph
requires:
  - phase: 02-candidate-core
    provides: "02-01: fetchCandidateProfile server action, updateCandidateField, getCandidateWithEvents query"
  - phase: 02-candidate-core
    provides: "02-02: CandidateTable, CandidateRow, EditField, StatusBadge, TierBadge components"

provides:
  - "CandidateDrawer — Sheet-based profile drawer (right on desktop, bottom on mobile)"
  - "StatusHistory — Vertical timeline component for candidate event history"
  - "CandidateTable wired with drawer via selectedCandidateId state"

affects: [02-04, 02-05, phase-5-collaboration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drawer fetches own data via server action (not receiving full object from parent)"
    - "useTransition + useCallback for async data loading in client components"
    - "Re-fetch after mutation pattern (fetchCandidateProfile after updateCandidateField)"

key-files:
  created:
    - src/components/candidates/status-history.tsx
    - src/components/candidates/candidate-drawer.tsx
  modified:
    - src/components/candidates/candidate-table.tsx

key-decisions:
  - "Drawer owns its data fetch (candidateId prop only, fetches full profile internally) — keeps table lean"
  - "Re-fetch on field save instead of optimistic updates — simpler, consistent with server-driven model"
  - "selectedCandidateId (string | null) in table state, not full Candidate object — drawer handles data"

patterns-established:
  - "CopyButton pattern: inline button with clipboard write + brief 'copied' visual feedback"
  - "useCallback + startTransition for server action calls in useEffect"
  - "Sheet open state controlled by !!candidateId (null = closed, string = open)"

requirements-completed: [CAND-03, CAND-04, CAND-05, PIPE-05]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 2 Plan 03: Candidate Profile Drawer + Status History Summary

**Sheet-based candidate profile drawer with inline editing, copy buttons, comments placeholder, and vertical event timeline — wired into candidate table via candidateId state**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T14:41:01Z
- **Completed:** 2026-03-13T14:44:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 updated)

## Accomplishments

- StatusHistory component renders vertical timeline with color-coded dots (green/blue/purple by event type), relative timestamps, and empty state
- CandidateDrawer opens from right (480px) on desktop and bottom on mobile using Sheet from @base-ui/react
- All editable fields use EditField with save-on-blur/Enter, calling updateCandidateField server action
- Drawer re-fetches via fetchCandidateProfile after each field edit to stay in sync
- Comments section shows placeholder ("Comments coming soon") ready for Phase 5 COLB plans
- CandidateTable updated to use selectedCandidateId (string | null) state, renders CandidateDrawer at bottom

## Task Commits

1. **Task 1: Status history + candidate drawer** - `1a1b04e` (feat)
2. **Task 2: Wire drawer into candidate table** - `0ce347b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/candidates/status-history.tsx` - Vertical timeline of CandidateEvent[], color-coded dots per event type, relative timestamps
- `src/components/candidates/candidate-drawer.tsx` - Sheet-based drawer with header (name/status/tier), contact block with copy buttons, comments placeholder, history timeline, and metadata footer
- `src/components/candidates/candidate-table.tsx` - Switched from Candidate object state to selectedCandidateId string, added CandidateDrawer render

## Decisions Made

- Drawer fetches its own data (only receives candidateId) — keeps the table component lean and avoids passing stale object state through to the drawer
- Re-fetch after field save (not optimistic updates) — simpler to implement, consistent with server-driven model used elsewhere in the codebase
- selectedCandidateId as string | null (not full object) in table state — aligns with plan spec and is cleaner since drawer is self-contained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `candidate-filter-bar.tsx` were present before this plan executed. After adding the new files, TypeScript compilation passed cleanly (exit code 0) — the errors resolved as part of the full compilation pass. No changes were needed to that file.

## Next Phase Readiness

- Drawer is fully functional for Plan 03 requirements
- Comments section placeholder is in place for Phase 5 collaboration plans (COLB-01 through COLB-04)
- Plan 04 (filters/search) and Plan 05 (pagination) can build on the existing table + drawer foundation
- No blockers

---
*Phase: 02-candidate-core*
*Completed: 2026-03-13*
