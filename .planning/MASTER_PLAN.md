# HireFlow — Master Execution Plan v2
### Based on PRD v1.0 + Complete Implementation Plan | Adapted to existing codebase

> **Stack**: Next.js 16 + PostgreSQL (local) + Drizzle ORM + shadcn/ui (@base-ui) + Tailwind 4
> **Auth**: Clerk (to be added)
> **Current state**: Phases 1-2 complete (app shell, candidate CRUD, pipeline, search/filter, master view)

---

## Gap Analysis: What Exists vs What's Needed

### Already Built (Phases 1-2)
- [x] App shell (sidebar, topbar, layout)
- [x] 6 DB tables (roles, candidates, candidateEvents, candidateComments, importBatches, extractionDrafts)
- [x] 4 default roles seeded
- [x] Role CRUD from Settings (create, edit, deactivate, icon picker)
- [x] Candidate table with 8 columns + pagination (50/page)
- [x] Candidate drawer (profile, inline edit, status history)
- [x] 12-status pipeline with status change + event logging
- [x] Tier assignment (Untiered/Junior/Senior/Both)
- [x] Search (in-role + global, debounced 300ms)
- [x] Filter bar (status multi-select, tier pills, date, duplicates toggle, sort)
- [x] Master view (cross-role, role column)
- [x] Manual candidate add (inline form)

### Schema Gaps (from new PRD)
| Gap | Current | Needed |
|-----|---------|--------|
| Portfolio links | Single `portfolioUrl` text | `portfolioLinks` JSON array `[{url, sourceType, label}]` |
| Social handles | None | `socialHandles` JSON array `[{platform, handle, url}]` |
| Rejection fields | None | `rejectionReason`, `rejectionMessage`, `rejectionMarkedAt` |
| Soft delete | None | `isDeleted` boolean |
| Duplicate linking | `isDuplicate` flag only | `duplicateOfId` FK, `duplicateAction` |
| Import source | None on candidate | `source` enum (EXCEL, CSV, MANUAL, etc.) |
| Last modified by | None | `lastModifiedBy` text |
| Comment extras | Basic | Add `mentions` JSON, `authorAvatar`, `editedAt` |

### Feature Gaps (Priority Order)
1. **Schema migration** — update candidates table for new fields
2. **Auth (Clerk)** — replace mock user
3. **Rejection flow** — modal + reason chips + message compose
4. **Comments system** — comment thread on candidate profile
5. **Dashboard stats** — real data (not placeholders)
6. **Activity feed** — last 10 actions, auto-refresh
7. **Hired vs Rejected table** — dashboard component
8. **Duplicate merge** — merge UI + merge logic
9. **Bulk status change** — multi-select rows + change
10. **Import pipeline** — file upload, paste, column mapping, duplicate detection
11. **AI extraction** — Claude API + scraper + review queue
12. **Mobile responsive** — polish all screens

---

## Execution Plan: 4 Phases

### Phase 3: Core CRM Completion (Schema + Auth + Rejection + Comments + Dashboard)
**Goal**: Complete the v1 Core CRM — auth, rejection flow, comments, real dashboard stats, activity feed
**Estimated**: 4-5 plans

#### Plan 3.1: Schema Migration + Clerk Auth
**Tasks:**
1. Migrate `candidates` schema:
   - `portfolioUrl` → `portfolioLinks` (jsonb, default `[]`)
   - Add `socialHandles` (jsonb, default `[]`)
   - Add `rejectionReason` (text, nullable)
   - Add `rejectionMessage` (text, nullable)
   - Add `rejectionMarkedAt` (timestamp, nullable)
   - Add `isDeleted` (boolean, default false)
   - Add `duplicateOfId` (uuid, nullable, self-referencing FK)
   - Add `duplicateAction` (text, nullable)
   - Add `source` (text, default 'manual')
   - Add `lastModifiedBy` (text, nullable)
2. Update `candidateComments` schema:
   - Add `mentions` (jsonb, default `[]`)
   - Add `authorAvatar` (text, nullable)
   - Add `editedAt` (timestamp, nullable)
3. Add `Activity` table (denormalized):
   - `id`, `type`, `actorId`, `actorName`, `actorAvatar`
   - `candidateId`, `candidateName`, `roleId`, `roleName`
   - `metadata` (jsonb), `createdAt`
4. Install + configure Clerk:
   - `npm i @clerk/nextjs`
   - Add middleware for route protection
   - Add Clerk provider to root layout
   - Create sign-in/sign-up pages
   - Replace all MOCK_USER references with Clerk's `currentUser()`
   - Update all server actions to use `auth()` for userId
5. Update all existing queries to exclude `isDeleted = true`
6. Update candidate drawer to handle `portfolioLinks` array (chips) instead of single URL
7. Update candidate add form for new fields

**Files changed**: schema.ts, seed.ts, middleware.ts, layout.tsx, all server actions, candidate components

