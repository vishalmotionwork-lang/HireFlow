# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline — without switching between spreadsheets, emails, and messaging apps.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-13 — Roadmap created, requirements mapped, ready for Phase 1 planning

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- No plans completed yet
- Trend: -

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2/3]: Column mapping: heuristic keyword-match vs gpt-4o-mini inference — resolve during Phase 3 planning
- [Phase 4]: Firecrawl Instagram scraping viability — run extraction tests against 20-30 real portfolio links before committing to implementation approach
- [Phase 4]: Async queue infrastructure choice (Supabase Edge Functions + pg-boss vs Inngest vs server-side promise queue) — decide at start of Phase 4 planning

## Session Continuity

Last session: 2026-03-13
Stopped at: Phase 1 planned — 3 plans in 2 waves, ready to execute
Resume file: .planning/phases/01-foundation/
