# Phase 4: AI Extraction - Research

**Researched:** 2026-03-13
**Domain:** Web scraping (Firecrawl), LLM structured extraction (OpenAI gpt-4o-mini), async queue, contact info parsing
**Confidence:** MEDIUM-HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMPT-08 | Bulk URL paste — paste multiple portfolio links one per line, all queued for AI extraction | Async queue pattern + Firecrawl batch scrape + extractionDrafts table |
| IMPT-09 | Single URL entry — paste one portfolio link, AI extracts and creates one candidate card | Firecrawl scrape → OpenAI extract → ExtractionReviewModal flow |
| AIEX-01 | Auto-extract name, contact info, and social handles from portfolio URLs (Behance, personal sites, YouTube channels, LinkedIn) | Firecrawl scrape → markdown → gpt-4o-mini with zodResponseFormat |
| AIEX-02 | Review screen before save — confidence level per field (High/Medium/Low), missing fields in red | ExtractionReviewModal with field-level confidence from LLM output |
| AIEX-03 | Team confirms, edits, or skips each extraction before data is saved | ExtractionReviewModal with editable fields before server action |
| AIEX-04 | Graceful degradation for blocked/login-gated sites — shows "could not extract" | Firecrawl error codes + extractionDraft status='failed' handling |
| AIEX-05 | Extraction runs async in background — progress bar shows status | extractionDrafts polling + UI progress indicator |
| AIEX-06 | Raw text/paste parsing: detect phone, email, Instagram handles, YouTube URLs, website URLs | Regex-based parseContactText() utility |
</phase_requirements>

---

## Summary

Phase 4 adds the AI extraction pipeline: scrape a portfolio URL with Firecrawl, extract structured candidate data with gpt-4o-mini, and present a confidence-scored review screen before saving. The phase also adds raw text contact parsing (regex, no LLM) and an async queue for bulk URL processing.

The stack is fully determined by prior decisions: Firecrawl (`@mendable/firecrawl-js` v4.16.0) for web scraping and OpenAI (`openai` v6.27.0) for structured extraction. The key open decision is the async queue mechanism. Given this is a self-hosted Node.js app (not Vercel serverless), the recommended approach is Next.js `after()` + database polling via the existing `extractionDrafts` table. This eliminates external dependencies while providing sufficient reliability for a team of 5-10.

**Critical discovery:** Firecrawl explicitly does NOT support Instagram, YouTube, or TikTok scraping. These platforms return an error response: "This website is no longer supported." The extraction pipeline must treat these as graceful failures from the start, relying on the contact info already in the candidate record or the user's manual input. For YouTube channels and LinkedIn, Firecrawl may succeed for public pages — verify at implementation time.

