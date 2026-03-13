# Requirements: HireFlow

**Defined:** 2026-03-13
**Core Value:** Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline — without switching between spreadsheets, emails, and messaging apps.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: App bootstrapped with Next.js 16 + Supabase + Drizzle ORM + shadcn/ui + Tailwind CSS
- [ ] **FOUND-02**: Clerk authentication with team login — all routes protected except sign-in/sign-up
- [x] **FOUND-03**: Database schema with all core tables: roles, candidates, comments, status_history, import_batches, extraction_jobs, activity
- [ ] **FOUND-04**: Row-level security enabled on Supabase from day 1
- [x] **FOUND-05**: App shell with sidebar navigation, topbar with global search, and mobile-responsive layout

### Roles

- [x] **ROLE-01**: Default roles seeded on first run: Video Editor, Writer/Scriptwriter, Designer, AI/Tech
- [x] **ROLE-02**: User can create custom roles from Settings with name, icon, and description
- [x] **ROLE-03**: Each role has its own dedicated candidate list view at /roles/[slug]
- [x] **ROLE-04**: Role switcher tab strip at top of list view for quick navigation between roles
- [x] **ROLE-05**: User can edit or deactivate custom roles (cannot delete roles with candidates)

### Candidates

- [x] **CAND-01**: User can manually add a candidate with name, email, phone/WhatsApp, Instagram, social handles, portfolio links, and role assignment
- [x] **CAND-02**: Candidate list view shows: name, contact snippet, portfolio link (clickable), status badge, tier badge, date added, last updated
- [x] **CAND-03**: Clicking a candidate row opens profile as right-side drawer (desktop) or full screen (mobile)
- [x] **CAND-04**: Candidate profile shows: editable header (name, role, tier, status), contact block with copy buttons, portfolio link chips, status history timeline, comment thread, metadata footer
- [x] **CAND-05**: User can edit any candidate field inline from the profile view
- [x] **CAND-06**: Master View at /master shows all candidates across all roles with an additional Role column and Role filter

### Pipeline

- [x] **PIPE-01**: 12-stage pipeline statuses: Left to Review, Under Review, Good Work/Shortlisted, Not Good Work, Maybe/On the Fence, Assignment Pending, Assignment Sent, Assignment Follow-up, Assignment Passed, Assignment Failed, Hired, Rejected
- [x] **PIPE-02**: User can change candidate status via dropdown on profile — change is logged immediately with who, from, to, when
- [x] **PIPE-03**: Status history stored as insert-only event log (never overwrite) — full audit trail visible on candidate profile
- [ ] **PIPE-04**: Activity feed on dashboard shows last 10 status changes across all roles with real-time refresh (30s)
- [ ] **PIPE-05**: Clicking any activity item opens that candidate's profile
- [ ] **PIPE-06**: Bulk status change — select multiple candidates via checkboxes, change status in one action

### Tiers

- [x] **TIER-01**: All candidates start as Untiered on import or manual entry
- [x] **TIER-02**: Reviewer assigns tier (Junior/Senior/Both) from candidate profile after reviewing portfolio
- [x] **TIER-03**: Tier filter pills on every role list: All, Untiered, Junior, Senior, Both
- [x] **TIER-04**: Tier is changeable at any time — not locked after assignment
- [x] **TIER-05**: Tier changes logged in activity/audit trail

### Search & Filter

- [x] **SRCH-01**: In-role search bar — searches name, email, WhatsApp number in real time (300ms debounce)
- [x] **SRCH-02**: Global search in topbar — searches across all roles simultaneously
- [x] **SRCH-03**: Filter by status (multi-select dropdown)
- [x] **SRCH-04**: Filter by tier (pill buttons)
- [x] **SRCH-05**: Filter by date added (Today/This Week/This Month/Custom Range)
- [ ] **SRCH-06**: Filter by import source (Excel/CSV/Manual/Paste/URL/Form)
- [x] **SRCH-07**: Show duplicates only toggle
- [x] **SRCH-08**: Sort by: Last Updated (default), Date Added, Name A-Z, Status grouped
- [x] **SRCH-09**: Active filter count badge + reset all filters button
- [x] **SRCH-10**: Pagination — 50 per page with page selector and total count

### Import

