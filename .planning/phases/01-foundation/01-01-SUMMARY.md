---
phase: 01-foundation
plan: 01
subsystem: database
tags: [nextjs16, drizzle-orm, postgresql, typescript, docker-compose, zod]

# Dependency graph
requires: []
provides:
  - Next.js 16 project scaffold with Turbopack and shadcn/ui
  - Drizzle ORM connected to local PostgreSQL via docker-compose
  - All 6 core tables: roles, candidates, candidateEvents, candidateComments, importBatches, extractionDrafts
  - candidateStatusEnum (12 statuses) and tierEnum (4 tiers) pg enums
  - 4 default roles seeded (Video Editor, Writer/Scriptwriter, Designer, AI/Tech)
  - Inferred TypeScript types for all tables
  - npm scripts: db:push, db:generate, db:migrate, db:seed, db:studio
affects: [02-pipeline-board, 03-import-system, 04-ai-extraction, 05-settings, 06-polish]

# Tech tracking
tech-stack:
  added:
    - drizzle-orm (postgres-js adapter)
    - drizzle-kit (schema push/generate/studio)
    - postgres (postgres-js driver)
    - zod (validation, used in later plans)
    - tsx (TypeScript runner for seed scripts)
    - dotenv (env loading for drizzle config and seed)
  patterns:
    - Drizzle schema-first with pgTable and pgEnum
    - Module-level client singleton in src/db/index.ts
    - Idempotent seeding via onConflictDoNothing() on unique slug
    - Tables ordered for FK safety: roles -> importBatches -> candidates -> events/comments -> extractionDrafts
    - config({ path: '.env.local' }) for Next.js env convention compliance

key-files:
  created:
    - src/db/schema.ts
    - src/db/index.ts
    - src/db/seed.ts
    - src/types/index.ts
    - drizzle.config.ts
    - docker-compose.yml
  modified:
    - package.json

key-decisions:
  - "Use dotenv config({ path: '.env.local' }) not 'dotenv/config' — Next.js convention uses .env.local, not .env"
  - "Table declaration order matters for FK exports: roles first, then importBatches, then candidates — Drizzle uses lazy callbacks but export variable must exist"
  - "PostgreSQL installed via Homebrew (brew install postgresql@16) — Docker not available on this machine"
  - "candidateStatusEnum has 12 statuses covering full hiring pipeline from left_to_review to hired/rejected"

patterns-established:
  - "Drizzle client: import from src/db/index.ts, exports const db"
  - "Types: import from src/types/index.ts — all Drizzle-inferred"
  - "Seeding: tsx src/db/seed.ts — uses onConflictDoNothing for idempotency"

requirements-completed: [FOUND-01, FOUND-03, ROLE-01]

# Metrics
duration: 35min
completed: 2026-03-13
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Drizzle ORM + PostgreSQL schema with 6 core tables, candidateStatusEnum (12 statuses), and 4 seeded default roles powering all subsequent HireFlow phases**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-13T10:28:32Z
- **Completed:** 2026-03-13T11:03:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Installed all missing dependencies (drizzle-kit, tsx, dotenv) and added 5 db:* npm scripts
- Defined complete Drizzle schema for all 6 core tables with enums and FK constraints
- Started PostgreSQL via Homebrew, pushed schema, and seeded 4 default roles idempotently
- Next.js 16 build passes with no TypeScript errors

## Task Commits

1. **Task 1: Scaffold dependencies and project config** - `83c84c6` (chore)
2. **Task 2: Define complete database schema and types** - `5b639e4` (feat)
3. **Deviation fix: Load .env.local correctly** - `f12293b` (fix)

## Files Created/Modified

- `src/db/schema.ts` - All 6 tables with candidateStatusEnum (12 values) and tierEnum (4 values)
- `src/db/index.ts` - Drizzle client singleton (exports `db`)
- `src/db/seed.ts` - Idempotent role seeder using onConflictDoNothing
- `src/types/index.ts` - Drizzle-inferred TypeScript types + CANDIDATE_STATUSES/TIERS const arrays
- `drizzle.config.ts` - Drizzle Kit config pointing to PostgreSQL via .env.local
- `docker-compose.yml` - Local PostgreSQL 16 definition (reference; Homebrew used instead)
- `package.json` - Added db:push, db:generate, db:migrate, db:seed, db:studio scripts

## Decisions Made

- Used `config({ path: '.env.local' })` instead of `import 'dotenv/config'` because Next.js uses `.env.local` not `.env` — drizzle-kit and seed script both need this
- Declared tables in FK-safe order: `roles` → `importBatches` → `candidates` → `candidateEvents`/`candidateComments` → `extractionDrafts`
- PostgreSQL provisioned via `brew install postgresql@16` since Docker is not installed on this machine

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed dotenv loading for .env.local convention**
- **Found during:** Task 2 (db:push step)
- **Issue:** `import 'dotenv/config'` loads `.env` by default; Next.js stores secrets in `.env.local` — db:push returned "no DATABASE_URL" error
- **Fix:** Changed to `import { config } from 'dotenv'; config({ path: '.env.local' })` in both drizzle.config.ts and seed.ts
- **Files modified:** drizzle.config.ts, src/db/seed.ts
- **Verification:** `npm run db:push` succeeded; `npm run db:seed` inserted 4 roles
- **Committed in:** f12293b

**2. [Rule 3 - Blocking] Installed PostgreSQL via Homebrew (Docker not available)**
- **Found during:** Task 2 (docker compose up step)
- **Issue:** Docker not installed on this machine; `docker compose` command not found
- **Fix:** `brew install postgresql@16`, started service, created `hireflow` user and database manually
- **Verification:** `npm run db:push` and `npm run db:seed` succeeded against local Homebrew Postgres
- **Committed in:** Not a code change; docker-compose.yml kept for reference (works when Docker is available)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to reach a working state. docker-compose.yml retained for team members with Docker. No scope creep.

## Issues Encountered

- npm `.bin/next` binary was a flat copy (not a symlink) after previous npm installs — `npm rebuild` restored the symlink and fixed the build
- Dev server start was blocked by a project hook requiring tmux; `npm run build` used for verification instead (build success confirms app correctness)

## User Setup Required

None for team members with Docker — run `docker compose up -d` then `npm run db:push && npm run db:seed`.

For local dev without Docker: install PostgreSQL via Homebrew, create hireflow user/database, then run the same commands.

## Next Phase Readiness

- All 6 core tables exist in PostgreSQL with correct columns, constraints, and foreign keys
- 4 default roles seeded: Video Editor, Writer/Scriptwriter, Designer, AI/Tech
- TypeScript types ready for import from `src/types/index.ts`
- Drizzle `db` client ready for import from `src/db/index.ts`
- Ready for Phase 2: Pipeline Board (Kanban view, candidate cards, status transitions)

---
*Phase: 01-foundation*
*Completed: 2026-03-13*
