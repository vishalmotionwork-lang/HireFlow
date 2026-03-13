---
phase: 03-import-pipeline
plan: "03"
subsystem: ui
tags: [react, next.js, react-dropzone, xlsx, papaparse, wizard, import]

requires:
  - phase: 03-01
    provides: "Import lib types, parseCsv, parseExcel, columnHeuristics"
  - phase: 03-02
    provides: "importCandidates server action, detectDuplicates action"
  - phase: 02-candidate-core
    provides: "Role type, DB schema, active roles query pattern"

provides:
  - "Import route at /import with roles server-side fetch"
  - "ImportWizard client component: useReducer 4-step state + sessionStorage persistence"
  - "Step1Upload: react-dropzone file upload + paste tab"
  - "Step2Mapping: 5-row preview table, per-column mapping dropdowns, auto-detect, role selector"
  - "Import nav item in sidebar"

affects:
  - 03-04 (builds Step3Validate and Step4Summary that plug into ImportWizard)

tech-stack:
  added: []
  patterns:
    - "useReducer wizard pattern: typed WizardState + discriminated union WizardAction"
    - "sessionStorage persistence with immutable state restoration on mount"
    - "react-dropzone integration with MIME type accept map"
    - "Column mapping: bidirectional — getFieldForColumn + updateMapping keep ColumnMapping consistent"

key-files:
  created:
    - src/app/import/page.tsx
    - src/components/import/ImportWizard.tsx
    - src/components/import/Step1Upload.tsx
    - src/components/import/Step2Mapping.tsx
  modified:
    - src/components/layout/app-sidebar.tsx

key-decisions:
  - "Wizard state serialized to sessionStorage as-is (JSON) — survives accidental navigation, cleared on reset or back-to-upload"
  - "Step2Mapping uses native <select> (not base-ui Select) for column mapping dropdowns — simpler in table header cells"
  - "updateMapping is pure/immutable — removes old field→col and col→field assignments before setting new one"

patterns-established:
  - "Wizard orchestrator renders placeholder steps for Plan 04 (validate/summary) so component compiles end-to-end today"

requirements-completed: [IMPT-01, IMPT-02, IMPT-03, IMPT-10]

duration: 12min
completed: 2026-03-13
---

# Phase 3 Plan 03: Import Wizard UI (Upload + Map Steps) Summary

**Import wizard entry point with react-dropzone file upload, paste tab, and 5-row column mapping table with auto-detected CandidateField dropdowns**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-13T15:27:30Z
- **Completed:** 2026-03-13T15:39:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Import page at `/import` (server component) fetches active roles and renders ImportWizard + manual entry fallback link
- Import nav item added to sidebar with Upload icon, placed after Roles section
- ImportWizard orchestrator: useReducer with 4-step flow (upload → map → validate → summary), sessionStorage persistence, step indicator with progress dots
- Step1Upload: react-dropzone drag-and-drop + browse for .xlsx/.xls/.csv; paste tab with parseCsvString; file name + row count shown after parse; sonner error toasts
- Step2Mapping: role selector dropdown, 5-row preview table with per-column field dropdowns, auto-detect via detectMapping(), name-required amber warning, role-column detection note

## Task Commits

1. **Task 1: Import page route + sidebar nav** - `048e15b` (feat)
2. **Task 2: ImportWizard + Step1Upload + Step2Mapping** - `00d54aa` (feat)

## Files Created/Modified

- `src/app/import/page.tsx` - Server component: fetches active roles, renders ImportWizard, manual entry link
- `src/components/import/ImportWizard.tsx` - Wizard orchestrator: useReducer, sessionStorage, step indicator, conditional step rendering
- `src/components/import/Step1Upload.tsx` - File upload (react-dropzone) + paste tab
- `src/components/import/Step2Mapping.tsx` - Column mapping: preview table + dropdowns + role selector
- `src/components/layout/app-sidebar.tsx` - Added Upload icon + Import nav item

## Decisions Made

- Used native `<select>` elements for column mapping dropdowns in Step2Mapping table headers (base-ui Select adds significant DOM nesting; native select is correct in this compact table context)
- `updateMapping` is a pure function — removes stale bidirectional assignments (col→field and field→col) before applying new mapping, preventing duplicate assignments
- sessionStorage cleared on RESET or when step returns to "upload" — prevents stale data from blocking a fresh import attempt

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ImportWizard shell is complete; Step3Validate and Step4Summary render placeholder divs
- Plan 04 can implement Step3Validate and Step4Summary and replace the placeholders directly — no refactoring needed
- WizardState already includes `validatedRows`, `duplicateInfo`, and `result` fields for Plan 04 to populate

---
*Phase: 03-import-pipeline*
*Completed: 2026-03-13*
