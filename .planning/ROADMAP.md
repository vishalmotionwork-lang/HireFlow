# Roadmap: HireFlow

## Overview

Six phases that build from foundation to a fully usable hiring CRM. Phase 1 establishes the data model and auth — every subsequent phase depends on it. Phase 2 delivers the daily-use candidate management layer so the team can start tracking candidates manually before import is ready. Phase 3 makes bulk spreadsheet migration possible. Phase 4 adds AI portfolio extraction — the product's core differentiator. Phase 5 completes the collaboration and dashboard layer. Phase 6 makes the app fully mobile-responsive.

## Phases

- [x] **Phase 1: Foundation** - Next.js + Supabase + schema + auth + app shell
- [x] **Phase 2: Candidate Core** - Role views, candidate CRUD, pipeline status, tiers, search, filter (completed 2026-03-13)
- [x] **Phase 3: Import Pipeline** - Spreadsheet import, column mapping, duplicate detection, manual entry (completed 2026-03-13)
- [x] **Phase 4: AI Extraction** - Portfolio URL scraping, structured extraction, review queue (completed 2026-03-13)
- [ ] **Phase 5: Collaboration and Dashboard** - Rejection flow, team comments, dashboard stats
- [ ] **Phase 6: Responsive Polish** - Mobile layout, collapsible nav, full-screen profile, filter panel

## Phase Details

### Phase 1: Foundation
**Goal**: A working, authenticated Next.js app with complete database schema, RLS, and the app shell — so every subsequent phase builds on stable, correct infrastructure
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, ROLE-01, ROLE-02, ROLE-05
**Success Criteria** (what must be TRUE):
  1. A team member can visit the app, sign in with their account, and land on the dashboard — all other routes redirect to sign-in if unauthenticated
  2. The database has all core tables (candidates, roles, candidate_events, candidate_comments, extraction_drafts, import_batches) with RLS policies enabled — no table is accessible via the anon key without an authenticated session
  3. Default roles (Video Editor, Writer/Scriptwriter, Designer, AI/Tech) are seeded and visible in the sidebar on first run
  4. A user can create a new custom role with a name and description from Settings, and it appears in the sidebar navigation
  5. The app shell renders correctly — sidebar navigation, topbar with search input, and main content area — with no broken routes
**Plans:** 3 plans
- [x] 01-01-PLAN.md — Project scaffold + database schema + seed (Wave 1) — DONE 2026-03-13
- [x] 01-02-PLAN.md — App shell: sidebar, topbar, layout, all page skeletons (Wave 2) — DONE 2026-03-13
- [x] 01-03-PLAN.md — Settings page: role CRUD with icon picker + human verification (Wave 2) — DONE 2026-03-13

### Phase 2: Candidate Core
**Goal**: Team can view candidates organized by role, manage individual profiles, move candidates through the 12-stage pipeline, assign tiers, and search/filter within role views — covering the full daily-use workflow
**Depends on**: Phase 1
**Requirements**: ROLE-03, ROLE-04, CAND-01, CAND-02, CAND-03, CAND-04, CAND-05, CAND-06, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, TIER-01, TIER-02, TIER-03, TIER-04, TIER-05, SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, SRCH-07, SRCH-08, SRCH-09, SRCH-10
**Success Criteria** (what must be TRUE):
  1. A user can navigate to any role via the tab strip, see a list of candidates for that role (name, contact snippet, portfolio link, status badge, tier badge), and add a new candidate manually with name, email, portfolio link, and role assignment
  2. Clicking a candidate row opens a profile drawer (desktop) or full-screen view (mobile) showing all fields, status history timeline, and an editable header — and the user can update any field inline
  3. A reviewer can change a candidate's pipeline status via dropdown, and the change is immediately logged in the status history with who made it and when — the previous status is never overwritten
  4. A reviewer can assign Junior, Senior, or Both tier to a candidate from the profile, and the tier filter pills on the role list immediately reflect the assignment
  5. A user can search by name or email within a role view, filter by status (multi-select), tier, date added, and import source — all filters combine and show a count badge with a reset button
**Plans:** 5/5 plans complete
Plans:
- [x] 02-01-PLAN.md — Server actions + query layer (create, status, tier, field update, getCandidates with filters) — DONE 2026-03-13
- [x] 02-02-PLAN.md — Candidate UI components (table, row, status/tier badges, inline add, edit-field) — DONE 2026-03-13
- [x] 02-03-PLAN.md — Profile drawer + status history timeline + click-to-edit wiring — DONE 2026-03-13
- [x] 02-04-PLAN.md — Filter bar + search + pagination + role page data wiring — DONE 2026-03-13
- [x] 02-05-PLAN.md — Master view + global search + deferred requirement handling — DONE 2026-03-13