**Primary recommendation:** Use `after()` from `next/server` for fire-and-forget async execution of Firecrawl + OpenAI calls, with `extractionDrafts` table as the job state store. Poll from the client with a 2-second interval until all jobs complete or fail.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mendable/firecrawl-js` | `^4.16.0` (latest on npm) | Scrape portfolio URLs to clean markdown | Pre-decided; handles JS rendering, proxies, dynamic content |
| `openai` | `^6.27.0` (already in project) | Extract structured fields from scraped markdown | Pre-decided; gpt-4o-mini with zodResponseFormat gives 100% schema conformance |
| `zod` | `^4.3.6` (already installed) | Define extraction schema + validate LLM output | Already in project; `zodResponseFormat` works with OpenAI SDK |
| `next/server` `after()` | built-in (Next.js 15.1+, stable in 16.x) | Fire-and-forget async after server action responds | No new dependency; works on self-hosted Node.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `openai` `beta.chat.completions.parse()` | v6+ | Structured extraction with Zod schema | Always — guarantees schema adherence |
| Native `fetch` polling | built-in | Client polls `/api/extraction-jobs/[batchId]` status | During bulk extraction progress display |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `after()` + DB polling | pg-boss | pg-boss is more robust for high volume but adds schema complexity and had reported pain with Next.js compilation |
| `after()` + DB polling | Inngest | Inngest is excellent but requires external service account — overkill for 5-10 person team |
| `after()` + DB polling | server-side in-memory queue | In-memory queue loses state on process restart; fine for POC but bad for reliability |
| Firecrawl scrape → OpenAI | Firecrawl extract endpoint | Extract endpoint is for multi-URL domain crawls; single-URL scrape is more appropriate |

**Installation:**
```bash
npm install @mendable/firecrawl-js
# openai and zod are already installed
```

Add to `.env.local`:
```
FIRECRAWL_API_KEY=fc-...
OPENAI_API_KEY=sk-...
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── actions/
│   │   └── extraction.ts        # Server actions: startExtraction, getExtractionStatus, confirmExtraction
│   ├── extraction/
│   │   ├── firecrawl.ts         # scrapeUrl() wrapper — returns markdown or error
│   │   ├── openai-extract.ts    # extractCandidateInfo() — calls gpt-4o-mini with zodResponseFormat
│   │   ├── contact-parser.ts    # parseContactText() — regex extraction for AIEX-06
│   │   └── types.ts             # ExtractionResult, FieldConfidence, ExtractionDraft types
│   └── queries/
│       └── extraction.ts        # getExtractionDraft(), getExtractionBatch(), etc.
├── app/
│   ├── import/
│   │   └── page.tsx             # Add URL tab to existing import wizard
│   └── api/
│       └── extraction-status/
│           └── [batchId]/
│               └── route.ts     # GET — returns progress for polling
└── components/
    └── import/
        ├── StepUrlPaste.tsx     # IMPT-08/09: URL input (single or bulk)
        └── ExtractionReviewModal.tsx  # AIEX-02/03: review + edit + confirm
```

### Pattern 1: Scrape → Extract Pipeline

**What:** Two-step async pipeline. Step 1: Firecrawl converts URL to clean markdown. Step 2: gpt-4o-mini extracts structured fields with confidence from the markdown.

**When to use:** Every URL extraction (both single IMPT-09 and bulk IMPT-08).

```typescript
// src/lib/extraction/firecrawl.ts
// Source: https://docs.firecrawl.dev/features/scrape

import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

export type ScrapeResult =
  | { success: true; markdown: string; url: string }
  | { success: false; error: string; url: string };

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
    });

    // Firecrawl returns { success: false, error: "This website is no longer supported" }
    // for Instagram, YouTube, TikTok
    if (!result.success || !result.markdown) {
      return {
        success: false,
        error: result.error ?? 'Could not extract content from this URL.',
        url,
      };
    }

    return { success: true, markdown: result.markdown, url };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Scrape failed.',
      url,
    };
  }
}
```

### Pattern 2: OpenAI Structured Extraction with Confidence

**What:** Pass scraped markdown to gpt-4o-mini. Ask it to extract candidate fields AND assign a confidence level (HIGH/MEDIUM/LOW) per field. Use `zodResponseFormat` + `beta.chat.completions.parse()` for guaranteed schema adherence.

**When to use:** After every successful Firecrawl scrape.

```typescript
// src/lib/extraction/openai-extract.ts
// Source: https://platform.openai.com/docs/guides/structured-outputs
// Source: openai npm package v6+ beta.chat.completions.parse()

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const ConfidenceEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);

const ExtractedField = z.object({
  value: z.string().nullable(),
  confidence: ConfidenceEnum,
});

const CandidateExtractionSchema = z.object({
  name: ExtractedField,
  email: ExtractedField,
  phone: ExtractedField,
  instagram: ExtractedField,
  youtube: ExtractedField,
  website: ExtractedField,
  linkedin: ExtractedField,
});

export type CandidateExtraction = z.infer<typeof CandidateExtractionSchema>;

