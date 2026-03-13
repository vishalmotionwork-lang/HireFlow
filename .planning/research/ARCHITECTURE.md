# Architecture Research

**Domain:** Hiring and portfolio review CRM (creative roles)
**Researched:** 2026-03-13
**Confidence:** HIGH (patterns verified against multiple authoritative sources)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                         Client Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Candidates  │  │   Pipeline   │  │  Dashboard   │            │
│  │  (Role View) │  │  (Kanban or  │  │  (Stats +    │            │
│  │  List/Detail │  │   List)      │  │   Filters)   │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                  │                    │
│  ┌──────┴─────────────────┴──────────────────┴───────┐            │
│  │              Shared UI Components                  │            │
│  │   CandidateCard / CommentThread / StatusBadge      │            │
│  └─────────────────────────────────────────────────── ┘            │
└──────────────────────────┬────────────────────────────────────────┘
                           │ Server Actions / API Routes
┌──────────────────────────▼────────────────────────────────────────┐
│                       Application Layer                            │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Candidate   │  │    Import    │  │  AI Extraction       │   │
│  │   Service     │  │   Service    │  │  Service             │   │
│  │  (CRUD, de-   │  │  (CSV/Excel  │  │  (Scrape + LLM parse │   │
│  │   dup, filter)│  │   parse +    │  │   + review queue)    │   │
│  │               │  │   column map)│  │                      │   │
│  └───────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│          │                 │                      │               │
│  ┌───────▼─────────────────▼──────────────────────▼───────────┐   │
│  │                    Repository Layer                          │   │
│  │   CandidateRepo / CommentRepo / ImportRepo / EventRepo      │   │
│  └───────────────────────────────────────────────────────────── ┘  │
└──────────────────────────┬────────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                         Data Layer                                 │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │   PostgreSQL     │  │  File Storage  │  │  External APIs     │  │
│  │  (Supabase)      │  │  (raw imports) │  │  (LLM, scrapers)   │  │
│  │  candidates,     │  │                │  │                    │  │
│  │  comments,       │  │                │  │                    │  │
│  │  pipeline events │  │                │  │                    │  │
│  └─────────────────┘  └────────────────┘  └────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Candidate Service | CRUD, duplicate detection, status transitions, filter/search | Next.js Server Actions or API route handlers |
| Import Service | Parse CSV/Excel, map inconsistent columns, validate rows, hand off to Candidate Service | SheetJS (xlsx) + column mapping heuristics + Zod validation |
| AI Extraction Service | Scrape portfolio URLs, call LLM for structured extraction, enqueue review items | Cheerio/Puppeteer for scraping + OpenAI/Claude for parsing |
| Review Queue | Holds unconfirmed AI-extracted data until team approves or corrects | DB table (`extraction_drafts`) + dedicated review UI screen |
| Candidate Repository | DB access layer — inserts, updates, queries — no business logic | Drizzle ORM or Prisma against PostgreSQL |
| Comment Repository | Thread-per-candidate comments, timestamps, author | Appended rows, never mutated |
| Event/Activity Log | Immutable append-only record of every status change and action | `candidate_events` table, insert-only |
| Dashboard Service | Aggregation queries — counts by status/role/date | SQL group-by queries exposed as API or server component |

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router pages + layouts
│   ├── (dashboard)/            # Dashboard route group
│   │   └── page.tsx
│   ├── candidates/
│   │   ├── [id]/               # Candidate detail
│   │   │   └── page.tsx
│   │   └── page.tsx            # Role-filtered list
│   ├── import/
│   │   └── page.tsx            # Import wizard
│   └── review/
│       └── page.tsx            # AI extraction review queue
│
├── features/                   # Domain-grouped feature modules
│   ├── candidates/
│   │   ├── actions.ts          # Server Actions (create, update, delete, status change)
│   │   ├── queries.ts          # Read queries (list, detail, search, filter)
│   │   ├── schema.ts           # Zod validation schemas
│   │   ├── types.ts            # TypeScript types for this domain
│   │   └── components/         # UI components owned by this feature
│   │       ├── CandidateCard.tsx
│   │       ├── CandidateDetail.tsx
│   │       └── StatusBadge.tsx
│   │
│   ├── import/
│   │   ├── actions.ts          # Server Actions for import flow
│   │   ├── parser.ts           # CSV/Excel parsing + column mapping
│   │   ├── schema.ts           # Import row validation
│   │   └── components/
│   │       ├── ImportWizard.tsx
│   │       └── ColumnMapper.tsx
│   │
│   ├── extraction/
│   │   ├── actions.ts          # Server Actions: trigger scrape, approve/reject draft
│   │   ├── scraper.ts          # URL scraping logic (per-platform handlers)
│   │   ├── parser.ts           # LLM prompt + response parsing
│   │   ├── schema.ts           # Extracted data validation
│   │   └── components/
│   │       ├── ExtractionReview.tsx
│   │       └── DraftCard.tsx
│   │
│   ├── pipeline/
│   │   ├── actions.ts          # Status transition actions
│   │   ├── transitions.ts      # Valid state machine (which statuses follow which)
│   │   └── components/
│   │       └── PipelineView.tsx
│   │
│   ├── comments/
│   │   ├── actions.ts
│   │   └── components/
│   │       └── CommentThread.tsx
│   │
│   └── dashboard/
│       ├── queries.ts          # Aggregation queries
│       └── components/
│           └── StatsPanel.tsx
│
├── lib/                        # Shared infrastructure
│   ├── db/
│   │   ├── client.ts           # DB connection (Supabase / Drizzle)
│   │   └── schema.ts           # Database schema definitions
│   ├── llm/
│   │   └── client.ts           # LLM API wrapper (OpenAI SDK)
│   ├── auth/
│   │   └── session.ts          # Session handling (NextAuth or Supabase Auth)
│   └── utils/
│       ├── dedup.ts            # Duplicate detection logic
│       └── contact-detect.ts   # Email/phone/social handle detection
│
└── components/                 # Shared UI primitives (not domain-aware)
    ├── ui/                     # shadcn/ui components
    └── layout/
        ├── Sidebar.tsx
        └── RoleTabNav.tsx
