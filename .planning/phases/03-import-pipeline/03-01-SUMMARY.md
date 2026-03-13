---
phase: 03-import-pipeline
plan: 01
subsystem: import-utilities
tags: [parsing, normalization, validation, sheetjs, papaparse, react-dropzone]
dependency_graph:
  requires: []
  provides:
    - src/lib/import/types.ts (RawRow, ParseResult, ColumnMapping, NormalizedRow, ValidatedRow, ImportResult)
    - src/lib/import/parseExcel.ts (parseExcelFile)
    - src/lib/import/parseCsv.ts (parseCsvString, parseCsvFile)
    - src/lib/import/columnHeuristics.ts (detectMapping)
    - src/lib/import/normalizeRows.ts (normalizeRows)
    - src/lib/import/validateRows.ts (validateRows)
  affects: []
tech_stack:
  added:
    - xlsx 0.20.3 (SheetJS Community Edition, CDN install)
    - papaparse 5.5.3
    - react-dropzone 15.0.0
    - "@types/papaparse (devDependency)"
  patterns:
    - Pure utility functions with no side effects or DB access
    - Client-only file parsing (SheetJS uses browser APIs)
    - Zod v4 schema validation (uses .issues not .errors)
key_files:
  created:
    - src/lib/import/types.ts
    - src/lib/import/parseExcel.ts
    - src/lib/import/parseCsv.ts
    - src/lib/import/columnHeuristics.ts
    - src/lib/import/normalizeRows.ts
    - src/lib/import/validateRows.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - Use namespace import for PapaParse (import * as Papa) — @types/papaparse has no default export
  - Zod v4 uses result.error.issues not result.error.errors — aligned with existing Phase 2 Zod usage
  - Standard for loop in columnHeuristics instead of Array.entries() — avoids downlevelIteration TS flag requirement
metrics:
  duration: 3 min
  completed: 2026-03-13T15:20:31Z
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 3 Plan 01: Import Parsing Utilities Summary

**One-liner:** SheetJS 0.20.3 + PapaParse CSV parsing layer with keyword heuristics, Indian phone normalization, and Zod row validation — all pure functions, client-side only.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install dependencies and create import types | 30f472d | package.json, src/lib/import/types.ts |
| 2 | Build parsing, heuristic, normalization, and validation utilities | 6ebbf03 | parseExcel.ts, parseCsv.ts, columnHeuristics.ts, normalizeRows.ts, validateRows.ts |

## What Was Built

### Dependencies Installed
- **SheetJS 0.20.3** from `cdn.sheetjs.com` — the CDN-distributed Community Edition with full encoding support. Installed via tarball URL, NOT `npm install xlsx` (which would install the stale 0.18.5 from the public registry).
- **PapaParse 5.5.3** — auto-detect delimiter, BOM handling, File and string modes
- **react-dropzone 15.0.0** — drag-and-drop file input for the wizard UI (Phase 3 plan 02)

### src/lib/import/types.ts
All types for the import pipeline:
- `RawRow`, `ParseResult` — parser outputs
- `CandidateField`, `ColumnMapping` — column mapping types
- `NormalizedRow`, `RowError`, `ValidatedRow` — normalization/validation outputs
- `DuplicateMatch`, `DuplicateInfo`, `ImportRowDecision` — deduplication types
- `ImportResult` — batch summary

### src/lib/import/parseExcel.ts
`parseExcelFile(file: File): Promise<ParseResult>` — client-only SheetJS wrapper. Uses `sheet_to_json({ header: 1 })` for raw array output (avoids sparse-key pitfall). Filters completely empty rows. First sheet only.

### src/lib/import/parseCsv.ts
Two functions:
- `parseCsvString(input: string): ParseResult` — strips BOM `\ufeff` before parsing (handles Excel UTF-8-BOM exports), auto-detects delimiter
- `parseCsvFile(file: File): Promise<ParseResult>` — PapaParse file mode wrapped in Promise

### src/lib/import/columnHeuristics.ts
`detectMapping(headers: string[]): ColumnMapping` — keyword heuristic matching. Five field groups (name, email, phone, instagram, portfolioUrl) each with domain-specific keywords. Prevents double-assignment of columns. Returns partial mapping — undetected fields are absent.

### src/lib/import/normalizeRows.ts
`normalizeRows(rows: RawRow[], mapping: ColumnMapping): NormalizedRow[]` — applies column mapping and normalizes values:
- Phone: strips non-digits, strips +91/91 prefix for Indian numbers (10-digit canonical), keeps 7+ digit international numbers
- Email: lowercased
- All strings: trimmed, empty → null

### src/lib/import/validateRows.ts
`validateRows(rows: NormalizedRow[]): ValidatedRow[]` — Zod schema validation:
- name: required (min 1 char) — implements IMPT-07
- email: valid email format if present
- portfolioUrl: valid URL if present
- phone, instagram: optional, no format constraint (already normalized upstream)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PapaParse has no default export**
- **Found during:** Task 2 verification
- **Issue:** `import Papa from 'papaparse'` fails — `@types/papaparse` declares namespace export only, no default
- **Fix:** Changed to `import * as Papa from 'papaparse'`
- **Files modified:** parseCsv.ts
- **Commit:** 6ebbf03

**2. [Rule 1 - Bug] Zod v4 uses .issues not .errors**
- **Found during:** Task 2 verification
- **Issue:** `result.error.errors` does not exist on Zod v4 ZodError — the property is `.issues`
- **Fix:** Changed `result.error.errors.map(...)` to `result.error.issues.map(...)`
- **Files modified:** validateRows.ts
- **Commit:** 6ebbf03

**3. [Rule 1 - Bug] Array.entries() requires downlevelIteration TypeScript flag**
- **Found during:** Task 2 verification
- **Issue:** `for (const [index, header] of headers.entries())` triggers TS2802 without `--downlevelIteration` flag or ES2015+ target
- **Fix:** Replaced with standard `for (let index = 0; index < headers.length; index++)` loop
- **Files modified:** columnHeuristics.ts
- **Commit:** 6ebbf03

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (30f472d, 6ebbf03) exist in git history.