export async function extractCandidateInfo(
  markdown: string,
  sourceUrl: string
): Promise<CandidateExtraction | null> {
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are extracting candidate contact information from a portfolio page.
Extract name, email, phone number, Instagram handle, YouTube channel URL, personal website, and LinkedIn URL.
For each field, also provide a confidence level: HIGH (clearly stated), MEDIUM (inferred/partial), LOW (guessed or ambiguous).
If a field is not present, set value to null and confidence to LOW.`,
        },
        {
          role: 'user',
          content: `Source URL: ${sourceUrl}\n\n${markdown.slice(0, 8000)}`,
        },
      ],
      response_format: zodResponseFormat(CandidateExtractionSchema, 'candidate_extraction'),
    });

    return completion.choices[0].message.parsed;
  } catch {
    return null;
  }
}
```

### Pattern 3: Async Queue via `after()` + `extractionDrafts` DB Polling

**What:** When a user submits URLs, the server action: (1) creates `extractionDraft` rows with `status='pending'`, (2) returns immediately, (3) uses `after()` to run the actual scrape+extract pipeline in the background. The client polls a status endpoint.

**When to use:** Bulk URL extraction (IMPT-08) — critical for non-blocking UI.

```typescript
// src/lib/actions/extraction.ts
// Source: https://nextjs.org/docs/app/api-reference/functions/after

'use server';

import { after } from 'next/server';
import { db } from '@/db';
import { extractionDrafts, importBatches } from '@/db/schema';
import { scrapeUrl } from '@/lib/extraction/firecrawl';
import { extractCandidateInfo } from '@/lib/extraction/openai-extract';
import { eq } from 'drizzle-orm';

export async function startExtractions(
  urls: string[],
  roleId: string
): Promise<{ batchId: string }> {
  // 1. Create import batch
  const [batch] = await db
    .insert(importBatches)
    .values({ roleId, source: 'url', totalRows: urls.length, importedCount: 0, skippedCount: 0, createdBy: 'mock-user' })
    .returning({ id: importBatches.id });

  // 2. Create extraction draft rows — all start as 'pending'
  await db.insert(extractionDrafts).values(
    urls.map((url) => ({
      importBatchId: batch.id,
      sourceUrl: url,
      status: 'pending',
    }))
  );

  // 3. Fire-and-forget — after() runs after response is sent
  after(async () => {
    const drafts = await db
      .select({ id: extractionDrafts.id, sourceUrl: extractionDrafts.sourceUrl })
      .from(extractionDrafts)
      .where(eq(extractionDrafts.importBatchId, batch.id));

    for (const draft of drafts) {
      await db.update(extractionDrafts).set({ status: 'processing' }).where(eq(extractionDrafts.id, draft.id));

      const scraped = await scrapeUrl(draft.sourceUrl!);

      if (!scraped.success) {
        await db.update(extractionDrafts).set({
          status: 'failed',
          rawData: scraped.error,
        }).where(eq(extractionDrafts.id, draft.id));
        continue;
      }

      const extracted = await extractCandidateInfo(scraped.markdown, draft.sourceUrl!);

      await db.update(extractionDrafts).set({
        status: extracted ? 'ready' : 'failed',
        rawData: scraped.markdown.slice(0, 5000),
        extractedData: extracted ? JSON.stringify(extracted) : null,
      }).where(eq(extractionDrafts.id, draft.id));
    }
  });

  return { batchId: batch.id };
}
```

### Pattern 4: Extraction Status Polling Endpoint

```typescript
// src/app/api/extraction-status/[batchId]/route.ts

import { db } from '@/db';
import { extractionDrafts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  const drafts = await db
    .select({
      id: extractionDrafts.id,
      sourceUrl: extractionDrafts.sourceUrl,
      status: extractionDrafts.status,
      extractedData: extractionDrafts.extractedData,
    })
    .from(extractionDrafts)
    .where(eq(extractionDrafts.importBatchId, batchId));

  const total = drafts.length;
  const done = drafts.filter(d => d.status === 'ready' || d.status === 'failed').length;

  return NextResponse.json({ total, done, drafts });
}
```

### Pattern 5: Raw Contact Text Parser (AIEX-06)

**What:** Regex-only extraction of contact fields from free text. No LLM. Used for AIEX-06 (paste raw text into a candidate field).

```typescript
// src/lib/extraction/contact-parser.ts

export interface ParsedContact {
  email: string | null;
  phone: string | null;
  instagram: string | null;
  youtube: string | null;
  website: string | null;
}

export function parseContactText(text: string): ParsedContact {
  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0] ?? null;

  // Phone: 10-13 digits, optional country code (+91, +1, etc.)
  const phoneMatch = text.match(/(?:\+?[0-9]{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4,7}/);
  const phone = phoneMatch?.[0]?.replace(/[\s.\-()]/g, '') ?? null;

  // Instagram handle: @handle or instagram.com/handle
  const instaMatch = text.match(/(?:instagram\.com\/|@)([a-zA-Z0-9_.]{1,30})/);
  const instagram = instaMatch ? `@${instaMatch[1]}` : null;

  // YouTube: youtube.com/@ or youtube.com/channel/
  const youtubeMatch = text.match(/youtube\.com\/(?:@[\w\-]+|channel\/[\w\-]+)/);
  const youtube = youtubeMatch ? `https://www.${youtubeMatch[0]}` : null;

  // Website: http(s):// URLs that aren't Instagram/YouTube
  const websiteMatch = text.match(/https?:\/\/(?!(?:www\.)?(?:instagram|youtube|linkedin)\.com)[^\s,'"<>]+/);
  const website = websiteMatch?.[0] ?? null;

  return { email, phone, instagram, youtube, website };
}
```

### Pattern 6: ExtractionReviewModal (AIEX-02/03)

**What:** Modal that shows extracted fields per candidate. Each field has a colored confidence badge (green=HIGH, yellow=MEDIUM, red=LOW). Missing fields shown with red "Not found" placeholder. User can edit any field inline. Confirm saves to DB; Skip discards.

**Structure:**
- Rendered as a client component
- Receives `ExtractionDraft` with `extractedData` JSON
- On Confirm: calls `confirmExtraction(draftId, editedFields)` server action
- On Skip: calls `skipExtraction(draftId)` server action
- Renders one candidate at a time; pagination for bulk queue

### Anti-Patterns to Avoid

- **Running scrape+extract synchronously in a server action:** This would time out (Firecrawl can take 5-15s per URL, gpt-4o-mini adds another 2-5s). Always use `after()`.
- **Storing full scraped markdown in DB long-term:** `extractionDrafts.rawData` is a temporary column. Truncate to 5000 chars max. Clean up drafts after confirmation.
- **Trusting LLM output without Zod parse:** Always use `zodResponseFormat` + `beta.chat.completions.parse()`. Raw `chat.completions.create()` with `response_format: {type: 'json_object'}` does not guarantee schema shape.
- **Retrying Instagram/YouTube/TikTok scrapes:** Firecrawl blocks these at the API level. Detect the error message and mark as `failed` immediately — do not retry.
- **Using Firecrawl's Extract endpoint for single URLs:** The Extract endpoint is designed for multi-URL domain crawls. Scrape endpoint with `formats: ['markdown']` is correct for single-URL per-candidate extraction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JavaScript-rendered page scraping | Custom Puppeteer/Playwright scraper | Firecrawl | Handles proxies, JS rendering, anti-bot, caching — weeks of edge cases |
| Guaranteed JSON output from LLM | Manual JSON.parse + retry loop | `openai.beta.chat.completions.parse()` + `zodResponseFormat` | Schema adherence guaranteed by constrained decoding |
| Markdown-to-fields extraction | Custom regex over HTML | OpenAI gpt-4o-mini | Portfolio sites vary wildly; LLM handles unstructured layouts |
| Background job persistence | Custom in-memory queue | `after()` + `extractionDrafts` table | Memory queue dies on restart; DB table is already in schema |

**Key insight:** Portfolio sites are extremely heterogeneous (Behance, personal Webflow/Framer sites, Notion pages, Linktree, WordPress). Regex over HTML cannot handle this diversity — LLM extraction over clean markdown is the correct layer. But scraping to clean markdown (Firecrawl's job) must stay separated from extraction (OpenAI's job).

---

## Common Pitfalls

### Pitfall 1: Firecrawl Blocks Social Platforms Silently

**What goes wrong:** Calling `scrapeUrl('https://instagram.com/username')` returns `{ success: false, error: "This website is no longer supported" }` — not a thrown exception, a structured failure.

**Why it happens:** Firecrawl has made a business decision to not support Instagram, YouTube, TikTok due to ToS and bot detection complexity. The error is non-obvious from the outside.

**How to avoid:** Always check `result.success` first. Map specific error messages to a user-friendly "Could not extract — this platform is not supported" message. Never show the raw Firecrawl error to the user.

**Warning signs:** If extraction jobs for Instagram/YouTube URLs all complete in <1s with no extracted data, this is happening.

### Pitfall 2: `after()` Duration Limits on Self-Hosted

**What goes wrong:** `after()` callbacks run for the platform's `maxDuration`. On self-hosted Node.js, this is unlimited by default — but if bulk URLs (say 50) are processed serially inside one `after()` call, a single network failure can stall the whole batch.

**Why it happens:** `after()` is a single async callback, not a distributed queue. If you process 50 URLs sequentially and URL 30 hangs, URLs 31-50 wait indefinitely.

**How to avoid:** Set a per-URL timeout (e.g., `AbortController` with 30s). Process sequentially with individual error catches per URL — each URL updates its own `extractionDraft` row. Cap bulk paste at a reasonable number (20-30 URLs max per batch in Phase 4).

**Warning signs:** Users report progress bar getting stuck midway.

### Pitfall 3: Zod v4 with `zodResponseFormat`

**What goes wrong:** This project uses `zod@^4.3.6`. The OpenAI SDK's `zodResponseFormat` helper was built for Zod v3. There may be breaking changes in Zod v4's schema internals that affect how OpenAI SDK serializes the schema.

**Why it happens:** OpenAI community threads in 2025 note Zod version mismatches causing issues with structured output parsing.

**How to avoid:** Test `zodResponseFormat` with a simple schema during the first implementation task. If it fails, the workaround is to manually convert the Zod schema to a JSON Schema object and pass it as `response_format: { type: 'json_schema', json_schema: { name: '...', schema: jsonSchemaObject, strict: true } }`.

**Warning signs:** TypeScript compile errors referencing internal Zod schema methods; `parse()` returning `null` unexpectedly.

### Pitfall 4: `extractionDrafts` Schema Missing Fields

**What goes wrong:** The existing `extractionDrafts` table has `sourceUrl`, `rawData`, `extractedData`, `status`, `importBatchId`. It is missing `candidateId` (for single-URL IMPT-09 flow where a candidate already exists) and a `confidenceData` column to store per-field confidence separately.

**Why it happens:** The schema was designed before the full extraction flow was specced.

**How to avoid:** Run a schema migration in Wave 0 to add `candidateId` (nullable FK) and store confidence inside the `extractedData` JSON blob rather than a separate column (simpler). The `extractedData` column stores the full `CandidateExtraction` object including per-field confidence.

**Warning signs:** Can't link confirmed extractions back to a candidate during the single-URL flow.

### Pitfall 5: Client Polling Race Condition

**What goes wrong:** User navigates away from the import page while extraction is in progress. On return, there's no reconnection to the polling loop.

**Why it happens:** Polling lives in React component state — not in a persistent session.

**How to avoid:** Store `batchId` in `sessionStorage` (same pattern as the wizard — already established in Phase 3). On import page mount, check for a `pendingBatchId` in sessionStorage and resume polling if any drafts are still `pending` or `processing`.

**Warning signs:** Progress bar shows N/N completed but some drafts are still in DB with `status='pending'`.

### Pitfall 6: Markdown Truncation Loses Contact Data

**What goes wrong:** Long portfolio pages are truncated to 8000 chars for the OpenAI API call. Contact info is usually in a footer or "About" section, which may appear after 8000 chars.

**Why it happens:** LLM context limits + cost management.

**How to avoid:** Before sending the full markdown, extract just the sections most likely to contain contact info. A simple heuristic: take the first 3000 chars (about page, header) AND the last 2000 chars (footer) and send those combined. This covers ~95% of portfolio layouts without full markdown.

**Warning signs:** Extraction returns `null` for email/phone on sites that clearly have contact info visible.

---

## Code Examples

### Firecrawl Single URL Scrape

```typescript
// Source: https://docs.firecrawl.dev/features/scrape (verified 2026-03-13)
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

const result = await app.scrapeUrl('https://johndoe.com', {
  formats: ['markdown'],
});

if (result.success) {
  console.log(result.markdown); // clean markdown string
} else {
  console.error(result.error); // e.g. "This website is no longer supported"
}
```

### OpenAI Structured Extraction with Zod

```typescript
// Source: OpenAI SDK v6 documentation (beta.chat.completions.parse)
// Note: verify zodResponseFormat compatibility with zod v4 before shipping

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.object({ value: z.string().nullable(), confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']) }),
  email: z.object({ value: z.string().nullable(), confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']) }),
});

const completion = await openai.beta.chat.completions.parse({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Extract candidate info with confidence levels.' },
    { role: 'user', content: markdownContent },
  ],
  response_format: zodResponseFormat(schema, 'extraction'),
});

const data = completion.choices[0].message.parsed; // typed as z.infer<typeof schema>
```

### Next.js `after()` in a Server Action

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/after (verified 2026-03-13)
// Supported: Node.js server, Docker — NOT static export
// Platform Support: Confirmed for self-hosted Node.js

'use server';
import { after } from 'next/server';

export async function myAction(formData: FormData) {
  const result = doMainWork(formData);

  after(async () => {
    // runs after response is sent — does not block UI
    await slowBackgroundTask();
  });

  return result;
}
```

### Firecrawl Error Handling for Blocked Platforms

```typescript
// Correct pattern for AIEX-04 — graceful degradation

const UNSUPPORTED_PLATFORM_ERRORS = [
  'This website is no longer supported',
  'no longer supported',
];

function isUnsupportedPlatform(error: string): boolean {
  return UNSUPPORTED_PLATFORM_ERRORS.some(msg => error.includes(msg));
}

const result = await scrapeUrl(url);
if (!result.success) {
  const reason = isUnsupportedPlatform(result.error)
    ? 'This platform cannot be scraped automatically. Please enter details manually.'
    : 'Could not access this URL. It may be private or broken.';

  // Update DB: status='failed', rawData=reason
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON.parse + retry for LLM output | `zodResponseFormat` + `beta.chat.completions.parse()` | OpenAI SDK v4.55+ (2024) | 100% schema adherence, no retry needed |
| `unstable_after()` in Next.js 15 RC | Stable `after()` in Next.js 15.1+ | 2024-Q4 | Safe to use in production — no `unstable_` prefix needed |
| Separate Redis + BullMQ for background jobs | `after()` + DB polling for small workloads | 2024-2025 | Eliminates Redis dependency for teams with modest job volume |
| Firecrawl v1 `scrapeUrl` with `pageOptions` | v2+ `scrapeUrl` with `formats` array | 2024 | Old API shape is different — use `formats: ['markdown']` not `pageOptions` |

**Deprecated/outdated:**
- `pageOptions` parameter on Firecrawl scrape: Use `formats` array instead. The old v1 API shape is documented in older blog posts but no longer current.
- `response_format: { type: 'json_object' }` on OpenAI: Does NOT guarantee schema shape. Use `json_schema` with `strict: true` or `zodResponseFormat`.

---

## Open Questions

1. **Zod v4 compatibility with `zodResponseFormat`**
   - What we know: OpenAI SDK's `zodResponseFormat` was tested with Zod v3. This project uses Zod v4.3.6.
   - What's unclear: Whether Zod v4's internal schema representation breaks the OpenAI helper.
   - Recommendation: In Wave 1 Task 1, write a small test file that calls `zodResponseFormat` with a simple schema and runs it. If it throws, fall back to manual `zodToJsonSchema` + `response_format: { type: 'json_schema', ... }` pattern.

2. **Firecrawl success rate on Behance and LinkedIn**
   - What we know: Firecrawl handles JS-rendered sites and claims to bypass anti-bot measures. Instagram/YouTube/TikTok are explicitly blocked.
   - What's unclear: Whether Behance (Flash-era, heavy JS, login-preferred) and LinkedIn (aggressive bot detection) return clean markdown in practice.
   - Recommendation: Test against 5 real Behance and 5 LinkedIn URLs in Wave 1. If >50% fail, implement a fallback: scrape `markdown`, and if it returns a login page, mark status as `failed` with "Behance/LinkedIn requires login — could not extract."

3. **`extractionDrafts` schema sufficiency**
   - What we know: Current schema has `sourceUrl`, `rawData`, `extractedData` (text), `status`, `importBatchId`.
   - What's unclear: Whether a `candidateId` FK is needed for the IMPT-09 single-URL flow (where user pastes one URL while looking at an existing candidate).
   - Recommendation: Add nullable `candidateId` FK column via migration in Wave 0. For IMPT-09, the flow creates a draft linked to a candidate ID, not an import batch.

4. **Bulk URL cap**
   - What we know: `after()` is a single callback on the server process. Firecrawl takes 5-15s per URL. 50 URLs × 10s = 8+ minutes in one `after()` call.
   - What's unclear: Whether Next.js self-hosted has any implicit timeout on `after()` callbacks.
   - Recommendation: Cap bulk URL paste at 20 URLs per batch in Phase 4. Display a clear limit message in the UI. This can be raised in future phases if a proper queue is added.

---

## Sources

### Primary (HIGH confidence)
- `https://nextjs.org/docs/app/api-reference/functions/after` — `after()` API, platform support, duration behavior, self-hosted Node.js support (verified 2026-03-13, version 16.1.6 docs)
- `https://docs.firecrawl.dev/features/scrape` — Firecrawl scrape endpoint, formats, response structure (verified 2026-03-13)
- `npm view @mendable/firecrawl-js version` — v4.16.0 confirmed via npm registry

### Secondary (MEDIUM confidence)
- `https://scrapecreators.com/blog/firecrawl-s-social-media-scraping-restrictions-market-gap-or-strategic-decision` — Firecrawl Instagram/YouTube/TikTok block confirmed with exact error message
- OpenAI SDK `openai@6.27.0` — `beta.chat.completions.parse()` and `zodResponseFormat` confirmed in npm package (installed in project)
- `https://github.com/timgit/pg-boss/discussions/403` — pg-boss + Next.js pain point (serverless environment compatibility)

### Tertiary (LOW confidence)
- WebSearch: Zod v4 + `zodResponseFormat` compatibility — flagged as open question, needs validation at implementation
- WebSearch: Firecrawl Behance/LinkedIn scraping success rate — no definitive data, requires empirical testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm, decisions locked by prior phase planning
- Architecture: MEDIUM-HIGH — patterns verified against official Next.js and Firecrawl docs; `after()` confirmed stable in Next.js 16
- Pitfalls: MEDIUM — Instagram block confirmed; Zod v4 compatibility is LOW confidence and flagged as open question
- Async queue approach: MEDIUM — `after()` is the right tool for this scale; limitations are clearly documented

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (Firecrawl API shape changes occasionally; verify `scrapeUrl` signature on implementation day)
