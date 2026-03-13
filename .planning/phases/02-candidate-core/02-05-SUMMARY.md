---
phase: 02-candidate-core
plan: 05
subsystem: ui
tags: [next.js, react, drizzle, candidates, master-view, global-search, role-column]

requires:
  - phase: 02-candidate-core/02-01
    provides: getCandidates query, candidate table components
  - phase: 02-candidate-core/02-02
    provides: CandidateTable, CandidateRow, status/tier badges
  - phase: 02-candidate-core/02-04
    provides: CandidateFilterBar, CandidatePagination, filter URL params pattern

provides:
  - Master view page at /master showing all candidates across all roles with Role column
  - Global search in topbar that navigates to /master?q=searchterm on debounced input
  - showRoleColumn and rolesMap props on CandidateTable and CandidateRow

affects: [03-import-pipeline, 04-ai-extraction, 05-activity-feed]

tech-stack:
  added: []
  patterns:
    - "Server component reads all roles for rolesMap (roleId -> roleName), passes to table"
    - "getCandidates called without roleId for cross-role query"
    - "Global search navigates to /master with q param using 300ms debounce"
    - "showRoleColumn={true} enables optional Role column in CandidateTable"

key-files:
  created:
    - src/app/master/page.tsx
  modified:
    - src/components/candidates/candidate-table.tsx
    - src/components/candidates/candidate-row.tsx
    - src/components/layout/topbar.tsx

key-decisions:
  - "Master view passes roleId='' to CandidateTable (required prop) — getCandidates called without roleId at the page level, roleId='' unused"
  - "Role column shows indigo badge with role name from rolesMap lookup"
  - "Global search in topbar uses useEffect on debouncedSearch to push to /master?q=..."
  - "When on /master and search is cleared, router.push('/master') resets the q param"
  - "Deferred: PIPE-04 (activity feed), PIPE-05 (click activity item), SRCH-06 (import source filter), PIPE-06 (bulk status change)"

patterns-established:
  - "rolesMap pattern: Record<string, string> of roleId->roleName built from allRoles array in server component"
  - "Optional column pattern: showRoleColumn prop guards column header + row cell + colSpan"

requirements-completed: [CAND-06, SRCH-02]
# Note: SRCH-06 and PIPE-06 explicitly deferred per CONTEXT.md — not implemented

duration: 7min
completed: 2026-03-13
---

# Phase 2 Plan 05: Master View and Global Search Summary

**Cross-role master view at /master with role column badge + functional global search in topbar navigating to /master?q=... with 300ms debounce**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T07:47:00Z
- **Completed:** 2026-03-13T07:54:00Z
- **Tasks:** 2 of 2 auto tasks complete (checkpoint:human-verify remaining)
- **Files modified:** 4

## Accomplishments

- Master view at /master fetches all candidates across roles, passes rolesMap for role name lookup, renders CandidateTable with showRoleColumn=true
- Role column appears after Name as an indigo badge showing the role name
- Existing CandidateFilterBar and CandidatePagination reused with no changes
- Global search in topbar now fully functional — debounced 300ms, navigates to /master?q=searchterm
- Deferred requirements (PIPE-04, PIPE-05, SRCH-06, PIPE-06) explicitly documented and NOT implemented

## Task Commits

1. **Task 1: Build Master View page and role column** - `58e1ea6` (feat)
2. **Task 2: Functional global search in topbar** - `abbccc1` (feat)

## Files Created/Modified

- `src/app/master/page.tsx` — Full server component, fetches all candidates without roleId, builds rolesMap from active roles
- `src/components/candidates/candidate-table.tsx` — Added showRoleColumn and rolesMap optional props, Role column header, dynamic colSpan in empty state
- `src/components/candidates/candidate-row.tsx` — Added showRoleColumn and rolesMap optional props, conditional Role cell with indigo badge
- `src/components/layout/topbar.tsx` — Replaced disabled Input with functional native input using useDebounce + useRouter to navigate to /master

## Decisions Made

- Master view passes `roleId=""` to CandidateTable (required prop) — the actual filtering is done at query level by omitting roleId from getCandidates
- Role column uses indigo badge styling to visually distinguish it from status/tier badges
- Global search clears to /master (no q param) when input is cleared and user is on /master
- SRCH-06 (import source filter) deferred to Phase 3 when import pipeline exists
- PIPE-06 (bulk status change) deferred per user decision from Phase 2 planning

## Deviations from Plan

None — plan executed exactly as written. Deferred requirements documented in frontmatter per plan objective.

## Issues Encountered

None — TypeScript compiled cleanly on first pass for both tasks.

## Next Phase Readiness

- Phase 2 candidate core complete: add candidate, view/edit profile drawer, status/tier badges, filter bar, pagination, master view, global search
- Ready for Phase 3 (Import Pipeline): CandidateFilterBar already designed to accept new filter additions (SRCH-06 import source filter can be added then)
- rolesMap pattern established — reusable if future views need role name lookup without a join

---
*Phase: 02-candidate-core*
*Completed: 2026-03-13*
