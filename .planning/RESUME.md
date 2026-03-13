# HireFlow — Resume Context

## Last Session: 2026-03-14
## Status: UI overhaul + import fix + extraction fix

## What Was Done This Session

### 1. Add Candidate Dialog — Fixed
- **File**: `src/components/candidates/add-candidate-dialog.tsx`
- Removed `relative overflow-hidden` from DialogContent — was clipping ShineBorder
- Added explicit `className="rounded-xl"` on ShineBorder
- Dialog now centers properly with animated border

### 2. Extraction Pipeline — Fixed for OpenRouter
- **File**: `src/lib/ai/openai.ts`
- Added `OPENAI_BASE_URL` support (reads from env)
- Auto-selects `openai/gpt-4o-mini` model when using OpenRouter
- Replaced `zodResponseFormat` (OpenAI-only) with `json_object` mode + Zod validation
- **File**: `.env.local` — Added `FIRECRAWL_API_KEY` + `OPENAI_BASE_URL=https://openrouter.ai/api/v1`

### 3. UI Overhaul — Warm Design System
- **File**: `src/app/globals.css` — Complete rewrite of CSS variables
  - Warm palette: page bg #F5F3EE, card white, borders #E8E5DF, sidebar #FAF9F6
  - Accent blue #2563EB, text #111111, muted #888888
  - Font: Inter directly via font-family (NOT CSS variable indirection)
  - Radius bumped to 0.75rem base
- **File**: `src/app/layout.tsx` — Switched from Geist to Inter + JetBrains Mono
  - Uses `inter.className` (not `.variable`) to apply font directly to body
- **File**: `src/components/layout/topbar.tsx` — Updated to use semantic tokens
- **File**: `src/components/layout/app-sidebar.tsx` — Updated logo styling
- **File**: `src/components/layout/app-shell.tsx` — Main area uses `bg-background p-6 md:p-8 lg:p-10`
- **File**: `src/components/dashboard/dashboard-client.tsx` — Updated all hardcoded grays to tokens
- **File**: `src/components/dashboard/role-card.tsx` — Updated to warm card style

### 4. Excel Import — Google Forms Support
- **File**: `src/lib/import/parseExcelMultiSheet.ts`
  - `isMultiSheetExcel()` now returns FALSE when sheets have identical headers (Google Forms pattern)
  - Detects form-like sheet names: "Form responses", "Duplicate", "Sheet1"
- **File**: `src/lib/import/parseExcel.ts`
  - Merges sheets with identical headers (deduplicates by email)
  - Handles Google Forms response files with "Form responses 1" + "Duplicate" sheets
- **File**: `src/lib/import/columnHeuristics.ts`
  - Better keyword matching for Google Forms headers ("Full Name", "Phone Number (whatsapp)", etc.)
  - Added IGNORE_KEYWORDS list to skip: timestamps, resume uploads, free-text, salary, experience, linkedin, location

## STILL TODO / VERIFY
1. **Font rendering** — Inter should now render via `inter.className`. Verify in browser.
2. **Google Forms import** — Test with `~/Downloads/Job Application Form - Zeeel.Ai (Responses).xlsx`
   - Should detect as single-sheet (not multi-role), merge 119 + 74 rows (dedup by email)
   - Should auto-map: Full Name→name, Email Address→email, Phone Number→phone, Portfolio→portfolioUrl
   - Role column ("Which role are you interested in applying for?") is ignored — user picks target role manually
3. **Paste Link extraction** — Test with any URL. OpenRouter + Firecrawl should now work.
4. **Remaining UI pages** — Only dashboard/sidebar/topbar were updated to warm palette. Other pages (role detail, master view, import wizard, settings) still use hardcoded gray-* classes.

## Build Status
- Build passes clean
- Dev server running on port 3000

## Key Files Modified This Session
| File | What |
|------|------|
| `src/app/globals.css` | Complete warm palette rewrite |
| `src/app/layout.tsx` | Inter + JetBrains Mono fonts |
| `src/components/layout/topbar.tsx` | Semantic token styling |
| `src/components/layout/app-sidebar.tsx` | Logo update |
| `src/components/layout/app-shell.tsx` | Warm bg + spacing |
| `src/components/dashboard/dashboard-client.tsx` | Token-based styling |
| `src/components/dashboard/role-card.tsx` | Warm card style |
| `src/components/candidates/add-candidate-dialog.tsx` | Dialog centering fix |
| `src/lib/ai/openai.ts` | OpenRouter support |
| `src/lib/import/parseExcel.ts` | Multi-sheet merge for forms |
| `src/lib/import/parseExcelMultiSheet.ts` | Smart multi-sheet detection |
| `src/lib/import/columnHeuristics.ts` | Google Forms header matching |
| `.env.local` | Added FIRECRAWL_API_KEY + OPENAI_BASE_URL |

## Tech Stack (DO NOT CHANGE)
- Next.js 16 + React 19 + TypeScript 5
- Drizzle ORM + PostgreSQL 16
- shadcn/ui v4 (@base-ui/react)
- Tailwind CSS 4
- OpenAI SDK via OpenRouter (gpt-4o-mini) + Firecrawl
- Server actions (NOT API routes)
- MOCK_USER auth (Clerk deferred)

## Resume Command
```bash
cd ~/HireFlow && cat .planning/RESUME.md
```