- [x] **IMPT-01**: File upload — drag-and-drop or browse, accepts .xlsx, .xls, .csv
- [x] **IMPT-02**: Paste import — copy-paste raw spreadsheet data from Excel/Sheets/Notion into text area
- [x] **IMPT-03**: Smart column mapping screen: preview first 5 rows, auto-detect column types, user confirms/overrides each mapping
- [x] **IMPT-04**: Handle inconsistent formats: columns in any order, missing columns left blank, extra columns shown as Unknown, mixed data in one column separated, empty rows skipped
- [x] **IMPT-05**: Encoding-safe parsing — detect BOM, handle Windows-1252, preserve Indian names and +91 numbers
- [x] **IMPT-06**: Role assignment on import — map from sheet column or user selects target role
- [ ] **IMPT-07**: Rows with missing name or portfolio link flagged in red before proceeding
- [ ] **IMPT-08**: Bulk URL paste — paste multiple portfolio links one per line, all queued for AI extraction
- [ ] **IMPT-09**: Single URL entry — paste one portfolio link, AI extracts and creates one candidate card
- [x] **IMPT-10**: Manual entry form — fill in fields one by one for individual candidates
- [x] **IMPT-11**: Import summary after completion: imported count, skipped count, duplicates found, extraction queued count

### AI Extraction

- [ ] **AIEX-01**: Auto-extract name, contact info, and social handles from portfolio URLs (Behance, personal sites, YouTube channels, LinkedIn)
- [ ] **AIEX-02**: Review screen before save — team sees extracted data, confidence level per field (High/Medium/Low), missing fields in red
- [ ] **AIEX-03**: Team confirms, edits, or skips each extraction before data is saved to candidate
- [ ] **AIEX-04**: Graceful degradation for blocked/login-gated sites (Instagram, Google Drive) — shows "could not extract" instead of failing
- [ ] **AIEX-05**: Extraction runs async in background — progress bar shows "Extracting info from N portfolios..."
- [ ] **AIEX-06**: Raw text/paste parsing: detect phone/WhatsApp (10-13 digits with/without country code), email, Instagram handles, YouTube URLs, website URLs

### Duplicate Detection

- [x] **DUPL-01**: On import/creation, system checks for matching email or phone across all existing candidates
- [x] **DUPL-02**: Match found: yellow duplicate flag with "This candidate may already exist as [Name] in [Role]"
- [x] **DUPL-03**: Team chooses: Merge (combines records, keeps all links, prefers non-null fields) or Keep Separate (saves as new, flag remains)
- [x] **DUPL-04**: Duplicate rows show yellow warning icon in candidate table
- [x] **DUPL-05**: Filter to show only flagged duplicates

### Rejection

- [ ] **REJC-01**: When status set to Rejected, rejection reason modal appears before save
- [ ] **REJC-02**: Quick-select chips for common reasons: Quality below bar, Wrong niche, Assignment failed, Not responsive, Overqualified, Other
- [ ] **REJC-03**: Custom reason text field (or both chip + custom text)
- [ ] **REJC-04**: Message compose box for custom rejection message — logged reason shown above for reference
- [ ] **REJC-05**: Two save options: Save Only (internal log) or Save & Copy Message (copies to clipboard for external send)

### Comments & Collaboration

- [ ] **COLB-01**: Any team member can leave a comment on any candidate profile
- [ ] **COLB-02**: Comments timestamped with commenter name and avatar
- [ ] **COLB-03**: @mention support — reference other team members in comments
- [ ] **COLB-04**: Comments editable within 5 minutes of posting — not deletable (audit integrity)

### Dashboard

- [ ] **DASH-01**: Dashboard is default landing page after login
- [ ] **DASH-02**: Global stats bar: Total Candidates, Left to Review, Under Review, Shortlisted, Hired, Rejected — clicking any stat filters Master View
- [ ] **DASH-03**: Role cards grid (2 cols desktop, 1 mobile): icon, name, candidate count, tier breakdown, top 3 status mini-bar, quick actions (Add, Import, View All)
- [ ] **DASH-04**: "Create New Role" card at end of grid
- [ ] **DASH-05**: Hired vs Rejected summary table: per role counts, hire rate %, Junior/Senior hire breakdown, avg days to hire
- [ ] **DASH-06**: Recent activity feed — last 10 actions, auto-refresh 30s, clickable to candidate profile

### Responsive

- [ ] **RESP-01**: All screens mobile responsive — sidebar collapses to bottom nav or hamburger on mobile
- [ ] **RESP-02**: Candidate profile opens full-screen on mobile instead of drawer
- [ ] **RESP-03**: Role cards stack to single column on mobile
- [ ] **RESP-04**: Filter bar collapses to expandable panel on mobile

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Communications

- **COMM-01**: Direct WhatsApp send integration (via Interakt API) for rejection messages
- **COMM-02**: Direct email send integration (via Resend) for rejection messages
- **COMM-03**: Auto follow-up reminders for assignment tasks

### Permissions

