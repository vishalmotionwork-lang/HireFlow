---
phase: 02-candidate-core
plan: 04
subsystem: candidate-ui
tags: [filter-bar, pagination, url-state, server-component, next-js-16]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["candidate-filter-bar", "candidate-pagination", "role-page-data-fetching"]
  affects: ["02-05"]
tech_stack:
  added: []
  patterns:
    - URL-based filter state via useSearchParams/useRouter
    - Server-side filtering via Next.js 16 async searchParams
    - 300ms debounced search with useDebounce hook
    - Shared conditions array for count + data queries (pitfall 6)
key_files:
  created:
    - src/components/candidates/candidate-filter-bar.tsx
    - src/components/candidates/candidate-pagination.tsx
  modified:
    - src/app/roles/[roleSlug]/page.tsx
decisions:
  - "Filter state lives entirely in URL search params — no useState for filter values, making all filters deep-linkable and shareable"
  - "CandidateFilterBar receives showing/total as props from server component — avoids client-side refetch for count display"
  - "DropdownMenuCheckboxItem used for status multi-select (base-ui pattern matches existing StatusBadge pattern)"
metrics:
  duration: "~3 min"
  completed: "2026-03-13"
  tasks: 2
  files: 3
---

# Phase 02 Plan 04: Filter Bar, Pagination, and Role Page Wiring Summary

**One-liner:** URL-based candidate filtering with status multi-select, tier pills, date/sort dropdowns, debounced search, and server-side pagination on the role page.

## What Was Built

### Task 1: CandidateFilterBar + CandidatePagination

**`candidate-filter-bar.tsx`** — Horizontal filter bar with 7 sections:
1. Status multi-select dropdown (DropdownMenuCheckboxItem, comma-separated URL param `?status=`)
2. Tier pill buttons: All, Untiered, Junior, Senior, Both (URL param `?tier=`)
3. Date Added dropdown: Today, This Week, This Month (URL param `?date=`)
4. Sort dropdown: Newest, Oldest, Name A-Z, Last Updated (URL param `?sort=`)
5. Duplicates-only checkbox (URL param `?duplicates=true`)
6. Debounced search input (300ms, URL param `?q=`)
7. Active filter count badge + Clear All button + "Showing X of Y" text

**`candidate-pagination.tsx`** — Page navigation with:
- Smart ellipsis: first, last, current ±1 always shown
- Previous/Next disabled at boundaries
- Page X of Y display with total candidate count
- URL-based: sets `?page=N` on click

### Task 2: Role Page Rewrite

Rewrote `src/app/roles/[roleSlug]/page.tsx` from empty-state-only to full data fetching:
- Accepts `searchParams: Promise<...>` and awaits it (Next.js 16 pattern)
- Parses all 7 filter params with safe type narrowing
- Calls `getCandidates()` with all parsed params
- Renders layout: header → tab strip → CandidateFilterBar → CandidateTable → CandidatePagination
- Role header now shows real `total` candidate count instead of hardcoded `(0)`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- `npx next build` — successful, `/roles/[roleSlug]` renders as dynamic (ƒ)
- Filter bar has all 7 sections
- All filter state in URL params (no useState for filters)
- Search uses 300ms debounce
- Pagination resets to page 1 on filter change (page param deleted in setFilter)
- Role page awaits searchParams (Next.js 16 pattern)
- getCandidates called with all parsed filter params

## Self-Check: PASSED

All created files found on disk. Both commits (44eeee0, 4f464fd) verified in git log.
