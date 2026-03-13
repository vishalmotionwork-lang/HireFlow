---
phase: 03-import-pipeline
plan: 02
subsystem: api
tags: [drizzle, postgres, server-action, import, duplicate-detection, lucide-react]

requires:
  - phase: 02-candidate-core
    provides: candidates table with isDuplicate column, getCandidates query with duplicatesOnly filter
  - phase: 01-foundation
    provides: Drizzle ORM setup, db client, schema (candidates, roles, importBatches, candidateEvents)

provides:
  - importCandidates server action with atomic insert/merge/skip execution
  - detectDuplicates helper with batch inArray query returning email/phone lookup map
  - importBatch record creation with accurate imported/skipped counts
  - Yellow TriangleAlert icon on CandidateRow when isDuplicate=true

affects:
  - 03-03 (wizard UI will call importCandidates and detectDuplicates)
  - 03-04 (import history views will use importBatch records)

tech-stack:
  added: []
  patterns:
    - "Batch duplicate detection: single inArray query with OR across email + phone, returns map keyed by 'email:<val>' / 'phone:<val>'"
    - "Merge-fill pattern: only updates null fields on existing record, never overwrites non-null data"
    - "Transaction-scoped import: all inserts, merges, and batch count updates in one tx"
    - "candidateEvents INSERT ONLY: import events use eventType='imported', merges use toValue='merged'"

key-files:
  created:
    - src/lib/actions/import.ts
  modified:
    - src/components/candidates/candidate-row.tsx

key-decisions:
  - "detectDuplicates normalises emails to lowercase for case-insensitive matching"
  - "inArray([]) guard: only build conditions for non-empty email/phone arrays to avoid Drizzle error"
  - "Merge fills null fields only — preserves existing data, sets isDuplicate=true on the existing record"
  - "importBatch importedCount tracks only new inserts, not merges (mergedCount returned separately in ImportResult)"
  - "TriangleAlert icon wrapped in span to support title tooltip (lucide props don't accept title attribute)"

patterns-established:
  - "Import action returns ImportResult | { error: string } union — callers check for 'error' key"
  - "Server action input validation: UUID regex + DB existence check for targetRoleId before any writes"
  - "candidateEvents logged for both inserted and merged candidates on import"

requirements-completed: [DUPL-01, DUPL-02, DUPL-03, DUPL-04, DUPL-05, IMPT-06, IMPT-11]

duration: 2min
completed: 2026-03-13
---

# Phase 3 Plan 02: Import Server Action + Duplicate Icon Summary

**importCandidates server action with atomic merge/insert/skip execution, batch email+phone duplicate detection via inArray, importBatch tracking, and amber TriangleAlert icon on duplicate CandidateRow entries**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-13T15:17:33Z
- **Completed:** 2026-03-13T15:19:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Server action `importCandidates` handles all three user decisions (import/merge/skip) atomically in a single Drizzle transaction
- `detectDuplicates` returns a lookup map keyed by `email:<value>` and `phone:<value>` using a single batch inArray query joined with roles
- Merge logic fills null fields only (never overwrites non-null data), sets `isDuplicate=true` on the existing record
- `importBatch` record created with accurate counts; `candidateEvents` logged for every imported or merged candidate
- `CandidateRow` now shows a yellow `TriangleAlert` icon (amber-500, 14px) when `candidate.isDuplicate === true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create importCandidates server action** - `c626a37` (feat)
2. **Task 2: Add duplicate warning icon to CandidateRow** - `c739e1a` (feat)

## Files Created/Modified
- `src/lib/actions/import.ts` - importCandidates + detectDuplicates server actions
- `src/components/candidates/candidate-row.tsx` - Added TriangleAlert icon for isDuplicate rows

## Decisions Made
- `detectDuplicates` normalises emails to lowercase to catch case mismatches (e.g. John@gmail vs john@gmail)
- Guard against `inArray([])` error: only push email/phone conditions when the respective arrays are non-empty
- `importBatches.importedCount` reflects only freshly inserted candidates; merges are counted separately in `ImportResult.mergedCount` for caller clarity
- Lucide's `TriangleAlert` SVG doesn't accept `title` attribute directly — wrapped in a `<span title="Potential duplicate">` instead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Lucide-react SVG components don't accept a `title` attribute in their props (TypeScript error TS2322). Fixed by wrapping in a `<span title="Potential duplicate">` — tooltip behavior identical, zero behavior change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `importCandidates` and `detectDuplicates` are ready for the wizard UI (03-03) to call
- `importBatch` records are being created correctly — import history views (03-04) can read them
- `duplicatesOnly` filter already exists in `getCandidates` — duplicates will be filterable immediately after any import
