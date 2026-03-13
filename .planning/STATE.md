# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline — without switching between spreadsheets, emails, and messaging apps.
**Current focus:** Phase 3 — Import Pipeline IN PROGRESS (3 of 4 plans complete).

## Current Position

Phase: 3 of 6 (Import Pipeline) — IN PROGRESS
Plan: 3 of 4 in current phase — 03-03 done
Status: Phase 3 in progress — 03-01 (deps+types), 03-02 (import action+duplicate icon), and 03-03 (import wizard UI) complete
Last activity: 2026-03-13 — 03-03 complete: ImportWizard, Step1Upload, Step2Mapping, /import route, sidebar nav

Progress: [█████████░] 65%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 17 min
- Total execution time: ~2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 69 min | 23 min |
| 02-candidate-core | 5/5 | ~57 min | ~11 min |

**Recent Trend:**
- Phase 1 complete — all 3 plans executed, 17/17 must-haves verified
- Phase 2 complete — all 5 plans executed, human verify approved 2026-03-13
- Trend: On track

*Updated after each plan completion*
| Phase 02 P02 | 4 | 2 tasks | 6 files |
| Phase 02 P04 | 3 | 2 tasks | 3 files |
| Phase 02-candidate-core P03 | 3 | 2 tasks | 3 files |
| Phase 03-import-pipeline P02 | 2 | 2 tasks | 2 files |
| Phase 03-import-pipeline P01 | 3 | 2 tasks | 6 files |
| Phase 03-import-pipeline P03 | 12 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

**Roadmap-level:**
- Next.js 16 + local PostgreSQL + Drizzle ORM chosen over Prisma (90% smaller bundle, no cold-start)
- Clerk for auth in v1, migrate to NextAuth + RBAC in v2 (DEFERRED — not in Phase 1)
- Firecrawl + OpenAI gpt-4o-mini for AI extraction pipeline (Phase 4)
- SheetJS Community + PapaParse for Excel/CSV import (Apache 2.0, Phase 3)
- Immutable event log for pipeline status (candidate_events table) — INSERT ONLY
- Supabase RLS deferred (FOUND-04) — not in Phase 1

**Phase 1 implementation:**
- Use dotenv config({ path: '.env.local' }) not 'dotenv/config' — Next.js convention
- Table declaration order matters for FK exports: roles → importBatches → candidates
- PostgreSQL installed via Homebrew (brew install postgresql@16) — Docker not available
- shadcn/ui v4 uses @base-ui/react NOT Radix UI — no `asChild`, use `render={<Component />}`
- AppShell is a server component wrapping SidebarProvider
- Zod v4 error.flatten() returns same fieldErrors structure as v3
- Icon state managed in React component, injected into FormData before server action call
- Drizzle count() function used for candidate guard check — type-safe, no raw SQL

**Phase 2 context decisions (from discuss-phase):**
- Table rows layout (8 columns: Name, Email, Portfolio, Phone, Instagram, Status, Tier, Date Added)
- Side drawer for profile (right, ~400-500px), bottom sheet on mobile
- Click-to-edit fields (saves on blur/Enter, no edit mode toggle)
- Vertical timeline for status history (newest at top)
- Clickable status badge in table row (dropdown, no confirmation)
- No bulk actions in Phase 2
- Tier badge cycles on click (Untiered → Junior → Senior → Both)
- Horizontal filter bar above table (Status multi-select, Tier, Date Added)
- Instant search (debounced 300ms, searches name + email)
- Count badges on active filters + "Clear all" reset button
- Inline "Add Candidate" form (button expands form row in table)
- Default sort: newest first

**Phase 2 implementation (02-01):**
- vitest setupFiles must load .env.local before any test module imports (ESM hoisting + Drizzle client init order)
- Shared conditions array for count + data queries prevents total mismatch (pitfall 6)
- fetchCandidateProfile server action wraps getCandidateWithEvents — Drizzle cannot run in client components
- updateCandidateField uses explicit whitelist to prevent mass assignment
- [Phase 02]: useActionState requires concrete state type (not union) for correct TypeScript inference in candidate-add-row
- [Phase 02]: StatusBadge uses onClick on DropdownMenuTrigger (base-ui pattern), not onSelect prop

**Phase 2 implementation (02-05):**
- Master view omits roleId from getCandidates — cross-role query returns all candidates
- rolesMap pattern: Record<string, string> of roleId->roleName built server-side, passed to CandidateTable
- showRoleColumn prop on CandidateTable/CandidateRow enables optional Role column with indigo badge
- Global search in topbar: useDebounce 300ms + useRouter.push to /master?q=searchterm
- SRCH-06 (import source filter) deferred to Phase 3; PIPE-06 (bulk status) deferred per user decision

**Phase 2 implementation (02-04):**
- CANDIDATE_STATUSES is exported from @/types, not @/lib/constants — fix applied during execution
- Filter state lives entirely in URL search params — no useState for filter values
- CandidateFilterBar receives showing/total as props from the server component (no client-side refetch)
- DropdownMenuCheckboxItem from base-ui used for status multi-select (consistent with existing patterns)
- Next.js 16: both params AND searchParams must be awaited in server components
- [Phase 02]: Drawer owns its data fetch (candidateId only) — keeps table lean and avoids stale object state
- [Phase 02]: selectedCandidateId (string | null) in table state — drawer is self-contained

**Phase 3 implementation (03-03):**
- Wizard state serialized to sessionStorage as-is (JSON) — survives accidental navigation, cleared on reset or back-to-upload
- Step2Mapping uses native <select> (not base-ui Select) in compact table header cells — cleaner than nested base-ui portal in thead
- updateMapping is a pure function — removes stale bidirectional assignments before applying new mapping
- Step3Validate + Step4Summary rendered as placeholders so wizard compiles end-to-end; Plan 04 replaces them

**Phase 3 implementation (03-02):**
- detectDuplicates normalises emails to lowercase; guards inArray([]) by only adding non-empty conditions
- importCandidates uses single transaction: inserts + merges + importBatch count update atomically
- Merge logic: fills null fields only, never overwrites non-null existing data, sets isDuplicate=true
- importBatch.importedCount = new inserts only; mergedCount separate in ImportResult for clarity
- TriangleAlert (lucide) wrapped in span with title attribute — lucide SVGs don't accept title prop directly
- [Phase 03-01]: PapaParse requires namespace import (import * as Papa) — @types/papaparse has no default export
- [Phase 03-01]: Zod v4 uses result.error.issues not result.error.errors for field-level errors
- [Phase 03-01]: SheetJS 0.20.3 installed from cdn.sheetjs.com CDN tarball — npm registry has stale 0.18.5

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2/3]: Column mapping: heuristic keyword-match vs gpt-4o-mini inference — resolve during Phase 3 planning
- [Phase 4]: Firecrawl Instagram scraping viability — run extraction tests against 20-30 real portfolio links before committing to implementation approach
- [Phase 4]: Async queue infrastructure choice (Supabase Edge Functions + pg-boss vs Inngest vs server-side promise queue) — decide at start of Phase 4 planning

## Session Continuity

Last session: 2026-03-13
Stopped at: Completed 03-03-PLAN.md — import wizard UI done. Ready for 03-04 (validate + summary steps).
Resume file: Run /gsd:execute-phase 03-import-pipeline to continue with 03-04
