---
phase: 02-candidate-core
verified: 2026-03-13T08:30:00Z
status: gaps_found
score: 26/27 must-haves verified
gaps:
  - truth: "Clicking any activity item opens that candidate's profile (PIPE-05)"
    status: failed
    reason: "No activity feed exists in Phase 2. PIPE-05 depends on PIPE-04 (activity feed), which is correctly deferred to Phase 5. REQUIREMENTS.md traceability table incorrectly marks PIPE-05 as Complete in Phase 2."
    artifacts:
      - path: "src/app/dashboard/page.tsx"
        issue: "Dashboard shows static zero values — no activity feed component, no clickable activity items"
    missing:
      - "REQUIREMENTS.md traceability table needs PIPE-05 corrected to 'Pending' (it cannot be Complete when PIPE-04 does not exist)"
human_verification:
  - test: "Add candidate and verify workflow"
    expected: "Add Candidate button opens inline form row, fill name + email + portfolio, submit, candidate appears in table"
    why_human: "Requires live browser interaction with form submission"
  - test: "Status badge click"
    expected: "Clicking status badge opens dropdown showing all 12 statuses, selecting one changes it immediately and row updates"
    why_human: "Requires UI interaction to verify dropdown renders and change propagates"
  - test: "Tier badge cycle"
    expected: "Clicking tier badge cycles Untiered -> Junior -> Senior -> Both -> Untiered"
    why_human: "Requires UI interaction to verify cycling works"
  - test: "Profile drawer"
    expected: "Clicking a candidate row opens right-side drawer (480px on desktop), shows editable fields, status history timeline, 'Comments coming soon' placeholder"
    why_human: "Requires browser to test drawer animation, inline editing, copy buttons"
  - test: "Search and filter combination"
    expected: "Typing in search (300ms debounce) filters candidates; status/tier/date filters combine; Showing X of Y updates; Clear All resets"
    why_human: "Requires live interaction to verify debounce timing and filter combination"
  - test: "Global search in topbar"
    expected: "Typing in topbar search navigates to /master?q=searchterm after 300ms debounce"
    why_human: "Requires browser navigation to verify URL update and cross-role results"
---

# Phase 2: Candidate Core Verification Report

**Phase Goal:** Team can view candidates organized by role, manage individual profiles, move candidates through the 12-stage pipeline, assign tiers, and search/filter within role views — covering the full daily-use workflow

