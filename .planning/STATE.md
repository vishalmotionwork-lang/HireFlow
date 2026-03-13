# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline — without switching between spreadsheets, emails, and messaging apps.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 3 of 3 in current phase
Status: Awaiting checkpoint — Task 3 (human verification) pending
Last activity: 2026-03-13 — Plan 01-03 Tasks 1+2 complete (Server Actions, Settings page with role CRUD)

Progress: [███░░░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (Plans 01, 02, and 03 Tasks 1+2)
- Average duration: 22 min
- Total execution time: 1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 tasks (checkpoint pending) | 69 min | 23 min |

**Recent Trend:**
- Phase 1 fully implemented, awaiting human verification
- Trend: On track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Next.js 16 + Supabase + Drizzle ORM chosen over Prisma (90% smaller bundle, no cold-start)
- [Roadmap]: Clerk for auth in v1, migrate to NextAuth + RBAC in v2
- [Roadmap]: Firecrawl + OpenAI gpt-4o-mini for AI extraction pipeline
- [Roadmap]: SheetJS Community + PapaParse for Excel/CSV import (Apache 2.0)
- [Roadmap]: Immutable event log for pipeline status (candidate_events table) — must be established in Phase 1 or it's expensive to retrofit
- [Roadmap]: Supabase RLS enabled before any data is written — not a cleanup step
- [01-01]: Use dotenv config({ path: '.env.local' }) not 'dotenv/config' — Next.js convention uses .env.local, not .env
- [01-01]: Table declaration order matters for FK exports: roles first, then importBatches, then candidates — Drizzle uses lazy callbacks but export variable must exist
- [01-01]: PostgreSQL installed via Homebrew (brew install postgresql@16) — Docker not available on this machine
- [01-01]: candidateStatusEnum has 12 statuses covering full hiring pipeline from left_to_review to hired/rejected
- [01-02]: Use @base-ui/react render prop pattern (render=) not asChild= — this shadcn port uses base-ui not Radix UI
- [01-02]: AppShell is a server component wrapping SidebarProvider — sidebar client state lives in sidebar.tsx
- [01-02]: Settings stub created early so sidebar links don't 404 — full role management in Plan 03
- [01-03]: Zod v4 error.flatten() returns same fieldErrors structure as v3 — compatible with existing patterns
- [01-03]: Icon state managed in React component, injected into FormData before server action call
- [01-03]: Drizzle count() function used for candidate guard check — type-safe, no raw SQL

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2/3]: Column mapping: heuristic keyword-match vs gpt-4o-mini inference — resolve during Phase 3 planning
- [Phase 4]: Firecrawl Instagram scraping viability — run extraction tests against 20-30 real portfolio links before committing to implementation approach
- [Phase 4]: Async queue infrastructure choice (Supabase Edge Functions + pg-boss vs Inngest vs server-side promise queue) — decide at start of Phase 4 planning

## Session Continuity

Last session: 2026-03-13
Stopped at: 01-03 Tasks 1+2 complete — awaiting human verification (Task 3 checkpoint). Start dev server and verify 12-step checklist in 01-03-PLAN.md Task 3.
Resume file: .planning/phases/01-foundation/01-03-PLAN.md (Task 3 verification)