```

### Structure Rationale

- **features/:** All domain logic (actions, queries, validation, components) lives together. A developer working on import touches only `features/import/` — no scattering.
- **lib/:** Infrastructure concerns (DB, LLM, auth, utilities) shared across features. No business logic here — only plumbing.
- **app/:** Thin routing layer. Pages import from features and lib. No business logic in page files.
- **components/:** Only stateless, domain-unaware primitives (buttons, modals, layout shells). Never import from features.

## Architectural Patterns

### Pattern 1: Immutable Event Log for Pipeline Transitions

**What:** Every status change is written as a new row in `candidate_events` (actor, from_status, to_status, timestamp, note). The current status is derived from the latest event or denormalized onto the candidate row.

**When to use:** Always — for the pipeline state machine. Status history is critical for audits, activity feeds, and undo.

**Trade-offs:** Slightly more complex queries; gives you full history with zero extra work. The alternative (overwriting a `status` column) loses all history permanently.

**Example:**
```typescript
// features/pipeline/actions.ts
async function transitionStatus(
  candidateId: string,
  toStatus: PipelineStatus,
  actorId: string,
  note?: string
) {
  const candidate = await getCandidateById(candidateId)

  // Validate the transition is allowed
  if (!VALID_TRANSITIONS[candidate.status].includes(toStatus)) {
    throw new Error(`Cannot transition from ${candidate.status} to ${toStatus}`)
  }

  // Insert event (never mutate events table)
  await db.insert(candidateEvents).values({
    candidateId,
    fromStatus: candidate.status,
    toStatus,
    actorId,
    note,
    createdAt: new Date(),
  })

  // Denormalize current status onto candidate for fast reads
  await db
    .update(candidates)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(candidates.id, candidateId))
}
```

### Pattern 2: Extraction Review Queue (Never Auto-Save Uncertain Data)

**What:** AI-extracted data from portfolio pages goes into a `extraction_drafts` table with a `confidence` field. The UI shows the review queue; team confirms or corrects before it hits the `candidates` table.

**When to use:** Every AI extraction workflow. AI is best-effort. Bad data silently saved is worse than no data saved.

**Trade-offs:** Adds a manual step. The payoff is trusted data quality — the entire point of the feature.

**Example:**
```typescript
// features/extraction/actions.ts
async function submitExtractionDraft(
  candidateId: string,
  draftId: string,
  corrections: Partial<ExtractedFields>
) {
  const draft = await db.query.extractionDrafts.findFirst({
    where: eq(extractionDrafts.id, draftId),
  })

  // Merge corrections over AI-extracted values (corrections win)
  const confirmed = { ...draft.extracted, ...corrections }

  await db.update(candidates)
    .set(confirmed)
    .where(eq(candidates.id, candidateId))

  await db.update(extractionDrafts)
    .set({ status: 'approved', reviewedAt: new Date() })
    .where(eq(extractionDrafts.id, draftId))
}
```

### Pattern 3: Column Mapping Heuristics for Messy Spreadsheet Import

**What:** Parse column headers using fuzzy matching (Levenshtein distance or keyword lists) to propose a name → field mapping. Show the mapping to the user before importing. Never silently drop or mismap columns.

**When to use:** Import wizard flow. Real spreadsheets from creative teams will have headers like "Portfolio Link", "Link to work", "Their site", "Drive folder".

**Trade-offs:** Requires a review UI step, but this is the correct UX — one wrong column map corrupts all imported rows.

**Example:**
```typescript
// features/import/parser.ts
const COLUMN_ALIASES: Record<string, string[]> = {
  name:      ['name', 'full name', 'candidate', 'applicant'],
  email:     ['email', 'e-mail', 'mail', 'contact email'],
  portfolio: ['portfolio', 'portfolio link', 'link', 'work', 'site', 'drive'],
  phone:     ['phone', 'whatsapp', 'mobile', 'contact number'],
  role:      ['role', 'position', 'applying for', 'applied role'],
}

