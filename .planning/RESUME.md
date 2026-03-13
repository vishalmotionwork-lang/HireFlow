# HireFlow — Resume Context

## Last Session: 2026-03-13
## Status: Phase 5 COMPLETE + 2 new features added

## What Was Built This Session

### 1. Add Candidate Dialog (replaces inline row)
- **File**: `src/components/candidates/add-candidate-dialog.tsx` (NEW)
- **Two modes**: Manual entry OR Paste Link (auto-extract via Firecrawl + GPT-4o-mini)
- **ShineBorder** animation on dialog (`@magicui/shine-border`)
- **Confetti** animation on successful add (`canvas-confetti`)
- **Flow**: Paste URL → Extract button → polls `/api/extraction-status/[batchId]` → pre-fills form → user reviews + saves
- **Wired into**: `candidate-table.tsx` — "+" Add Candidate" button opens dialog instead of inline row
- Inline add row (`CandidateAddRow`) still exists but is no longer triggered from the button

### 2. Multi-Role Excel Import (fixes "not yet supported" warning)
- **Parser**: `src/lib/import/parseExcelMultiSheet.ts` (NEW) — reads all sheets, skips "Summary"
- **Component**: `src/components/import/StepMultiRoleImport.tsx` (NEW)
  - Fuzzy-matches sheet names to existing roles
  - Shows sheet→role mapping table with row counts
  - Auto-detects column mapping per sheet via `detectMapping()`
  - Imports each sheet to its matched role sequentially
  - Shows per-sheet results (imported/skipped/errors)
- **Wired into**: `Step1Upload.tsx` calls `isMultiSheetExcel()` → if true, passes to `onMultiSheetParsed`
- **ImportWizard.tsx** has new `multiSheets` state, renders `StepMultiRoleImport` when set
- **Tested with**: `~/Downloads/applicants_by_role.xlsx` (8 role sheets, ~520 candidates)

### Installed UI Components
- `src/components/ui/shine-border.tsx` — Magic UI shine border
- `src/components/ui/confetti.tsx` — Magic UI confetti (canvas-confetti based)

## Build Status
- ✅ Build passes clean (TypeScript + Next.js 16.1.6)
- Dev server running on port 3000

## BUGS TO FIX (Next Session)

### Add Candidate Dialog — "super buggy" + not centered
- **File**: `src/components/candidates/add-candidate-dialog.tsx`
- **Dialog base**: `src/components/ui/dialog.tsx` (uses `@base-ui/react/dialog`)
- **Issues reported**: Not opening centered, "super buggy" (likely ShineBorder overlay or @base-ui positioning)
- **Partial fix applied**: Changed default `sm:max-w-sm` → `sm:max-w-md` in dialog.tsx
- **Still TODO**:
  1. ShineBorder has `pointer-events-none absolute inset-0` — may block clicks or cause visual glitches. Test removing it or wrapping differently.
  2. The `@base-ui/react` Dialog uses `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` for centering — check if the ShineBorder's mask/padding breaks the layout.
  3. Consider replacing ShineBorder with a simpler `ring` or `border` animation if it keeps causing issues.
  4. Test the full flow: Manual save → confetti, Paste Link → Extract → Save → confetti.
- **Reference screenshot**: User showed dialog rendering slightly off-center with visible form fields working.

## Verification Needed
1. **Add Candidate Dialog**: Open any role page → click "+ Add Candidate" → dialog should open with shine border
   - Test Manual mode: fill fields → Save → confetti + candidate appears
   - Test Paste Link mode: paste URL → Extract → wait for fields → Save → confetti
2. **Multi-Role Import**: Go to /import → upload `applicants_by_role.xlsx` → should show multi-role mapping (not single-role selector)
   - Verify sheet names auto-match to roles
   - Import and check candidates appear in correct roles
3. **Dashboard verification** (from Phase 5): Navigate to localhost:3000 → should show Dashboard (not old pipeline)

## Phase 5 Execution (from previous session — all done)
| Plan | Status |
|------|--------|
| 05-01: Data layer + @mention | DONE |
| 05-02: Interactive dashboard | DONE |

## All Phases Summary
| Phase | Status |
|-------|--------|
| 1: Foundation | DONE |
| 2: Candidate Core | DONE |
| 3: Import Pipeline | DONE |
| 4: AI Extraction | DONE |
| 5: Collaboration & Dashboard | DONE |
| 6: Responsive Polish | Not started |

## Key Files Modified
| File | What |
|------|------|
| `src/components/candidates/add-candidate-dialog.tsx` | NEW — dialog with manual + link extraction modes |
| `src/components/candidates/candidate-table.tsx` | Wired dialog, replaced inline add trigger |
| `src/lib/import/parseExcelMultiSheet.ts` | NEW — multi-sheet Excel parser |
| `src/components/import/StepMultiRoleImport.tsx` | NEW — multi-role import UI |
| `src/components/import/Step1Upload.tsx` | Added multi-sheet detection + callback |
| `src/components/import/ImportWizard.tsx` | Added multi-sheet state + routing |
| `src/components/ui/shine-border.tsx` | NEW — Magic UI component |
| `src/components/ui/confetti.tsx` | NEW — Magic UI component |

## Tech Stack (DO NOT CHANGE)
- Next.js 16 + React 19 + TypeScript 5
- Drizzle ORM + PostgreSQL 16
- shadcn/ui v4 (@base-ui/react)
- Tailwind CSS 4
- OpenAI SDK (gpt-4o-mini) + Firecrawl
- Server actions (NOT API routes)
- MOCK_USER auth (Clerk deferred)

## Resume Command
```bash
cd ~/HireFlow && cat .planning/RESUME.md
```
