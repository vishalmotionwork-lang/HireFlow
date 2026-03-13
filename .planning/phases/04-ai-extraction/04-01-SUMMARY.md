---
phase: 04-ai-extraction
plan: "01"
subsystem: ai-extraction-pipeline
tags: [firecrawl, openai, async, server-actions, polling-api]
dependency_graph:
  requires: []
  provides: [scrape-extract-pipeline, extraction-status-api]
  affects: [candidate-import-flow]
tech_stack:
  added:
    - "@mendable/firecrawl-js — portfolio URL scraping via FirecrawlAppV1"
  patterns:
    - "next/server after() for fire-and-forget background processing"
    - "zodResponseFormat with chat.completions.parse for guaranteed JSON structure"
    - "ScrapeResult union type — success/failure discriminant, never throws"
key_files:
  created:
    - src/lib/extraction/firecrawl.ts
    - src/app/api/extraction-status/[batchId]/route.ts
  modified:
    - src/lib/ai/openai.ts
    - src/lib/actions/extraction.ts
decisions:
  - "Used FirecrawlAppV1 (named export) not default Firecrawl — v2 client removed scrapeUrl; v1 accessor has scrapeUrl method"
  - "zodResponseFormat works with Zod v4 — used chat.completions.parse not beta.chat.completions.parse (openai v6 moved parse to main namespace)"
  - "Smart markdown truncation: first 3000 + last 2000 chars rather than simple 8000-char slice — preserves footer contact info"
  - "after() for background processing — returns batchId immediately, UI polls /api/extraction-status/[batchId]"
metrics:
  duration: "~5 min"
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_modified: 4
---

# Phase 4 Plan 1: AI Extraction Pipeline (Scrape + Async + Polling) Summary

**One-liner:** Firecrawl portfolio scraper with smart markdown truncation, OpenAI zodResponseFormat structured extraction, and Next.js after() async pipeline with batch polling endpoint.

## What Was Built

### Task 1: Firecrawl wrapper + OpenAI zodResponseFormat upgrade

**`src/lib/extraction/firecrawl.ts`** — New module wrapping FirecrawlAppV1:
- `ScrapeResult` union type: `{ success: true; markdown; url }` | `{ success: false; error; url }`
- `scrapeUrl()` detects unsupported platforms (Instagram, TikTok, YouTube) before making any API call
- Smart truncation: first 3000 + last 2000 chars — avoids losing contact info in page footers
- 30s AbortController timeout per URL — returns structured failure on timeout, never throws

**`src/lib/ai/openai.ts`** — Upgraded to use structured output:
- `CandidateExtractionSchema` (Zod) matches `ExtractionResult` interface
- `chat.completions.parse` + `zodResponseFormat` — eliminates manual JSON.parse and markdown stripping
- `ExtractionResult` interface unchanged — downstream code unaffected

### Task 2: Async extraction actions + status polling endpoint

**`src/lib/actions/extraction.ts`** — Four new exports:
- `startExtractions(urls, roleId)` — validates max 20 URLs, creates importBatch + drafts, returns batchId immediately, processes via after()
- `startSingleExtraction(url, roleId)` — creates candidate placeholder + draft, processes async
- `confirmExtraction(draftId, edits)` — merges extracted + edited data, creates or updates candidate
- `skipExtraction(draftId)` — marks reviewed without candidate changes

**`src/app/api/extraction-status/[batchId]/route.ts`** — GET endpoint:
- Returns `{ total, done, pending, failed, drafts[] }`
- done = completed + failed + applied + reviewed; pending = pending + processing
- Per-URL summary includes extractedData, error, overallConfidence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Firecrawl API version mismatch**
- **Found during:** Task 1
- **Issue:** Plan said `firecrawl.scrapeUrl()` on default export — the new `@mendable/firecrawl-js` package uses a v2 `FirecrawlClient` as default with no `scrapeUrl` method; `scrapeUrl` is on the legacy `FirecrawlAppV1`
- **Fix:** Import `{ FirecrawlAppV1 }` named export instead of default `FirecrawlApp`
- **Files modified:** `src/lib/extraction/firecrawl.ts`
- **Commit:** 6eed40f

**2. [Rule 1 - Bug] OpenAI parse method location**
- **Found during:** Task 1
- **Issue:** Plan referenced `beta.chat.completions.parse` — in openai v6, `parse` moved to `chat.completions.parse` (not under beta)
- **Fix:** Changed `openai.beta.chat.completions.parse` → `openai.chat.completions.parse`
- **Files modified:** `src/lib/ai/openai.ts`
- **Commit:** 6eed40f

## Self-Check: PASSED

Files verified:
- FOUND: src/lib/extraction/firecrawl.ts
- FOUND: src/lib/ai/openai.ts
- FOUND: src/lib/actions/extraction.ts
- FOUND: src/app/api/extraction-status/[batchId]/route.ts

Commits verified:
- 6eed40f — Task 1: firecrawl + openai upgrade
- 81cea6a — Task 2: extraction actions + polling endpoint

Build: `npm run build` passed, `/api/extraction-status/[batchId]` route emitted as dynamic.