**Verified:** 2026-03-13T08:30:00Z
**Status:** gaps_found (1 gap — REQUIREMENTS.md data integrity issue; all code is correct)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Server action can create a candidate with all fields and role assignment | VERIFIED | `src/lib/actions/candidates.ts` — `createCandidate` with Zod validation, INSERT + event log |
| 2 | Server action can change candidate status and log the event atomically | VERIFIED | `changeStatus` uses `db.transaction()` wrapping UPDATE + INSERT |
| 3 | Server action can cycle tier and log the event atomically | VERIFIED | `changeTier` uses `db.transaction()` wrapping UPDATE + INSERT |
| 4 | Server action can update any single candidate field inline | VERIFIED | `updateCandidateField` with whitelist guard on 5 allowed fields |
| 5 | Query function returns paginated, filtered, sorted candidates for a role | VERIFIED | `getCandidates` — shared conditions array, all 7 filter params, 50-per-page |
| 6 | Candidate table renders rows with 8 columns | VERIFIED | `candidate-table.tsx` + `candidate-row.tsx` — Name, Email, Portfolio, Phone, Instagram, Status, Tier, Added |
| 7 | Status badge is clickable and opens dropdown with all 12 pipeline statuses | VERIFIED | `status-badge.tsx` — DropdownMenu with `CANDIDATE_STATUSES.map`, calls `changeStatus` |
| 8 | Tier badge cycles on click through all 4 tiers | VERIFIED | `tier-badge.tsx` — modulo cycling via `TIERS.indexOf` |
| 9 | Inline add-candidate row expands in the table when Add button is clicked | VERIFIED | `candidate-table.tsx` — `showAddRow` state, `CandidateAddRow` rendered in tbody |
| 10 | Clicking a candidate row opens profile drawer from the right | VERIFIED | `candidate-table.tsx` → `CandidateDrawer`, `selectedCandidateId` state |
| 11 | Drawer shows editable fields, contact block with copy buttons, status history, comments placeholder | VERIFIED | `candidate-drawer.tsx` — EditField for all fields, CopyButton, StatusHistory, "Comments coming soon" section |
| 12 | User can click any field in the drawer to edit it — saves on blur or Enter | VERIFIED | `edit-field.tsx` — span→input toggle, `onBlur`/`onKeyDown` handlers |
| 13 | Status history shows vertical timeline with newest entry at top | VERIFIED | `status-history.tsx` — vertical line + color dots, events ordered newest-first by query |
| 14 | Drawer shows "Comments coming soon" placeholder | VERIFIED | `candidate-drawer.tsx` line 269 — dashed border card with MessageSquare icon |
| 15 | User can search by name or email within a role view with 300ms debounce | VERIFIED | `candidate-filter-bar.tsx` — `useDebounce(searchInput, 300)`, sets `?q=` in URL |
| 16 | User can filter by status using multi-select dropdown | VERIFIED | `candidate-filter-bar.tsx` — `DropdownMenuCheckboxItem` for each of 12 statuses |
| 17 | User can filter by tier using pill buttons | VERIFIED | `candidate-filter-bar.tsx` — 5 tier pill buttons, sets `?tier=` in URL |
| 18 | User can filter by date added | VERIFIED | `candidate-filter-bar.tsx` — Today/This Week/This Month dropdown, sets `?date=` in URL |
| 19 | Active filters show count badges and Clear All button appears | VERIFIED | `candidate-filter-bar.tsx` — `activeFilterCount`, "Clear all" button |
| 20 | All filters combine and persist in URL | VERIFIED | `roles/[roleSlug]/page.tsx` — server component reads all params, passes to `getCandidates` |
| 21 | Pagination shows 50 per page with page navigation | VERIFIED | `candidate-pagination.tsx` — smart ellipsis, URL-based `?page=N`; `getCandidates` uses PAGE_SIZE=50 |
| 22 | Sort by options work | VERIFIED | `candidate-filter-bar.tsx` — 4 sort options, `getCandidates` maps to `orderByClause` |
| 23 | Show duplicates only toggle | VERIFIED | `candidate-filter-bar.tsx` — checkbox, `?duplicates=true`, `getCandidates` `duplicatesOnly` param |
| 24 | Master View at /master shows all candidates across all roles with Role column | VERIFIED | `src/app/master/page.tsx` — getCandidates without roleId, `showRoleColumn={true}`, `rolesMap` |
| 25 | Global search in topbar searches across all roles | VERIFIED | `topbar.tsx` — `useDebounce` + `useRouter`, navigates to `/master?q=` |
| 26 | Search includes phone/WhatsApp field (SRCH-01) | VERIFIED | `getCandidates` line 91-98 — `or(ilike(candidates.name), ilike(candidates.email), ilike(candidates.phone))` |
| 27 | PIPE-05: Clicking activity items opens candidate profile | FAILED | No activity feed exists anywhere in Phase 2 — correctly deferred per CONTEXT.md, but REQUIREMENTS.md traceability incorrectly marks as Complete |

**Score:** 26/27 truths verified

---

## Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Notes |
|----------|-----------|-------------|--------|-------|
| `src/lib/actions/candidates.ts` | — | 237 | VERIFIED | 5 exports: createCandidate, changeStatus, changeTier, updateCandidateField, fetchCandidateProfile |
| `src/lib/queries/candidates.ts` | — | 172 | VERIFIED | getCandidates + getCandidateWithEvents |
| `src/hooks/use-debounce.ts` | — | 24 | VERIFIED | Generic useDebounce<T> with cleanup |
| `vitest.config.ts` | — | exists | VERIFIED | node env, @ alias, setupFiles |
| `src/lib/actions/__tests__/candidates.test.ts` | — | 291 | VERIFIED | 5 integration tests against real DB |
| `src/components/candidates/candidate-table.tsx` | 50 | 177 | VERIFIED | Full table shell, drawer wired |
| `src/components/candidates/candidate-row.tsx` | 30 | 144 | VERIFIED | 8 columns, StatusBadge + TierBadge |
| `src/components/candidates/status-badge.tsx` | 25 | 69 | VERIFIED | DropdownMenu, all 12 statuses, stopPropagation |
| `src/components/candidates/tier-badge.tsx` | 20 | 39 | VERIFIED | Modulo cycle, stopPropagation |
| `src/components/candidates/edit-field.tsx` | 25 | 79 | VERIFIED | span/input toggle, blur+Enter save, Escape cancel |
| `src/components/candidates/candidate-add-row.tsx` | 30 | 160 | VERIFIED | useActionState, per-field errors, calls createCandidate |
| `src/components/candidates/candidate-drawer.tsx` | 80 | 314 | VERIFIED | Sheet, fetchCandidateProfile, all 4 sections |
| `src/components/candidates/status-history.tsx` | 40 | 114 | VERIFIED | Vertical timeline, color dots, relative timestamps |
| `src/components/candidates/candidate-filter-bar.tsx` | 80 | 319 | VERIFIED | 7 filter sections, URL state, useDebounce |
| `src/components/candidates/candidate-pagination.tsx` | 30 | 146 | VERIFIED | Smart ellipsis, URL-based navigation |
| `src/app/roles/[roleSlug]/page.tsx` | 40 | 145 | VERIFIED | Server component, all 7 params, getCandidates wired |
| `src/app/master/page.tsx` | 30 | 115 | VERIFIED | Cross-role, showRoleColumn=true, rolesMap |
| `src/components/layout/topbar.tsx` | — | 88 | VERIFIED | useDebounce, navigates to /master?q= |

