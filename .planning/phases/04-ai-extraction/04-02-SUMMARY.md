---
phase: 04-ai-extraction
plan: 02
subsystem: ui
tags: [react, nextjs, polling, extraction, import-wizard, url-paste]

requires:
  - phase: 04-01
    provides: startExtractions(), startSingleExtraction() server actions, /api/extraction-status/[batchId] polling endpoint

provides:
  - StepUrlPaste component with single/bulk URL modes calling extraction server actions
  - ExtractionProgress component polling extraction status every 2s with progress bar and per-URL status
  - ImportWizard updated with top-level File Upload / URL tab switcher
  - Full URL extraction flow: StepUrlPaste -> ExtractionProgress -> Review Results placeholder

affects: [04-03-review-modal]

tech-stack:
  added: []
  patterns:
    - Polling with useEffect + setInterval + cleanup on unmount
    - sessionStorage-based resume for page-revisit (pendingExtractionBatchId)
    - Tab-level flow isolation (switching tabs resets alternate flow to prevent stale state)
    - Top-level tab switcher hidden when deep in sub-flow (isDeepInFileWizard guard)

key-files:
  created:
    - src/components/import/StepUrlPaste.tsx
    - src/components/import/ExtractionProgress.tsx
  modified:
    - src/components/import/ImportWizard.tsx

key-decisions:
  - "ImportWizard uses top-level File Upload / URL tab instead of embedding URL as a sub-tab inside Step1Upload — cleaner separation of two distinct flows"
  - "Tab switcher is hidden while deep in the file wizard or during active extraction to prevent accidental flow abandonment"
  - "ExtractionProgress exports ExtractionStatusDraft type directly so ImportWizard can import it for state typing"
  - "Review Results state (drafts array) stored in ImportWizard state — Plan 03 will consume it to open the review modal"

requirements-completed: [IMPT-08, IMPT-09]

duration: 7min
completed: 2026-03-13
---

# Phase 4 Plan 02: URL Paste UI and Extraction Progress Summary

**StepUrlPaste with single/bulk URL modes + ExtractionProgress polling component wired into a new URL tab in ImportWizard**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T16:04:04Z
- **Completed:** 2026-03-13T16:11:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- StepUrlPaste: single URL mode (URL input + role selector + Extract button) and bulk mode (textarea + deduplication + 20-URL cap + Extract All button)
- ExtractionProgress: 2-second polling loop, overall progress bar with percentage, per-URL status list with spinner/check/X icons and confidence scores
- ImportWizard: new File Upload / URL top-level tab; URL tab routes StepUrlPaste -> ExtractionProgress -> Review Results placeholder; existing file/paste flow untouched
- Build passes cleanly with zero TypeScript errors

## Task Commits

1. **Task 1: Create StepUrlPaste component** - `572693f` (feat)
2. **Task 2: Create ExtractionProgress + wire URL tab into ImportWizard** - `dfa6c38` (feat)

## Files Created/Modified

- `src/components/import/StepUrlPaste.tsx` - Single/bulk URL input with role selector; calls startSingleExtraction() or startExtractions(); 20-URL cap enforcement; deduplication via Set
- `src/components/import/ExtractionProgress.tsx` - Polling component with progress bar, per-URL status list, sessionStorage resume, onComplete callback when pending === 0
- `src/components/import/ImportWizard.tsx` - Added File Upload / URL tab switcher; URL extraction flow state (batchId, candidateId, drafts); tab-switch reset logic

## Decisions Made

- Used a top-level tab (File Upload vs URL) rather than a sub-tab inside Step1Upload — the two flows are fundamentally different (map/validate/import vs extract/review) and deserve separate top-level entry points
- Hid the tab switcher while deep in either flow (past upload step or with active batchId) to prevent users accidentally abandoning in-progress work
- Exported `ExtractionStatusDraft` type from ExtractionProgress.tsx so ImportWizard can type the completion state without a shared types file
- Review Results state stored in ImportWizard (not sessionStorage) since Plan 03 will open a modal from it — sessionStorage is only used for the batchId (mid-extraction resume)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can import `ExtractionStatusDraft[]` from `extractionDrafts` state in ImportWizard and open a review modal with it
- The "Review Results" button placeholder in ImportWizard is the exact hook point for Plan 03 to wire in
- All extraction server actions (startExtractions, startSingleExtraction, confirmExtraction, skipExtraction) from Plan 01 are ready to be called from the review modal

---
*Phase: 04-ai-extraction*
*Completed: 2026-03-13*
