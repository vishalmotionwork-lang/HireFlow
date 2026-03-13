---
phase: 02-candidate-core
plan: "01"
subsystem: candidate-data-layer
tags: [server-actions, drizzle, zod, vitest, queries, hooks]
dependency_graph:
  requires: [src/db/schema.ts, src/types/index.ts, src/lib/constants.ts]
  provides: [src/lib/actions/candidates.ts, src/lib/queries/candidates.ts, src/hooks/use-debounce.ts]
  affects: [all Phase 2 UI plans that need candidate mutations or queries]
tech_stack:
  added: [vitest@4.1.0]
  patterns: [server-actions-with-zod, drizzle-transactions, shared-conditions-array, db-integration-tests]
key_files:
  created:
    - src/lib/actions/candidates.ts
    - src/lib/queries/candidates.ts
    - src/hooks/use-debounce.ts
    - vitest.config.ts
    - vitest.setup.ts
    - src/lib/actions/__tests__/candidates.test.ts
  modified:
    - package.json
decisions:
  - "vitest setupFiles used to load .env.local before any module imports (ESM hoist issue)"
  - "Shared conditions array pattern for count + data queries prevents total mismatch"
  - "fetchCandidateProfile is a 'use server' wrapper — Drizzle cannot run in client components"
  - "updateCandidateField uses whitelist to prevent mass assignment"
metrics:
  duration: "4 min"
  completed: "2026-03-13"
  tasks_completed: 3
  files_created: 6
  files_modified: 1
---

# Phase 2 Plan 1: Candidate Data Layer Summary

**One-liner:** Complete candidate data layer — Zod-validated server actions with Drizzle transactions, paginated query with 7-parameter filtering (including phone search per SRCH-01), and 5 passing integration tests against real PostgreSQL.

## What Was Built

### Server Actions (`src/lib/actions/candidates.ts`)

5 exported functions:

- **`createCandidate(formData)`** — Zod schema validation (roleId, name, email, phone, instagram, portfolioUrl), INSERT candidate + INSERT 'created' event into candidateEvents. Returns `{ success: true }` or `{ error: fieldErrors }`.
- **`changeStatus(candidateId, fromStatus, toStatus)`** — Atomic `db.transaction()` wrapping UPDATE candidates + INSERT status_change event. Returns `{ success: true }`.
- **`changeTier(candidateId, fromTier, toTier)`** — Atomic `db.transaction()` wrapping UPDATE candidates + INSERT tier_change event. Returns `{ success: true }`.
- **`updateCandidateField(candidateId, field, value)`** — Whitelist-guarded single field UPDATE. Rejects any field not in `['name', 'email', 'phone', 'instagram', 'portfolioUrl']`. Returns `{ success: true }` or `{ error: string }`.
- **`fetchCandidateProfile(candidateId)`** — `'use server'` wrapper around `getCandidateWithEvents`. Safe to call from client components; Drizzle queries cannot run directly in client components.

### Query Functions (`src/lib/queries/candidates.ts`)

- **`getCandidates(params)`** — Supports: roleId (optional), page, status[] (inArray), tier (eq), q (ilike on name + email + phone per SRCH-01), dateRange ('today'/'week'/'month' computed from current date), duplicatesOnly. Shared conditions array between count query and data query (prevents total mismatch per research pitfall 6). Returns `{ candidates, total, page, totalPages }`.
- **`getCandidateWithEvents(candidateId)`** — Fetches candidate + all events ordered by createdAt DESC. Returns `{ candidate, events }` or `null`.

### Debounce Hook (`src/hooks/use-debounce.ts`)

Generic `useDebounce<T>(value, delay)` hook — hand-rolled with useState + useEffect + cleanup. No package dependency.

### Vitest Config

- `vitest.config.ts` — node environment, `@` alias matching tsconfig paths, setupFiles pointing to `vitest.setup.ts`
- `vitest.setup.ts` — loads `.env.local` before any module imports (fixes ESM hoisting issue with Drizzle client initialization)

### Integration Tests (`src/lib/actions/__tests__/candidates.test.ts`)

5 tests, all passing against real PostgreSQL:
1. `createCandidate` — valid FormData creates candidate + logs 'created' event
2. `createCandidate` — empty name returns field errors, no candidate created
3. `changeStatus` — updates status in DB + logs status_change event with fromValue/toValue
4. `changeTier` — updates tier in DB + logs tier_change event with fromValue/toValue
5. `updateCandidateField` — updates allowed field; rejects disallowed field ('id')

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESM hoisting broke dotenv in test file**

- **Found during:** Task 3
- **Issue:** `import { config } from "dotenv"; config({ path: ".env.local" })` at top of test file ran AFTER `@/db` module was imported (ESM `import` statements hoist above synchronous code). Drizzle client initialized with no DATABASE_URL, connecting to OS default database.
- **Fix:** Added `vitest.setup.ts` using vitest's `setupFiles` configuration — setup files run before test module imports, so DATABASE_URL is available when `@/db` initializes.
- **Files modified:** `vitest.config.ts`, `vitest.setup.ts`, `candidates.test.ts` (removed duplicate dotenv call)
- **Commit:** 9d742a1

## Key Decisions Made

1. **`setupFiles` for env loading** — Cannot use `dotenv.config()` inside test files for Drizzle initialization. `vitest.setup.ts` via `setupFiles` runs before imports.
2. **Shared conditions array** — `const conditions = []` built once and passed to both `count()` and `select()` queries. Prevents total count mismatch (research pitfall 6).
3. **`fetchCandidateProfile` as server action wrapper** — Drizzle's `postgres-js` client uses Node.js TCP/network, which cannot run in client components. The server action is the boundary.
4. **Whitelist in `updateCandidateField`** — Explicit allowlist `['name', 'email', 'phone', 'instagram', 'portfolioUrl']` prevents mass assignment to system fields (id, createdAt, roleId, etc.).

## Verification Checklist

- [x] All files compile: `npx tsc --noEmit` passes (no src/ errors)
- [x] Server actions use 'use server' directive
- [x] Transactions wrap multi-write operations (status change, tier change)
- [x] getCandidates shares conditions between count and data queries
- [x] getCandidates search includes phone field (SRCH-01)
- [x] All conditions guarded against undefined (Drizzle pitfall avoided)
- [x] fetchCandidateProfile server action wraps getCandidateWithEvents
- [x] All 5 integration tests pass: `npx vitest run`

## Self-Check: PASSED

Files verified:
- src/lib/actions/candidates.ts — FOUND
- src/lib/queries/candidates.ts — FOUND
- src/hooks/use-debounce.ts — FOUND
- vitest.config.ts — FOUND
- vitest.setup.ts — FOUND
- src/lib/actions/__tests__/candidates.test.ts — FOUND

Commits verified:
- da3866d — feat(02-01): add candidate server actions with Zod validation
- 6ba8fc7 — feat(02-01): add getCandidates query with filters/pagination and useDebounce hook
- 9d742a1 — feat(02-01): configure vitest and add integration tests for candidate server actions

Tests: 5/5 passing against real PostgreSQL database.
