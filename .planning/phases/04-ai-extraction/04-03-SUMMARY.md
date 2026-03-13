---
phase: 04-ai-extraction
plan: "03"
subsystem: extraction-review-ui
tags: [review-modal, confidence-badges, contact-parsing, import-wizard, human-in-the-loop]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [extraction-review-flow, contact-parse-field]
  affects: [import-wizard, candidate-creation]
tech_stack:
  added: []
  patterns:
    - "useTransition for async server action pending states"
    - "useCallback for stable re-fetch callback after confirm/skip"
    - "IIFE in JSX for inline conditional rendering with early return"
    - "Cast ExtractionStatusDraft as ExtractionDraft — same shape, avoid redundant re-fetch"
key_files:
  created:
    - src/components/import/ExtractionReviewList.tsx
    - src/components/import/ExtractionReviewModal.tsx
    - src/components/import/ContactParseField.tsx
  modified:
    - src/components/import/ImportWizard.tsx
    - src/components/import/ExtractionProgress.tsx
    - src/app/api/extraction-status/[batchId]/route.ts
decisions:
  - "Cast ExtractionStatusDraft to ExtractionDraft for review — same shape from API, avoids redundant DB roundtrip"
  - "Auto-advance to next completed draft after confirm/skip via getReviewableIds navigation"
  - "useCallback for refreshReviewDrafts and review handlers to avoid stale closure issues"
  - "fieldConfidence added to polling API response so review modal can render per-field confidence badges without separate fetch"
  - "ContactParseField embedded in ExtractionReviewModal as expandable section — paste shortcut within review flow"
  - "IIFE in JSX for review render block — needed allDone early return within JSX without extracting to function"
metrics:
  duration: "~6 min"
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_modified: 6
---

# Phase 4 Plan 3: Extraction Review UI Summary

**One-liner:** ExtractionReviewModal + ExtractionReviewList + ContactParseField with confidence badge rendering, editable fields, and full ImportWizard review step wiring.

## What Was Built

### Task 1: ExtractionReviewList + ExtractionReviewModal + ContactParseField

**`src/components/import/ExtractionReviewList.tsx`**
- Scrollable list of all drafts in the batch with per-item status badges (Ready/Failed/Applied/Skipped/Processing)
- Overall confidence badge per item using `getConfidenceLabel()` + `getConfidenceColor()` from confidence.ts
- Summary header: "X of Y reviewed"
- Completed drafts are clickable (calls `onSelectDraft`); failed drafts show inline error; applied/reviewed are dimmed
- Selected draft highlighted with blue left border indicator

**`src/components/import/ExtractionReviewModal.tsx`**
- Editable fields for name, email, phone, instagram, location, bio — each initialized from `extractedData` jsonb
- Per-field confidence badge on the right using `getConfidenceLabel()` + `getConfidenceColor()`
- Missing/empty fields render with red border and "Not found" placeholder (not red text on filled fields)
- `fieldConfidence` jsonb parsed to build a `Record<string, number>` lookup
- Portfolio links + social handles rendered as read-only chips (non-editable in v1)
- Confirm: collects all edited field values, calls `confirmExtraction(draftId, edits)` — immutable, original draft.extractedData unchanged
- Skip: calls `skipExtraction(draftId)`
- Prev/Next navigation (only visible when hasPrev/hasNext)
- Loading states via `useTransition`
- Error handling via sonner toast on server action failure
- Expandable ContactParseField section ("Paste raw contact info to fill fields")

**`src/components/import/ContactParseField.tsx`**
- Textarea with live parsing on `onChange` and `onPaste`
- Preview panel shows detected emails, phones, Instagram handles, URLs with icons
- "Apply to fields" button calls `onParsed(parsed)` — parent decides which fields to fill
- In ExtractionReviewModal: applies first detected value to each field only if currently empty

### Task 2: ImportWizard review step + API extension

**`src/components/import/ImportWizard.tsx`** — Review step wired:
- After ExtractionProgress `onComplete`, transitions directly to review (casts ExtractionStatusDraft as ExtractionDraft — same shape)
- Auto-selects first reviewable draft
- Side-by-side layout: ExtractionReviewList (w-64 left panel) + ExtractionReviewModal (flex-1 right panel)
- `refreshReviewDrafts()` re-fetches from `/api/extraction-status/[batchId]` after each confirm/skip
- Auto-advances to next completed draft using `getReviewableIds()` navigation
- When all drafts are applied/reviewed/failed: completion summary with confirmed/skipped/failed counts + "Done" button
- Full flow: URL paste → progress bar → review list+modal → completion summary → reset

**`src/app/api/extraction-status/[batchId]/route.ts`** — Extended:
- Added `fieldConfidence` to `ExtractedDraftSummary` and draft response
- Required for ExtractionReviewModal per-field confidence badge rendering

**`src/components/import/ExtractionProgress.tsx`** — Type extended:
- Added `fieldConfidence: unknown` to `ExtractionStatusDraft` interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing fieldConfidence in polling API**
- **Found during:** Task 2
- **Issue:** ExtractionReviewModal needs `fieldConfidence` from draft to render per-field confidence badges, but the polling API only returned `extractedData`, not `fieldConfidence`
- **Fix:** Added `fieldConfidence` to `ExtractedDraftSummary` interface and draft response mapping in route.ts
- **Files modified:** `src/app/api/extraction-status/[batchId]/route.ts`, `src/components/import/ExtractionProgress.tsx`
- **Commit:** 85e9aad

## Self-Check: PASSED

Files verified:
- FOUND: src/components/import/ExtractionReviewList.tsx
- FOUND: src/components/import/ExtractionReviewModal.tsx
- FOUND: src/components/import/ContactParseField.tsx
- FOUND: src/components/import/ImportWizard.tsx (modified)

Commits verified:
- 951cc97 — Task 1: ExtractionReviewList, ExtractionReviewModal, ContactParseField
- 85e9aad — Task 2: ImportWizard wiring + polling API extension

Build: `npm run build` passed — all 8 routes compiled, 0 TypeScript errors.
