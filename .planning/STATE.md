# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline — without switching between spreadsheets, emails, and messaging apps.
**Current focus:** Phase 2 — Candidate Core (context gathered, ready for planning)

## Current Position

Phase: 2 of 6 (Candidate Core)
Plan: 0 of TBD in current phase
Status: Context gathered — ready for planning
Last activity: 2026-03-13 — Phase 2 context discussion complete, CONTEXT.md written

Progress: [██░░░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 22 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 69 min | 23 min |

**Recent Trend:**
- Phase 1 complete — all 3 plans executed, 17/17 must-haves verified
- Trend: On track

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2/3]: Column mapping: heuristic keyword-match vs gpt-4o-mini inference — resolve during Phase 3 planning
- [Phase 4]: Firecrawl Instagram scraping viability — run extraction tests against 20-30 real portfolio links before committing to implementation approach
- [Phase 4]: Async queue infrastructure choice (Supabase Edge Functions + pg-boss vs Inngest vs server-side promise queue) — decide at start of Phase 4 planning

## Session Continuity

Last session: 2026-03-13
Stopped at: Phase 2 context gathered — CONTEXT.md written with all UI/UX decisions. Ready for /gsd:plan-phase 2.
Resume file: .planning/phases/02-candidate-core/02-CONTEXT.md