- **PERM-01**: Role-based access control: admin, manager, reviewer, viewer
- **PERM-02**: Reviewers see only their assigned role candidates
- **PERM-03**: Admin/manager retain full access across all roles

### Onboarding

- **ONBD-01**: Onboarding section for hired candidates with next-steps checklist
- **ONBD-02**: ClickUp/Notion sync for hired candidates

### Analytics

- **ANLT-01**: Hiring velocity reporting with time-series charts
- **ANLT-02**: Custom field support on candidate profiles
- **ANLT-03**: CSV export of candidate data

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile app | Web responsive is sufficient for team of 5-10 |
| In-app assignment sending | v1 tracks externally sent assignments; v2 adds direct send |
| Real-time chat/messaging | Team already uses WhatsApp for internal comms |
| Video/audio playback | Links out to source platforms — no need to embed |
| ATS integrations (Greenhouse, Lever) | Not needed at current team size |
| Kanban board view | Table/list view is primary; kanban is v2+ if needed |
| Automated rejection messaging | v1 is manual custom message — automation in v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| ROLE-01 | Phase 1 | Complete |
| ROLE-02 | Phase 1 | Complete |
| ROLE-03 | Phase 2 | Complete |
| ROLE-04 | Phase 2 | Complete |
| ROLE-05 | Phase 1 | Complete |
| CAND-01 | Phase 2 | Complete |
| CAND-02 | Phase 2 | Complete |
| CAND-03 | Phase 2 | Complete |
| CAND-04 | Phase 2 | Complete |
| CAND-05 | Phase 2 | Complete |
| CAND-06 | Phase 2 | Complete |
| PIPE-01 | Phase 2 | Complete |
| PIPE-02 | Phase 2 | Complete |
| PIPE-03 | Phase 2 | Complete |
| PIPE-04 | Phase 2 | Pending |
| PIPE-05 | Phase 5 | Pending |
| PIPE-06 | Phase 2 | Pending |
| TIER-01 | Phase 2 | Complete |
| TIER-02 | Phase 2 | Complete |
| TIER-03 | Phase 2 | Complete |
| TIER-04 | Phase 2 | Complete |
| TIER-05 | Phase 2 | Complete |
| SRCH-01 | Phase 2 | Complete |
| SRCH-02 | Phase 2 | Complete |
| SRCH-03 | Phase 2 | Complete |
| SRCH-04 | Phase 2 | Complete |
| SRCH-05 | Phase 2 | Complete |
| SRCH-06 | Phase 2 | Pending |
| SRCH-07 | Phase 2 | Complete |
| SRCH-08 | Phase 2 | Complete |
| SRCH-09 | Phase 2 | Complete |
| SRCH-10 | Phase 2 | Complete |
| IMPT-01 | Phase 3 | Complete |
| IMPT-02 | Phase 3 | Complete |
| IMPT-03 | Phase 3 | Complete |
| IMPT-04 | Phase 3 | Complete |
| IMPT-05 | Phase 3 | Complete |
| IMPT-06 | Phase 3 | Complete |
| IMPT-07 | Phase 3 | Pending |
| IMPT-08 | Phase 4 | Pending |
| IMPT-09 | Phase 4 | Pending |
| IMPT-10 | Phase 3 | Complete |
| IMPT-11 | Phase 3 | Complete |
| AIEX-01 | Phase 4 | Pending |
| AIEX-02 | Phase 4 | Pending |
| AIEX-03 | Phase 4 | Pending |
| AIEX-04 | Phase 4 | Pending |
| AIEX-05 | Phase 4 | Pending |
| AIEX-06 | Phase 4 | Pending |
| DUPL-01 | Phase 3 | Complete |
| DUPL-02 | Phase 3 | Complete |
| DUPL-03 | Phase 3 | Complete |
| DUPL-04 | Phase 3 | Complete |
| DUPL-05 | Phase 3 | Complete |
| REJC-01 | Phase 5 | Pending |
| REJC-02 | Phase 5 | Pending |
| REJC-03 | Phase 5 | Pending |
| REJC-04 | Phase 5 | Pending |
| REJC-05 | Phase 5 | Pending |
| COLB-01 | Phase 5 | Pending |
| COLB-02 | Phase 5 | Pending |
| COLB-03 | Phase 5 | Pending |
| COLB-04 | Phase 5 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| DASH-06 | Phase 5 | Pending |
| RESP-01 | Phase 6 | Pending |
| RESP-02 | Phase 6 | Pending |
| RESP-03 | Phase 6 | Pending |
| RESP-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 — roadmap created, all 68 requirements mapped to 6 phases*
