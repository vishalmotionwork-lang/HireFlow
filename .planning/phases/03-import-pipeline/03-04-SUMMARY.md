---
phase: 03-import-pipeline
plan: "04"
subsystem: ui
tags: [react, import-wizard, validation, duplicate-detection, sonner]

requires:
  - phase: 03-import-pipeline
    provides: "normalizeRows, validateRows, detectDuplicates server action, importCandidates server action, ImportWizard with Steps 1-2, sessionStorage persistence"

provides:
  - "Step3Validate: validation table with red/yellow/green row status and per-row action controls"
  - "Step4Summary: import result card with counts grid and navigation to role view"
  - "Complete 4-step import wizard wired end-to-end: upload -> map -> validate -> import -> summary -> reset"
  - "source tracking (excel | csv | paste) propagated from Step1Upload through WizardState to importCandidates"

affects: [04-portfolio-extraction, 05-pipeline-management]

tech-stack:
  added: []
  patterns:
    - "useEffect async load pattern: normalize -> validate -> detectDuplicates on component mount, with cancellation flag"
    - "Immutable row decision state: setEnrichedRows uses map with index check, never mutates"
    - "source propagated via onParsed callback signature change: ParseResult + source -> WizardAction"

key-files:
  created:
    - src/components/import/Step3Validate.tsx
    - src/components/import/Step4Summary.tsx
  modified:
    - src/components/import/ImportWizard.tsx
    - src/components/import/Step1Upload.tsx

key-decisions:
  - "Step3Validate runs all data preparation (normalize, validate, detectDuplicates) on mount via useEffect — keeps Step2Mapping lean and avoids prop drilling of intermediate data"
  - "EnrichedRow type local to Step3Validate — combines ValidatedRow + DuplicateMatch + RowDecision in one structure"
  - "source field added to WizardState with default 'csv' — set from Step1Upload onParsed callback which detects from file extension or paste tab"
  - "IMPORT_COMPLETE reducer case now also sets step to 'summary' — previously only set result"
  - "Invalid rows forced to 'skip' decision and rendered greyed-out, action column shows static 'Skip' label"
  - "Duplicate rows default to 'import as new' — user must actively choose merge or skip"

requirements-completed: [IMPT-07, IMPT-11]

duration: 4min
completed: "2026-03-13"
---

# Phase 3 Plan 04: Validate + Summary Steps Summary

**4-step import wizard complete: Step3Validate with row-level error/duplicate flags and Step4Summary with counts grid wired into ImportWizard end-to-end**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-13T15:30:57Z
- **Completed:** 2026-03-13T15:34:19Z
- **Tasks:** 2 auto (checkpoint pending human verify)
- **Files modified:** 4

## Accomplishments

- Step3Validate normalizes and validates rows on mount, calls detectDuplicates server action, renders scrollable table with red (invalid) / amber (duplicate) / green (ready) status per row
- Per-row action controls: checkbox include/exclude for valid rows, 3-option dropdown (import as new / merge / skip) for duplicates, static "Skip" for invalid rows
- Step4Summary shows import result with 2x2 stats grid (Imported/Merged/Skipped/Duplicates Found) and View Candidates link to role slug
- ImportWizard wired: source tracking, IMPORT_COMPLETE transitions to summary step, placeholders replaced
- TypeScript compiles cleanly (npx tsc --noEmit passes)

## Task Commits

1. **Task 1: Build Step3Validate and Step4Summary components** - `b799ae4` (feat)
2. **Task 2: Wire Step3 and Step4 into ImportWizard** - `fc261df` (feat)

## Files Created/Modified

- `src/components/import/Step3Validate.tsx` - Validation table with error flags, duplicate warnings, per-row decisions, import button
- `src/components/import/Step4Summary.tsx` - Import result card with counts grid and View Candidates / Import More actions
- `src/components/import/ImportWizard.tsx` - Added source to WizardState, imported Step3/Step4, replaced placeholders, fixed IMPORT_COMPLETE to transition to summary
- `src/components/import/Step1Upload.tsx` - Updated onParsed callback to pass source alongside ParseResult

## Decisions Made

- `EnrichedRow` type (ValidatedRow + DuplicateMatch + RowDecision) defined locally in Step3Validate rather than in types.ts — it's a UI concern, not a shared domain type
- `source` propagated via callback signature change on Step1Upload rather than storing in ParseResult — keeps ParseResult as pure parser output
- useEffect cancellation flag prevents state updates if component unmounts mid-fetch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] IMPORT_COMPLETE reducer case was missing step transition**
- **Found during:** Task 2 (wiring ImportWizard)
- **Issue:** The existing IMPORT_COMPLETE case only set `result`, never transitioned `step` to 'summary' — wizard would stay on validate step after import
- **Fix:** Added `step: "summary"` to IMPORT_COMPLETE return value
- **Files modified:** src/components/import/ImportWizard.tsx
- **Verification:** TypeScript compiles, step flow reads: FILE_PARSED->map, MAPPING_CONFIRMED->validate, IMPORT_COMPLETE->summary
- **Committed in:** fc261df

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correct wizard flow. No scope creep.

## Issues Encountered

- `npx tsc --noEmit <specific-files>` doesn't use project tsconfig (missing JSX flag, path aliases). Used project-wide `npx tsc --noEmit` instead — passes cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full 4-step import wizard built and compiles cleanly — pending human verify (Task 3 checkpoint)
- After checkpoint approval, Phase 3 is complete and Phase 4 (Portfolio Extraction) can begin
- Blocker: Firecrawl Instagram scraping viability — run extraction tests against real portfolio links before Phase 4 commit

---
*Phase: 03-import-pipeline*
*Completed: 2026-03-13*