---

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `status-badge.tsx` | `candidates.ts` | `import { changeStatus }` (line 11) | WIRED |
| `tier-badge.tsx` | `candidates.ts` | `import { changeTier }` (line 5) | WIRED |
| `candidate-row.tsx` | `status-badge.tsx` + `tier-badge.tsx` | `<StatusBadge>` (line 125), `<TierBadge>` (line 130) | WIRED |
| `candidate-drawer.tsx` | `sheet.tsx` | `import { Sheet, SheetContent, SheetHeader, SheetTitle }` (lines 6-10) | WIRED |
| `candidate-drawer.tsx` | `candidates.ts` | `import { fetchCandidateProfile, updateCandidateField }` (lines 17-19) | WIRED |
| `candidate-table.tsx` | `candidate-drawer.tsx` | `<CandidateDrawer candidateId={selectedCandidateId}>` (lines 171-174) | WIRED |
| `candidate-filter-bar.tsx` | URL search params | `useRouter`, `usePathname`, `useSearchParams` (lines 4, 69-80) | WIRED |
| `roles/[roleSlug]/page.tsx` | `getCandidates` | `import { getCandidates }` + called with all params (lines 10, 77-86) | WIRED |
| `roles/[roleSlug]/page.tsx` | `candidate-table.tsx` | `<CandidateTable candidates={candidates} ...>` (lines 129-135) | WIRED |
| `master/page.tsx` | `getCandidates` | called without roleId (line 69) | WIRED |
| `master/page.tsx` | `candidate-table.tsx` | `<CandidateTable showRoleColumn={true} rolesMap={rolesMap}>` (lines 97-105) | WIRED |
| `topbar.tsx` | `/master?q=` navigation | `useDebounce` + `router.push` (lines 24-35) | WIRED |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| ROLE-03 | Each role has its own candidate list at /roles/[slug] | SATISFIED | `src/app/roles/[roleSlug]/page.tsx` fetches role and renders candidates |
| ROLE-04 | Role switcher tab strip | SATISFIED | Tab strip in role page (lines 109-123) using allRoles |
| CAND-01 | Manual candidate add with all fields | SATISFIED | `createCandidate` server action + `CandidateAddRow` |
| CAND-02 | Candidate list view with all columns | SATISFIED | `CandidateRow` — 8 columns including status badge, tier badge, date |
| CAND-03 | Click row opens profile as right-side drawer | SATISFIED | `CandidateTable` → `CandidateDrawer` with side="right" on desktop |
| CAND-04 | Profile shows all sections (partial — comments placeholder) | SATISFIED | Drawer has editable header, contact block, portfolio, history, "Comments coming soon" |
| CAND-05 | User can edit any field inline from profile view | SATISFIED | `EditField` used for name, email, phone, instagram, portfolioUrl in drawer |
| CAND-06 | Master View at /master with Role column | SATISFIED | `src/app/master/page.tsx` with `showRoleColumn={true}` |
| PIPE-01 | 12-stage pipeline statuses | SATISFIED | `CANDIDATE_STATUSES` array, all 12 statuses rendered in `StatusBadge` dropdown |
| PIPE-02 | User can change status from profile — logged immediately | SATISFIED | `StatusBadge` + `changeStatus` server action with transaction |
| PIPE-03 | Status history insert-only event log | SATISFIED | `candidateEvents` insert in `changeStatus`, `getCandidateWithEvents` fetches them |
| PIPE-04 | Activity feed on dashboard (30s refresh) | DEFERRED | Correctly deferred to Phase 5 per CONTEXT.md |
| PIPE-05 | Clicking activity item opens candidate profile | BLOCKED | No activity feed exists — REQUIREMENTS.md incorrectly marks as Complete; must be Pending |
| PIPE-06 | Bulk status change | DEFERRED | Correctly deferred per user decision and CONTEXT.md |
| TIER-01 | Candidates start as Untiered | SATISFIED | `createCandidate` inserts with default tier; schema default is 'untiered' |
| TIER-02 | Reviewer assigns tier from candidate profile | SATISFIED | `TierBadge` in drawer header, calls `changeTier` |
| TIER-03 | Tier filter pills on role list | SATISFIED | `CandidateFilterBar` — 5 tier pill buttons (All/Untiered/Junior/Senior/Both) |
| TIER-04 | Tier changeable at any time | SATISFIED | `TierBadge` always clickable |
| TIER-05 | Tier changes logged in audit trail | SATISFIED | `changeTier` transaction inserts `tier_change` event in `candidateEvents` |
| SRCH-01 | In-role search — name, email, WhatsApp (phone) | SATISFIED | `getCandidates` uses `or(ilike(name), ilike(email), ilike(phone))` |
| SRCH-02 | Global search in topbar across all roles | SATISFIED | `topbar.tsx` navigates to `/master?q=` |
| SRCH-03 | Filter by status (multi-select) | SATISFIED | `CandidateFilterBar` — `DropdownMenuCheckboxItem` for all 12 statuses |
| SRCH-04 | Filter by tier (pill buttons) | SATISFIED | `CandidateFilterBar` — 5 tier pill buttons |
| SRCH-05 | Filter by date added | SATISFIED | `CandidateFilterBar` — Today/This Week/This Month, `getCandidates` `dateRange` param |
| SRCH-06 | Filter by import source | DEFERRED | Correctly deferred to Phase 3 when import pipeline exists |
| SRCH-07 | Show duplicates only toggle | SATISFIED | `CandidateFilterBar` — checkbox sets `?duplicates=true`, `getCandidates` `duplicatesOnly` param |
| SRCH-08 | Sort by: Last Updated, Date Added, Name A-Z, Status grouped | SATISFIED | `CandidateFilterBar` — 4 sort options, `getCandidates` maps to `orderByClause` |
| SRCH-09 | Active filter count badge + Reset all button | SATISFIED | `CandidateFilterBar` — `activeFilterCount` badge, "Clear all" button |
| SRCH-10 | Pagination — 50 per page with page selector and total count | SATISFIED | `CandidatePagination` + `getCandidates` PAGE_SIZE=50 |

### Deferred Requirements (Correct per CONTEXT.md)