function mapHeaders(rawHeaders: string[]): Record<string, string | null> {
  return Object.fromEntries(
    rawHeaders.map(h => {
      const normalized = h.toLowerCase().trim()
      const match = Object.entries(COLUMN_ALIASES).find(([, aliases]) =>
        aliases.some(alias => normalized.includes(alias))
      )
      return [h, match ? match[0] : null]
    })
  )
}
```

## Data Flow

### Candidate Import Flow

```
User uploads CSV/Excel
    ↓
ImportService.parseFile()        — SheetJS parses raw bytes to rows
    ↓
ImportService.detectColumns()    — fuzzy-map headers to known fields
    ↓
UI: ColumnMapper screen          — user confirms/fixes mapping
    ↓
ImportService.validateRows()     — Zod schema validates each row
    ↓
CandidateService.bulkInsert()    — dedup check per row before insert
    ↓
DB: candidates table             — new rows created
    ↓
ExtractionService.queuePortfolios()  — portfolio URLs queued for AI scrape
```

### AI Portfolio Extraction Flow

```
Portfolio URL (from import or manual entry)
    ↓
ExtractionService.scrape(url)    — Cheerio (static) or Puppeteer (JS-heavy)
    ↓
LLM.extract(htmlContent)         — structured prompt → JSON (name, email, phone, socials)
    ↓
ExtractionService.saveDraft()    — writes to extraction_drafts with confidence score
    ↓
UI: Review Queue                 — team sees draft, can edit each field
    ↓
ExtractionService.approveDraft() — merges confirmed fields onto candidate record
```

### Status Transition Flow

```
Reviewer clicks status change in UI
    ↓
pipeline/actions.ts: transitionStatus()
    ↓
Validate transition is allowed (state machine check)
    ↓
Insert row in candidate_events (immutable log)
    ↓
Update candidates.status (denormalized for fast reads)
    ↓
