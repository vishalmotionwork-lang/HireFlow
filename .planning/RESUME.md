# HireFlow — Resume Context

## Last Session: 2026-03-13
## Status: PHASES 3-4 COMPLETE — Phase 5 (AI Extraction) + Phase 6 (Responsive) remaining

## What Was Built This Session

### Phase 3: Core CRM Completion (ALL 5 PLANS DONE)
- **3.1 Schema Migration**: 9 new candidate columns (portfolioLinks, socialHandles, rejectionReason, rejectionMessage, rejectionMarkedAt, isDeleted, duplicateOfId, duplicateAction, source, lastModifiedBy), 2 new comment columns (mentions, authorAvatar), new `activities` table. DB pushed.
- **3.2 Rejection + Bulk**: RejectionModal (reason chips + message compose), StatusBadge intercepts rejection, BulkActionBar (checkbox column + sticky bar for multi-select status change)
- **3.3 Comments**: CommentThread component (post, edit within 5min, threaded display), CRUD server actions
- **3.4 Dashboard**: Real stats from DB (getDashboardStats, getRoleCandidateCounts), ActivityFeed component, two-column layout (roles + feed)
- **3.5 Duplicates**: checkForDuplicates utility, DuplicateBanner in drawer, MergeModal (side-by-side comparison), mergeCandidates server action (combines contacts, moves events/comments, soft-deletes source)

### Phase 4: Import Pipeline (ALL PLANS DONE)
- Already built by prior session: parseCsv, parseExcel, columnHeuristics, normalizeRows, validateRows
- Already built by prior session: ImportWizard (4-step reducer + session persistence), Step1Upload (file drag-drop + paste), Step2Mapping (auto-detect + preview), Step3Validate (row validation + duplicate detection + per-row decisions), Step4Summary
- Server actions: detectDuplicates (batch lookup), importCandidates (insert/merge/skip with transaction)

## What To Do Next

### Phase 5: AI Extraction Engine (3 plans)
#### Plan 5.1: Extraction Infrastructure
- Install `@anthropic-ai/sdk`
- Create `src/lib/ai/extract.ts` — orchestrator
- Create `src/lib/ai/claude.ts` — Claude API wrapper with extraction prompt
- Create `src/lib/ai/textParser.ts` — regex contact parser (email, phone, IG, URLs)
- Create `src/lib/ai/confidence.ts` — platform-specific confidence scoring
- Create platform detector (Instagram, YouTube, Behance, LinkedIn, etc.)
- Update extractionDrafts table schema if needed

#### Plan 5.2: Extraction Queue + Progress UI
- Extraction queue using extractionDrafts table (no Redis)
- `ExtractionQueue` component (progress bar, status per URL)
- Extraction worker (processes pending jobs)
- Wire "Extract info" button on candidate profile
- Batch extraction after import

#### Plan 5.3: Extraction Review Screen
- `ExtractionReviewCard` (confidence badges, editable fields, confirm/skip)
- Wire into post-import flow + single-candidate extraction

### Phase 6: Responsive Polish (2 plans)
#### Plan 6.1: Mobile Layout
- Sidebar → hamburger, drawer → full-screen, cards → single column, filter bar → collapsible

#### Plan 6.2: Polish + Error States
- Empty states, loading skeletons, error boundaries, toast notifications, keyboard shortcuts

## Key Files Created This Session
| File | What |
|------|------|
| `src/db/schema.ts` | Updated: +9 candidate cols, +2 comment cols, +activities table |
| `src/types/index.ts` | Updated: +Activity, PortfolioLink, SocialHandle types |
| `src/lib/constants.ts` | Updated: +REJECTION_REASONS, IMPORT_SOURCES |
| `src/lib/queries/candidates.ts` | Updated: +isDeleted filter |
| `src/lib/queries/stats.ts` | NEW: getDashboardStats, getRoleCandidateCounts, getRoleTierBreakdown |
| `src/lib/queries/activities.ts` | NEW: getRecentActivities |
| `src/lib/actions/candidates.ts` | Updated: rejection in changeStatus, +checkDuplicatesAction, +mergeCandidates |
| `src/lib/actions/activities.ts` | NEW: createActivity helper |
| `src/lib/actions/comments.ts` | NEW: createComment, editComment, getComments |
| `src/lib/duplicate.ts` | NEW: checkForDuplicates (email + phone matching) |
| `src/components/candidates/rejection-modal.tsx` | NEW |
| `src/components/candidates/comment-thread.tsx` | NEW |
| `src/components/candidates/duplicate-banner.tsx` | NEW |
| `src/components/candidates/merge-modal.tsx` | NEW |
| `src/components/candidates/bulk-action-bar.tsx` | NEW |
| `src/components/candidates/status-badge.tsx` | Rewritten: +rejection modal intercept |
| `src/components/candidates/candidate-table.tsx` | Rewritten: +checkbox selection + bulk bar |
| `src/components/candidates/candidate-row.tsx` | Updated: +checkbox column |
| `src/components/candidates/candidate-drawer.tsx` | Updated: +CommentThread, +DuplicateBanner, +rejection section |
| `src/components/dashboard/activity-feed.tsx` | NEW |
| `src/app/dashboard/page.tsx` | Rewritten: real stats + activity feed |

## Tech Stack (DO NOT CHANGE)
- Next.js 16 + React 19 + TypeScript 5
- Drizzle ORM (NOT Prisma) + PostgreSQL 16
- shadcn/ui v4 (@base-ui/react, NOT Radix)
- Tailwind CSS 4
- Server actions (NOT REST API routes)
- MOCK_USER auth (Clerk deferred)

## Build Status: PASSES CLEAN
```bash
cd ~/HireFlow && cat .planning/RESUME.md
```