### Phase 3: Import Pipeline
**Goal**: Team can migrate their existing spreadsheets into HireFlow — uploading Excel/CSV, mapping columns, validating rows, detecting duplicates, and getting a clear import summary
**Depends on**: Phase 1
**Requirements**: IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, IMPT-06, IMPT-07, IMPT-10, IMPT-11, DUPL-01, DUPL-02, DUPL-03, DUPL-04, DUPL-05
**Success Criteria** (what must be TRUE):
  1. A user can drag and drop an Excel or CSV file (including files with BOM, Windows-1252 encoding, or Indian names with diacritics) and see a preview of the first 5 rows with auto-detected column mappings before committing
  2. A user can paste raw spreadsheet data into a text area and proceed through the same column mapping and validation flow as a file upload
  3. Before import completes, rows with missing name or portfolio link are flagged in red and must be resolved or skipped — no silent bad data
  4. After import, the user sees a summary showing how many candidates were imported, how many were skipped, and how many duplicates were detected
  5. When a duplicate is detected (matching email or phone), the candidate row shows a yellow warning icon and the user is prompted to Merge or Keep Separate — no auto-merge ever occurs
**Plans:** 4/4 plans complete
Plans:
- [x] 03-01-PLAN.md — Install deps + parsing/normalization/validation utilities (Wave 1) — DONE 2026-03-13
- [x] 03-02-PLAN.md — Server action: duplicate detection + bulk insert + duplicate icon (Wave 1) — DONE 2026-03-13
- [x] 03-03-PLAN.md — Import page + sidebar nav + wizard Steps 1-2 (Upload + Mapping) (Wave 2) — DONE 2026-03-13
- [x] 03-04-PLAN.md — Wizard Steps 3-4 (Validate/Dedup + Summary) + human verify (Wave 3) — DONE 2026-03-13

### Phase 4: AI Extraction
**Goal**: Team can extract name, contact info, and social handles from portfolio URLs automatically, review confidence-scored results before saving, and queue bulk URL extractions in the background
**Depends on**: Phase 2
**Requirements**: IMPT-08, IMPT-09, AIEX-01, AIEX-02, AIEX-03, AIEX-04, AIEX-05, AIEX-06
**Success Criteria** (what must be TRUE):
  1. A user can paste one or multiple portfolio links and trigger AI extraction — extraction runs asynchronously with a visible progress indicator and never blocks the UI
  2. Before any extracted data is saved, the user sees a review screen showing extracted fields with a confidence level (High/Medium/Low) per field, missing fields in red — and must explicitly confirm, edit, or skip before saving
  3. When extraction succeeds, the candidate profile is populated with confirmed extracted data — when extraction fails (Instagram login wall, broken URL, Google Drive private link), the UI shows "could not extract" without crashing or hanging
  4. Pasting raw text containing contact info (phone number, email, Instagram handle, YouTube URL) into a candidate field automatically detects and parses each contact type into the correct field
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — Firecrawl scrape wrapper + async extraction pipeline + polling endpoint (Wave 1) — DONE 2026-03-13
- [x] 04-02-PLAN.md — URL paste input + extraction progress UI (Wave 2) — DONE 2026-03-13
- [x] 04-03-PLAN.md — Extraction review modal + contact parse field + human verify (Wave 2) — DONE 2026-03-13

### Phase 5: Collaboration and Dashboard
**Goal**: Team can log rejection reasons, compose custom rejection messages, comment on candidates with @mentions, and see hiring stats on the dashboard landing page
**Depends on**: Phase 2
**Requirements**: REJC-01, REJC-02, REJC-03, REJC-04, REJC-05, COLB-01, COLB-02, COLB-03, COLB-04, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. When a user sets a candidate's status to Rejected, a modal appears requiring a rejection reason (quick chip or custom text) before the status change is saved — skipping the modal is not possible
  2. After logging a rejection reason, the user can compose a custom rejection message, then choose Save Only (internal log) or Save and Copy Message (copies to clipboard for external send)
  3. Any team member can leave a comment on any candidate profile — the comment is timestamped, shows the commenter's name and avatar, and supports @mentioning other team members
  4. The dashboard shows global stats (total candidates, left to review, shortlisted, hired, rejected), role cards with candidate counts and status breakdowns, a hired vs rejected summary table, and a recent activity feed that refreshes every 30 seconds
**Plans:** 2 plans
Plans:
- [ ] 05-01-PLAN.md — Shared util + query extensions + import source filter + @mention support (Wave 1)
- [ ] 05-02-PLAN.md — Dashboard completion: clickable stats, role cards, hired/rejected table, auto-refresh activity feed + human verify (Wave 2)

### Phase 6: Responsive Polish
**Goal**: Every screen in the app works correctly on mobile — sidebar collapses, candidate profile opens full-screen, role cards stack, and filters are accessible without a wide viewport
**Depends on**: Phase 5
**Requirements**: RESP-01, RESP-02, RESP-03, RESP-04
**Success Criteria** (what must be TRUE):
  1. On a mobile device, the sidebar collapses to a bottom navigation bar or hamburger menu — all navigation destinations remain reachable
  2. Opening a candidate profile on mobile shows a full-screen view instead of a side drawer — all profile sections are scrollable and accessible
  3. The role cards grid stacks to a single column on mobile, and the filter bar collapses to an expandable panel accessible via a tap
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-13 |
| 2. Candidate Core | 5/5 | Complete   | 2026-03-13 |
| 3. Import Pipeline | 4/4 | Complete   | 2026-03-13 |
| 4. AI Extraction | 3/3 | Complete   | 2026-03-13 |
| 5. Collaboration and Dashboard | 0/2 | In progress | - |
| 6. Responsive Polish | 0/TBD | Not started | - |