UI re-renders with new status badge + activity feed entry
```

### Key Data Flows

1. **Import → Extraction:** Import creates candidate rows with portfolio URLs. Extraction is triggered post-import, running async. Candidates are usable immediately; AI data enriches them later.
2. **Status → Activity Feed:** Every status change flows through the event log, which doubles as the candidate's activity history — no separate "history" query needed.
3. **Comment creation:** Append-only inserts into `candidate_comments`. Never update or delete (audit trail).
4. **Dashboard aggregation:** SQL GROUP BY queries against `candidates` (status, role, created_at). No separate analytics store needed at this scale.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k candidates | Monolith is fine. All in Next.js + Supabase. No queue needed. |
| 1k-50k candidates | Add pg indexes on `role`, `status`, `created_at`. Background job queue (Inngest or pg-boss) for AI extraction. |
| 50k+ candidates | Separate extraction worker service. Read replicas for dashboard queries. Consider full-text search index (pgvector or Typesense). |

### Scaling Priorities

1. **First bottleneck: AI extraction throughput.** Scraping portfolio URLs is slow and blocks if done synchronously during import. Fix: queue extraction jobs immediately, process async. Show "extraction pending" in UI.
2. **Second bottleneck: Dashboard queries.** At high candidate counts, `COUNT GROUP BY` across all candidates gets slow. Fix: materialized view or denormalized counters updated on status change.

## Anti-Patterns

### Anti-Pattern 1: Overwriting Status Directly

**What people do:** `UPDATE candidates SET status = 'shortlisted'` — simple, direct.
**Why it's wrong:** Loses all history. Team can't see when a candidate moved stages, who changed it, or why. "When did we send the assignment?" becomes unanswerable.
**Do this instead:** Insert into `candidate_events`, then update the denormalized `candidates.status` column. Read history from events, read current state from candidates.

### Anti-Pattern 2: Auto-Saving AI-Extracted Data Without Review

**What people do:** Scrape portfolio → immediately update candidate record with extracted name/email.
**Why it's wrong:** AI extraction has false positives. A YouTube description page → wrong email. An Instagram bio → wrong name. Silent bad data is worse than missing data.
**Do this instead:** Always write extractions to a `extraction_drafts` table. Surface in a dedicated review UI. Only write to the candidate record after human confirmation.

### Anti-Pattern 3: Fat Monolithic Import Function

**What people do:** One 300-line function that parses, validates, maps, deduplicates, and inserts all in one pass.
**Why it's wrong:** Untestable, brittle, hard to show progress in UI, no recovery on partial failure.
**Do this instead:** Split into discrete steps: `parseFile()` → `detectColumns()` → `validateRows()` → `checkDuplicates()` → `bulkInsert()`. Each step is testable independently and progress can be shown in a wizard UI.

### Anti-Pattern 4: Storing Duplicate Records Silently

**What people do:** Skip deduplication to simplify import. "We'll clean it up later."
**Why it's wrong:** Duplicate candidates fragment the team's view. Reviewers unknowingly work the same person twice. Later cleanup is painful because status history is now split across two records.
**Do this instead:** Check for duplicates at import time (match on email, or fuzzy name + portfolio URL). Flag, don't auto-merge. Show the conflict in the UI and let the team decide.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI / Claude API | REST call in `lib/llm/client.ts`, wrapped in try/catch | Rate limit aware — queue requests, don't fire concurrently for bulk imports |
| Cheerio (HTML parsing) | Server-side library, no external call | Use for static HTML portfolio pages (Behance, personal sites) |
| Puppeteer / Playwright | Headless browser, run in Node.js | Use only for JS-rendered pages (Instagram requires this). Heavy — run async, not on request. |
| SheetJS (xlsx) | Server-side library | Parse CSV and Excel. Run inside Server Action, not in browser. |
| Supabase | PostgreSQL + Auth + Storage | DB client in `lib/db/client.ts`. Use Row Level Security only if permissions needed (v2). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| features/import ↔ features/candidates | CandidateService.bulkInsert() called from ImportService | Import owns parsing logic; Candidates owns storage and dedup logic |
| features/extraction ↔ features/candidates | ExtractionService.approveDraft() calls CandidateService.updateFields() | Extraction never writes to candidates directly — always through Candidate Service |
| features/pipeline ↔ features/candidates | Pipeline actions call CandidateService for reads; write directly to events table | Pipeline owns state machine rules; Candidate Service owns the data shape |
| app/ (routes) ↔ features/ | Server Actions and query functions only — no direct DB calls in page files | Page files stay thin: fetch + render. All logic lives in features/ |

## Sources

- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/) — Next.js feature-based structure, server actions colocated with domain
- [CRM Database Schema Example](https://www.dragonflydb.io/databases/schema/crm) — candidate/pipeline relational schema patterns
- [ATS Pipeline Stage Customization — Recruit CRM](https://help.recruitcrm.io/en/articles/6250832-customize-your-hiring-pipeline-and-create-multiple-hiring-pipelines) — real-world pipeline stage models
- [AI-Powered ATS Architecture — Medium](https://medium.com/@anshulshukla_2523/building-an-ai-powered-applicant-tracking-system-ats-using-ml-and-ai-369748e62c64) — AI extraction pipeline design
- [Web Scraping for Recruiters — AIM Multiple](https://research.aimultiple.com/web-scraping-recruitment/) — portfolio scraping patterns and tooling
- [Applicant Tracking System — Wikipedia](https://en.wikipedia.org/wiki/Applicant_tracking_system) — canonical ATS component taxonomy
- [Next.js App Router folder structure — Alamin Shaikh](https://www.alaminshaikh.com/blog/nextjs-app-router-folder-structure-for-full-stack-projects) — folder structure conventions

---
*Architecture research for: HireFlow — hiring and portfolio review CRM*
*Researched: 2026-03-13*