#### Plan 3.2: Rejection Flow + Bulk Status Change
**Tasks:**
1. Create `RejectionModal` component:
   - Quick-select chips: "Quality below bar", "Wrong niche", "Assignment failed", "Not responsive", "Overqualified", "Other"
   - Free text reason field
   - Message compose textarea
   - Buttons: Cancel, Save Internally, Save & Copy Message
2. Wire status dropdown: selecting "Rejected" opens RejectionModal instead of direct save
3. Update `updateCandidateStatus` server action:
   - If `REJECTED`: require `rejectionReason`, save `rejectionMessage` + `rejectionMarkedAt`
   - If moving FROM `REJECTED`: clear `rejectionMarkedAt`, keep reason in history
   - Create Activity record on every status change
4. Add rejection section to candidate drawer (visible only when status = REJECTED)
5. Bulk status change:
   - Add checkbox column to CandidateTable
   - Sticky bulk action bar when ≥1 row selected: "X selected | Change Status ▾ | Clear"
   - Create `bulkUpdateStatus` server action
   - If bulk rejecting, show rejection modal once (applies same reason to all)

**Files changed**: New RejectionModal, StatusBadge, CandidateTable, CandidateRow, candidate-drawer, candidates.ts actions

#### Plan 3.3: Comments System
**Tasks:**
1. Create `CommentThread` component:
   - Display existing comments (avatar, name, text, relative time)
   - Comment input with @mention support (search team members)
   - Post button
   - Edit button (own comments, < 5 min old)
2. Server actions:
   - `createComment(candidateId, text, mentions[])`
   - `editComment(commentId, text)` — author check + 5-min window
   - `getComments(candidateId)`
3. Wire into candidate drawer
4. Create Activity record on comment creation
5. @mention dropdown: list Clerk org members (or hardcoded team list for v1)

**Files changed**: New CommentThread, candidate-drawer update, new comment server actions

#### Plan 3.4: Dashboard Stats + Activity Feed + Hired/Rejected Table
**Tasks:**
1. Create `getDashboardStats()` query:
   - Global counts: total, left_to_review, under_review, shortlisted, hired, rejected
   - Per-role breakdown: role name, total, junior/senior/untiered split, top 3 statuses
   - Hired vs Rejected: per role, hire rate %, avg days to hire
2. Create `StatsBar` component (6 stat boxes, clickable → filters master view)
3. Update `RoleCard` to show real data (tier breakdown, status mini-bar)
4. Create `HiredRejectedTable` component
5. Create `ActivityFeed` component:
   - Fetch last 10 activities
   - Auto-refresh every 30s (React Query `refetchInterval`)
   - Click item → open candidate drawer
6. Update dashboard page to compose all sections

**Files changed**: New stats query, StatsBar, ActivityFeed, HiredRejectedTable, dashboard/page.tsx

#### Plan 3.5: Duplicate Detection + Merge Flow
**Tasks:**
1. Create `checkForDuplicates(candidate)` utility:
   - Match by email (case-insensitive exact match)
   - Match by phone/whatsapp (normalized: strip spaces, dashes, +, parens)
   - Return matched candidate IDs + match type
2. Wire duplicate check into candidate creation + import flow
3. Create `DuplicateBanner` component (shows on candidate profile if flagged)
4. Create `MergeModal` component:
   - Side-by-side comparison of two candidates
   - Merge action: combine portfolioLinks, socialHandles, fill missing contact fields
   - Keep Separate action: dismiss flag
5. Create `mergeCandidates` server action:
   - Combine links + contacts (prefer non-null target)
   - Move comments + events from source to target
   - Soft-delete source candidate
6. Update all candidate list queries to show duplicate icon

**Files changed**: New duplicate.ts, DuplicateBanner, MergeModal, candidate creation/import wiring

---

### Phase 4: Import Pipeline
**Goal**: Team can bulk-import candidates from Excel/CSV files or pasted data with column mapping and validation
**Estimated**: 3 plans

#### Plan 4.1: File Upload + Paste Import + Column Mapping
**Tasks:**
1. Install xlsx + papaparse
2. Create import page/modal with method selector:
   - File upload (drag-drop zone, .xlsx/.xls/.csv, max 10MB)
   - Paste data (textarea for spreadsheet copy-paste)
   - Bulk URL paste (one per line)
   - Manual entry (already exists)
3. Create `fileParser.ts` (xlsx + papaparse)
4. Create `columnDetector.ts` (keyword-based auto-mapping)
5. Create `ColumnMappingScreen` component:
   - Preview first 5 rows
   - Auto-detected column mappings (user can override)
   - Target role selector
   - Validation: flag rows missing name or portfolio
   - Import button with row count
6. Create `textImporter.ts` (detect tabs/commas/raw text)

**Files changed**: New import components + parsers, import page/modal

