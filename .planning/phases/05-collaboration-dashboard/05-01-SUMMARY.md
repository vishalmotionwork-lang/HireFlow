---
phase: 05-collaboration-dashboard
plan: "01"
subsystem: data-layer + collaboration
tags: [queries, comments, filter, utility, mentions]
dependency_graph:
  requires: []
  provides:
    - formatRelativeTime shared utility
    - getHiredRejectedByRole query (for Plan 02 dashboard table)
    - importSource filter param in getCandidates
    - Source dropdown in CandidateFilterBar
    - @mention support in CommentThread
  affects:
    - src/components/dashboard/activity-feed.tsx
    - src/components/candidates/comment-thread.tsx
    - src/lib/queries/candidates.ts
    - src/lib/queries/stats.ts
    - src/components/candidates/candidate-filter-bar.tsx
    - src/app/roles/[roleSlug]/page.tsx
    - src/app/master/page.tsx
tech_stack:
  added: []
  patterns:
    - Shared utility module (format-relative-time)
    - Drizzle inArray for multi-value filter
    - URL search params as filter state (source param)
    - @mention detection via cursor position (selectionStart)
key_files:
  created:
    - src/lib/utils/format-relative-time.ts
  modified:
    - src/components/dashboard/activity-feed.tsx
    - src/components/candidates/comment-thread.tsx
    - src/lib/queries/stats.ts
    - src/lib/queries/candidates.ts
    - src/components/candidates/candidate-filter-bar.tsx
    - src/app/roles/[roleSlug]/page.tsx
    - src/app/master/page.tsx
    - src/lib/constants.ts
decisions:
  - "TEAM_MEMBERS as mock constant in constants.ts — consistent with MOCK_USER, replaced when Clerk auth added"
  - "renderCommentBody uses split on @\\w+ regex — keeps JSX clean without a parser library"
  - "filteredMembers filtered by startsWith not includes — more natural @ autocomplete UX"
  - "onMouseDown (not onClick) in mention popover to prevent input blur race condition"
  - "getHiredRejectedByRole fetches hire events separately and joins in JS — avoids complex Drizzle SQL for avg computation"
metrics:
  duration: "5 min"
  completed: "2026-03-13"
  tasks_completed: 2
  files_modified: 8
  files_created: 1
---

# Phase 5 Plan 01: Data Layer + @Mention Foundation Summary

**One-liner:** Extracted shared relative time utility, added getHiredRejectedByRole query with tier+avgDays, wired importSource filter end-to-end, and built @mention popover with blue-highlighted rendering in CommentThread.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Shared util + query extensions + import source filter | 26d7526 | format-relative-time.ts, stats.ts, candidates.ts, candidate-filter-bar.tsx, activity-feed.tsx, comment-thread.tsx, roles/page.tsx, master/page.tsx |
| 2 | @mention support in CommentThread | 362190b | comment-thread.tsx, constants.ts |

## What Was Built

### formatRelativeTime Shared Utility
- Created `src/lib/utils/format-relative-time.ts` with a single named export
- Removed duplicated definitions from `activity-feed.tsx` and `comment-thread.tsx`
- Both files now import from the shared util — single source of truth

### getHiredRejectedByRole Query (DASH-05)
- New exported function in `src/lib/queries/stats.ts`
- Joins candidates + roles, filters to `hired | rejected` status, non-deleted
- Fetches hire events separately and computes avgDaysToHire in JS (avoids complex SQL)
- Returns `RoleHireSummary[]` with: roleId, roleName, hired, rejected, juniorHired, seniorHired, hireRate (0-100), avgDaysToHire (null when no hired)
- Handles zero-data edge case: hireRate=0, avgDaysToHire=null

### Import Source Filter (SRCH-06)
- `importSource?: string[]` added to `GetCandidatesParams` and `getCandidates` destructuring
- `inArray(candidates.source, importSource)` condition added when non-empty
- `SOURCE_OPTIONS` constant added to `CandidateFilterBar`
- Source multi-select dropdown added between Duplicates toggle and Search input
- Source param read from URL (`?source=excel,csv`) and included in `activeFilterCount`
- Both `roles/[roleSlug]/page.tsx` and `master/page.tsx` parse and pass `importSource`

### @Mention Support in CommentThread (COLB-03)
- `TEAM_MEMBERS` constant added to `constants.ts` with 4 mock users
- `handleInputChange` detects `@` trigger via `selectionStart` — finds last `@` before cursor with no space after
- Filtered team member popover renders below input with avatar initials
- `onMouseDown` (not `onClick`) prevents input blur race condition
- `selectMention` replaces `@partial` with `@Name ` (trailing space) and refocuses input
- Escape key closes popover
- `renderCommentBody` splits on `(@\w+)` regex — mention tokens render as `text-blue-600 font-medium`
- `extractMentions` filters TEAM_MEMBERS by name presence in body, passes array to `createComment`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `npx tsc --noEmit` passes — no type errors
- [x] formatRelativeTime imported from shared util in both activity-feed.tsx and comment-thread.tsx
- [x] No local formatRelativeTime definitions remain
- [x] getCandidates accepts importSource param
- [x] CandidateFilterBar renders Source multi-select dropdown with SOURCE_OPTIONS
- [x] getHiredRejectedByRole returns valid RoleHireSummary[] shape
- [x] CommentThread: @mention popover, selection, blue rendering, mention extraction all implemented

## Self-Check: PASSED

Files created:
- FOUND: src/lib/utils/format-relative-time.ts

Commits:
- FOUND: 26d7526 (Task 1)
- FOUND: 362190b (Task 2)