| Requirement | Deferred To | Reason |
|-------------|------------|--------|
| PIPE-04 | Phase 5 | Dashboard activity feed with 30s refresh |
| PIPE-05 | Phase 5 | Depends on PIPE-04 existing first |
| PIPE-06 | Phase 5+ | Bulk status change per user decision |
| SRCH-06 | Phase 3 | Import source filter needs Phase 3 import pipeline first |
| CAND-04 comments | Phase 5 | Full comment thread is COLB-01..04 in Phase 5 |

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/dashboard/page.tsx` (line 21-24) | Static hardcoded `value: 0` in STAT_CARDS | Info | Dashboard stats are placeholders — known, expected in Phase 2 |
| `src/app/dashboard/page.tsx` (line 81) | Hardcoded "0 candidates" in role cards | Info | Expected placeholder — dashboard stats are Phase 5 scope |

No blocker anti-patterns found. All Phase 2 components are substantive implementations.

---

## TypeScript Compilation

`npx tsc --noEmit` — **exit code 0, no errors**

---

## Integration Test Coverage

5 integration tests in `src/lib/actions/__tests__/candidates.test.ts` cover:
1. `createCandidate` — valid FormData creates candidate + 'created' event
2. `createCandidate` — empty name returns field errors, no candidate created
3. `changeStatus` — updates status + logs status_change event with fromValue/toValue
4. `changeTier` — updates tier + logs tier_change event with fromValue/toValue
5. `updateCandidateField` — updates allowed field; rejects disallowed field ('id')

---

## Human Verification Required

### 1. Add Candidate Workflow

**Test:** Click "+ Add Candidate" on any role page, fill in Name + Email + Portfolio URL, click Save
**Expected:** Candidate appears as a new row at the top of the table with correct status (Left to Review) and tier (Untiered)
**Why human:** Requires form submission and DOM update verification in browser

### 2. Status Badge Dropdown

**Test:** Click the status badge on any candidate row
**Expected:** Dropdown opens showing all 12 pipeline statuses with color dots; selecting a new status updates the badge immediately with no page reload
**Why human:** Requires verifying DropdownMenu renders, all 12 items visible, and change propagates

### 3. Tier Badge Click-Cycle

**Test:** Click the tier badge 4 times on any candidate
**Expected:** Cycles Untiered → Junior → Senior → Both → Untiered
**Why human:** Requires live interaction

### 4. Profile Drawer

**Test:** Click any candidate row
**Expected:** Drawer slides in from right (desktop); shows name, status, tier, all contact fields, "Comments coming soon" section, history timeline with at least the "Candidate created" event
**Why human:** Requires browser animation verification and section rendering check

### 5. Click-to-Edit in Drawer

**Test:** In the open drawer, click on any field (e.g., email), type a new value, press Enter or click outside
**Expected:** Field saves the new value, drawer refreshes showing updated value
**Why human:** Requires interaction and re-fetch verification

### 6. Search + Filter Combination

**Test:** Type a name in the search input, add a status filter, check that Showing X of Y updates
**Expected:** Results filter within 300ms; combined filters work together; Clear All resets to full list
**Why human:** Requires verifying debounce timing and filter combination in live browser

### 7. Global Search → Master View

**Test:** Type a candidate name in the topbar search
**Expected:** After ~300ms, browser navigates to `/master?q=<name>` and shows only matching candidates with a Role column visible
**Why human:** Requires cross-page navigation verification

---

## Gaps Summary

**One documentation gap found, no code gaps:**

The REQUIREMENTS.md traceability table marks PIPE-05 as "Complete" for Phase 2. This is incorrect — PIPE-05 ("Clicking any activity item opens that candidate's profile") requires PIPE-04 (activity feed) to exist first, and both are correctly deferred to Phase 5 per CONTEXT.md decisions. No activity feed component exists anywhere in the Phase 2 codebase. The code is correct; only the REQUIREMENTS.md traceability table needs updating.

**All 26 other must-haves are verified at all three levels (exists, substantive, wired).** The full daily-use workflow is implemented: candidates can be added, viewed in role-specific tables, profiles opened in a drawer, fields edited inline, statuses and tiers changed, all pipeline events logged, and candidates searched/filtered with URL-persistent state.

---

*Verified: 2026-03-13T08:30:00Z*
*Verifier: Claude (gsd-verifier)*