#### Plan 4.2: Import Execution + Summary + Duplicate Detection
**Tasks:**
1. Create `confirmImport` server action:
   - Takes mapped rows + roleId + column map
   - Creates candidates in batch
   - Runs duplicate check on each
   - Tracks import batch (importBatches table)
   - Returns summary: imported, skipped, duplicates
2. Create `ImportProgress` component (progress bar during import)
3. Create `ImportSummary` component (results after import)
4. Wire duplicate detection into import flow (flag, don't block)
5. Source tagging: set `source` field based on import method

**Files changed**: Import server actions, ImportProgress, ImportSummary

#### Plan 4.3: Bulk URL Paste + Single URL Entry
**Tasks:**
1. Create `BulkURLPaste` component:
   - Textarea: one URL per line
   - URL validation before proceeding
   - Role selector (required)
   - Creates candidate stubs with portfolio link, queues for extraction
2. Single URL entry flow (paste one link → create candidate with extraction)
3. Wire into import modal as separate tab

**Files changed**: BulkURLPaste component, import modal update

---

### Phase 5: AI Extraction Engine
**Goal**: Extract contact info from portfolio URLs using Claude API, with review before save
**Estimated**: 3 plans

#### Plan 5.1: Extraction Infrastructure
**Tasks:**
1. Install `@anthropic-ai/sdk` (or use fetch)
2. Create `lib/ai/extract.ts` — orchestrator
3. Create `lib/ai/claude.ts` — Claude API wrapper with extraction prompt
4. Create `lib/ai/textParser.ts` — regex-based contact parser (email, phone, Instagram, URLs)
5. Create `lib/ai/confidence.ts` — platform-specific confidence scoring
6. Create platform detector (Instagram, YouTube, Behance, LinkedIn, website, etc.)
7. Update ExtractionDraft table schema if needed

#### Plan 5.2: Extraction Queue + Progress UI
**Tasks:**
1. Create extraction queue (simple in-DB queue using extractionDrafts table status)
   - No Redis/BullMQ for v1 — use DB polling or server-side promise queue
2. Create `ExtractionQueue` component (progress bar, status per URL)
3. Create extraction worker (processes pending jobs, updates status)
4. Wire "Extract info from links" button on candidate profile
5. Batch extraction after import (auto-queue portfolio URLs missing contact info)

#### Plan 5.3: Extraction Review Screen
**Tasks:**
1. Create `ExtractionReviewCard` component:
   - Shows extracted fields with confidence badges (HIGH green, MEDIUM yellow, LOW red)
   - Missing fields in red
   - All fields editable before confirm
   - Skip or Confirm & Save buttons
   - Navigate through queue
2. Wire review into post-import flow
3. Wire review into single-candidate extraction

---

### Phase 6: Responsive Polish + Final
**Goal**: Mobile-ready, polished UI across all screens
**Estimated**: 2 plans

#### Plan 6.1: Mobile Layout
**Tasks:**
1. Sidebar → hamburger menu overlay on mobile
2. Candidate profile → full-screen on mobile (not drawer)
3. Dashboard role cards → single column
4. Filter bar → collapsible "Filters" button → bottom sheet
5. Table → card list on mobile (name + status + tier per card)
6. Import modal → full-screen steps on mobile

#### Plan 6.2: Polish + Error States
**Tasks:**
1. Empty states for all lists (no candidates, no imports, no comments)
2. Loading skeletons for all async sections
3. Error boundaries on key sections
4. Toast notifications for all mutations (success + error)
5. Keyboard shortcuts: ESC to close drawer, Enter to save inline edit
6. Role reorder (drag in Settings)

---

## Summary

| Phase | Plans | Focus | Priority |
|-------|-------|-------|----------|
| 3: Core CRM Completion | 5 | Schema + Auth + Rejection + Comments + Dashboard + Duplicates | **NOW** |
| 4: Import Pipeline | 3 | File/paste import + column mapping + bulk URL | **NEXT** |
| 5: AI Extraction | 3 | Claude API + scraper + review queue | AFTER IMPORT |
| 6: Responsive Polish | 2 | Mobile + error states + polish | FINAL |

**Total remaining**: 13 plans across 4 phases
**Execution order**: 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 4.1 → 4.2 → 4.3 → 5.1 → 5.2 → 5.3 → 6.1 → 6.2

---

## Key Technical Decisions (Adapting New Plan to Existing Stack)

| New Plan Says | We Use Instead | Reason |
|---------------|---------------|--------|
| Prisma ORM | Drizzle ORM | Already built, 90% smaller bundle |
| Next.js 14 | Next.js 16 | Already running, newer features |
| React Query + Zustand | Server Components + URL params | Already built, simpler, SSR-first |
| BullMQ + Redis | DB-based queue (extractionDrafts) | No Redis infra needed for v1 |
| Puppeteer scraper | Firecrawl or direct fetch | Lighter, no headless browser needed |
| REST API routes | Server actions | Already built, Next.js 16 pattern |
| Clerk auth | Clerk auth | **Same — install this** |
