# Project Research Summary

**Project:** HireFlow — Hiring/Portfolio Review CRM
**Domain:** Creative team applicant tracking and portfolio management
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

HireFlow is a purpose-built hiring CRM for creative teams that need to track candidates across creative roles (Editor, Writer, Designer, AI/Tech), review portfolio links, and move candidates through an 11-stage hiring pipeline. Unlike generic ATS tools (Breezy HR, Greenhouse) that treat portfolios as plain text fields, HireFlow's core differentiation is AI-powered extraction of contact and portfolio data from Behance, Instagram, YouTube, personal sites, and other URLs — combined with a mandatory human review gate that prevents bad data from silently corrupting the database. The team is migrating from Google Sheets/Excel, so bulk spreadsheet import is an entry point, not an add-on.

The recommended approach is a Next.js 16 + Supabase + Drizzle ORM monolith with a feature-folder architecture. This combination eliminates infrastructure management overhead, provides built-in auth and realtime for pipeline updates, and scales comfortably to tens of thousands of candidates without a separate services layer. The AI extraction pipeline uses gpt-4o-mini via OpenAI Structured Outputs (zodResponseFormat) and Firecrawl for portfolio URL scraping. All AI extractions land in a review queue, never directly on candidate records. The entire stack is deployable to Vercel with zero infrastructure configuration.

The two highest-risk areas are the import pipeline and the AI extraction feature. Spreadsheet encoding corruption (Windows-1252 vs UTF-8), silent column misclassification, and N+1 query performance failures have each destroyed production data in similar products. These are not edge cases — they are the default experience with real-world spreadsheets from creative teams. The mitigation is consistent: always preview parsed data before committing, always require explicit user confirmation at column-mapping and AI-review steps, and always run bulk database operations as batched transactions. Supabase Row Level Security must be enabled before any data is stored, not as a cleanup step.

## Key Findings

### Recommended Stack

The stack is a coherent, well-integrated set of modern tools with no controversial choices. Next.js 16 (LTS, App Router) with React 19 and TypeScript 5.x is the standard foundation. Supabase provides Postgres, auth, realtime, and file storage in a single managed service. Drizzle ORM (v0.45.x stable) is preferred over Prisma for its smaller bundle size and transparent SQL semantics on Vercel serverless. Zod v4 handles all schema validation including AI extraction output schemas. The AI extraction pipeline pairs the official OpenAI SDK (v6.27.0) with Firecrawl for URL-to-markdown scraping.

**Core technologies:**
- Next.js 16 + React 19: Full-stack framework with App Router, Server Actions, Turbopack — standard for new SaaS
- TypeScript 5.x: Non-negotiable for catching AI extraction schema mismatches at compile time
- Supabase (supabase-js 2.80.0): Postgres + Auth + Realtime + Storage — eliminates infra management
- Drizzle ORM 0.45.x: Type-safe DB queries, 90% smaller bundle than Prisma, no cold-start penalty
- Tailwind CSS v4 + shadcn/ui: Component library built on code-ownership model (copied into repo, not runtime dep)
- TanStack React Table v8 + TanStack Query v5: Headless table primitives + server state management
- Zod v4: 14x faster parsing than v3, used for forms, API validation, and AI extraction output schemas
- OpenAI SDK 6.27.0 + gpt-4o-mini: Structured Outputs via zodResponseFormat for extraction
- Firecrawl (@mendable/firecrawl-js 4.15.4): JS-rendered page scraping — handles Behance, personal sites
- SheetJS (xlsx 0.18.5, Apache 2.0): .xlsx/.xls parsing server-side in Server Actions
- Resend + React Email: Rejection email delivery with React-component templates

**Critical version requirements:**
- Next.js 16 requires React 19 (React 18 is not supported)
- supabase-js 2.80+ requires Node 20+
- openai 6.x requires Zod 4.x for zodResponseFormat
- Drizzle must use `postgres` driver (not `pg`) with Supabase's direct connection string (not pooled)

### Expected Features

The feature set divides cleanly into table stakes (every ATS has these), differentiators (unique to this product's context), and explicit anti-features (things that seem good but create problems for this team).

**Must have (table stakes):**
- Candidate profile: name, email, phone/WhatsApp, portfolio links, social handles, role, status, Junior/Senior tag
- Role-based list views (Editor, Writer, Designer, AI/Tech + custom) with per-role filter state
- 11-stage pipeline status tracking with full status history log
- Bulk import from CSV/Excel with column mapping preview
- Single candidate add with contact detection from pasted free text
- Team comments on candidate profiles (append-only, attributed)
- Search by name or email; filter by status and Junior/Senior
- Master view across all roles
- Duplicate detection on import and manual add (flag for team decision, never auto-merge)
- Rejection flow: log reason + compose custom message for copy-paste to external channel
- Dashboard: per-role counts, per-status counts, hired vs rejected totals
- Custom role creation

**Should have (competitive differentiators):**
- AI extraction from portfolio links with human review gate before saving — the core product differentiator
- Contact detection from pasted free text (auto-parse email, phone, Instagram, YouTube)
- Junior/Senior classification toggle assigned by reviewer post-review
- Per-rejection custom messaging (not templates — creative rejections require personal tone)
- Assignment workflow as explicit pipeline stages

**Defer (v2+):**
- In-app email/WhatsApp send via API — manual copy-paste is sufficient at v1 team size
- Role-based permissions — not needed until team exceeds 15-20 people
- Onboarding workflow — separate scope from hiring tracking
- Interview scheduling — not part of current team workflow

**Explicit anti-features (do not build):**
- Auto-merge duplicate candidates (silent data loss)
- Auto-save AI extractions without review (silent bad data)
- AI scoring / auto-ranking candidates (creates bias anchoring for creative roles)
- In-app video/audio playback (portfolio platforms do this better)

### Architecture Approach

The architecture is a layered Next.js monolith with clear internal boundaries: thin App Router page files, domain-grouped feature modules (features/candidates, features/import, features/extraction, features/pipeline, features/comments, features/dashboard), a shared lib/ for infrastructure concerns (DB, LLM, auth, utilities), and a components/ layer for stateless UI primitives only. The feature-folder pattern ensures all domain logic for a given concern is colocated and independently testable. Business logic never lives in page files or the components/ layer.

**Major components:**
1. Candidate Service — CRUD, duplicate detection, status transitions, filter/search
2. Import Service — CSV/Excel parsing, column mapping heuristics, row validation, batch insert
3. AI Extraction Service — URL scraping via Firecrawl, LLM structured extraction, extraction_drafts queue
4. Review Queue — UI + DB table holding unconfirmed AI-extracted data until team approves
5. Pipeline Service — state machine for valid status transitions, immutable event log
6. Comment Repository — append-only comment threads per candidate
7. Dashboard Service — SQL GROUP BY aggregation queries, no separate analytics store
8. Repository Layer — Drizzle ORM adapters, no business logic, owned by each feature module

**Key patterns:**
- Immutable event log for pipeline transitions: every status change is a new row in candidate_events; current status is denormalized on the candidate row for fast reads but authoritative history lives in events
- Extraction draft queue: AI results always land in extraction_drafts; team confirms before candidates table is updated
- Feature module colocation: actions.ts + queries.ts + schema.ts + types.ts + components/ per feature
- Batch operations: bulk import uses a single transaction, duplicate check runs as a SET JOIN against existing emails — never per-row queries

### Critical Pitfalls

1. **Spreadsheet encoding corruption silently destroys data** — Detect BOM and handle UTF-8-BOM, UTF-16-LE, and Windows-1252 explicitly before parsing. Always preview first 3 rows before committing import. Test with names containing diacritics (e.g., "Priyá") before any production import.

2. **AI portfolio extraction has no graceful degradation** — Every AI extraction must return per-field confidence levels. Low-confidence fields surface in the review UI; high-confidence fields suggest but never auto-commit. Hard timeout of 10-15 seconds per scrape; Instagram and login-gated Google Drive links are expected to fail and must return "manual entry required" gracefully, not a crash or hang.

3. **Pipeline state has no history, making audits impossible** — Model pipeline status as an append-only candidate_events table from the start. Never update a status column in-place. This decision cannot be retrofitted cheaply — it must be established in the data model before any pipeline UI is built.

4. **Bulk import N+1 performance degrades at scale** — Import handler must batch-insert all rows in a single transaction. Duplicate checks must run as a set JOIN (all emails at once), not per-candidate queries. AI extraction must be triggered as an async background job after import completes, never inline during the import request.

5. **Supabase RLS disabled exposes all candidate data** — Enable Row Level Security on every table before writing any application logic. Test with the anon key via the client SDK, not the SQL editor. The anon key is in the frontend bundle; without RLS, all candidate personal data is exposed to anyone who has the Supabase project URL.

## Implications for Roadmap

Based on the combined research, a 5-phase structure is recommended. The ordering is driven by two constraints: (1) the data model for status history and candidate schema must exist before any UI feature is built on top of it, and (2) the import pipeline is the entry point — the team cannot use the product until it can migrate their existing spreadsheet data.

### Phase 1: Foundation and Data Model

**Rationale:** Every subsequent feature depends on the candidate schema, authentication, database migrations, and Supabase RLS. Building UI before this is established creates expensive rework. The event log pattern for pipeline status must be decided here or retrofitting it costs an entire sprint.

**Delivers:** Authenticated Next.js app with Supabase, Drizzle ORM schema (candidates, candidate_events, candidate_comments, extraction_drafts tables), RLS policies on all tables, and project scaffolding (feature folders, shared lib/db, lib/auth, Zod schemas for core types).

**Addresses:** Custom role creation schema, candidate profile schema, pipeline event log schema.

**Avoids:** Pitfall 4 (no status history), Pitfall 7 (RLS disabled). Both are "phase 1 or never" decisions.

**Research flag:** Standard patterns — well-documented Supabase + Drizzle + Next.js 16 scaffolding. No deep phase research needed.

### Phase 2: Import Pipeline

**Rationale:** The team is migrating from spreadsheets. Without a working import, they cannot start using the product. Import is the entry point that populates the database for everything else to operate on. This phase has the highest density of pitfalls — build it carefully before building the UI that displays its output.

**Delivers:** File upload to Supabase Storage, SheetJS/PapaParse parsing, AI-assisted column mapping with user confirmation UI, row validation via Zod, batch insert with duplicate detection, import progress UI, and post-import summary (rows imported vs skipped).

**Addresses:** Bulk import with column mapping, duplicate detection on import, single candidate add with contact paste detection.

**Avoids:** Pitfall 1 (encoding corruption), Pitfall 2 (silent column misclassification), Pitfall 5 (duplicate detection false positives), Pitfall 6 (N+1 bulk import performance).

**Research flag:** Needs attention during planning for the encoding detection implementation and the column-mapping heuristic vs LLM-assist tradeoff. SheetJS + PapaParse patterns are well-documented; encoding edge cases are not.

### Phase 3: Candidate Management and Pipeline UI

**Rationale:** Once data is in the database (via import or manual add), the team needs to view, filter, and move candidates through the pipeline. This is the daily-use core of the product. Depends on Phase 1 (schema) and benefits from Phase 2 (populated data for realistic testing).

**Delivers:** Role-based list views with tab navigation, candidate detail view (profile + status history + comments), pipeline status transitions (using the event log from Phase 1), search and filter (by status, role, Junior/Senior), master view across all roles, team comments, Junior/Senior classification, rejection flow with custom message compose, and dashboard stats.

**Addresses:** All table stakes features, 11-stage pipeline, team collaboration, rejection logging, dashboard.

**Avoids:** Anti-pattern of overwriting status directly (must use event log established in Phase 1); per-role filter state isolation.

**Research flag:** Standard patterns for TanStack Table + shadcn/ui DataTable. Dashboard aggregation queries are straightforward SQL GROUP BY. No deep research needed.

### Phase 4: AI Portfolio Extraction

**Rationale:** AI extraction is the product's primary differentiator, but it depends on a working candidate profile (Phase 3) to write enriched data into. Building extraction before the candidate model is stable risks coupling the extraction schema to an unstable base. Phase 4 lets the team use the product in production before the AI feature ships, which generates real portfolio URL data to test extraction against.

**Delivers:** Per-candidate "Extract from portfolio" trigger, Firecrawl scraping pipeline, gpt-4o-mini structured extraction with Zod schema, confidence-scored extraction_drafts, review queue UI (side-by-side extracted vs blank with confidence indicators), confirm/edit/reject flow, async extraction queue with status indicator in UI.

**Addresses:** AI extraction differentiator, human review gate, contact detection.

**Avoids:** Pitfall 3 (no graceful degradation — Instagram/Drive/broken URLs must fail gracefully), Anti-pattern 2 (auto-saving without review).

**Research flag:** Needs phase research during planning. Instagram scraping is blocked (Firecrawl handles some cases), Google Drive requires public links, confidence calibration for gpt-4o-mini on contact extraction is not well-documented. Timeout and queue implementation (Supabase Edge Functions vs Inngest vs simple server-side queuing) needs a decision.

### Phase 5: Polish, Performance, and v1.x Features

**Rationale:** Once all core features are working, this phase addresses performance baselines (pagination, indexes, list virtualization), real-world edge cases discovered in early production use, and the P2 features deferred from earlier phases.

**Delivers:** Cursor-based pagination on candidate lists, database indexes on (role, status, classification), assignment workflow as explicit pipeline stages, bulk rejection flow, CSV export, Playwright E2E tests for critical flows (import, status transition, AI extraction review).

**Addresses:** Performance pitfalls (fetch-all without pagination breaks at 200+ candidates), assignment tracking (P2 feature), export.

**Avoids:** Pitfall 6 performance trap (no pagination); list virtualization for large per-role views.

**Research flag:** Standard patterns. Cursor-based pagination with Drizzle is well-documented. Playwright E2E for Next.js + Supabase has established patterns.

### Phase Ordering Rationale

- **Schema first, always:** Status history and the extraction_drafts table are architectural decisions that cannot be added cheaply after features are built on top of them. Establishing them in Phase 1 means every subsequent phase builds on a stable, correct base.
- **Import before display:** A candidate list view is useless without data. The team needs to migrate their existing spreadsheets as the first real use of the product, so the import pipeline ships before the full pipeline UI.
- **Core UI before AI:** The AI extraction feature enriches candidate profiles that already exist. Shipping Phase 3 first lets the team validate the hiring workflow before adding the extraction layer, and generates real portfolio URLs to test extraction against.
- **Performance last, not never:** Pagination and indexes are deferred to Phase 5 to avoid premature optimization, but the architecture decisions (cursor-based pagination pattern, index columns) are noted in Phase 1 schema design so they are not expensive to add.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Import Pipeline):** Encoding detection for Windows-1252 / UTF-16 in Node.js — `chardet` vs `iconv-lite` integration with SheetJS is not well-documented. Column mapping: heuristic keyword-match vs LLM-assisted — cost/accuracy tradeoff needs evaluation before implementation.
- **Phase 4 (AI Extraction):** Instagram scraping viability with Firecrawl (rate-limit behavior, success rate). Confidence calibration for gpt-4o-mini on contact extraction from portfolio markdown. Async queue implementation choice: Supabase Edge Functions with pg-boss vs Inngest vs simple server-side promise queue.

Phases with standard patterns (skip deep phase research):
- **Phase 1 (Foundation):** Supabase + Drizzle + Next.js 16 scaffolding is extensively documented with official guides.
- **Phase 3 (Candidate UI):** TanStack Table + shadcn/ui DataTable patterns are mature and well-documented. SQL GROUP BY for dashboard stats is straightforward.
- **Phase 5 (Polish):** Cursor-based pagination and Playwright E2E for Next.js are standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major packages verified against official docs and npm. Version compatibility matrix validated. The only MEDIUM area is Firecrawl's actual scraping success rate against Instagram/Drive in production — this is runtime behavior, not documentation. |
| Features | HIGH (table stakes) / MEDIUM (differentiators) | Table stakes confirmed against Breezy HR, Greenhouse, Airtable-based setups. Creative-specific differentiators (assignment tracking, Junior/Senior classification, 11-stage pipeline) are product decisions, not research findings — confidence is high that the product needs them, medium that the exact implementation resonates with users before validation. |
| Architecture | HIGH | Feature-folder + event-log + extraction-draft-queue patterns verified against multiple Next.js SaaS references. The immutable event log and review queue patterns are specifically called out in multiple ATS architecture analyses. |
| Pitfalls | HIGH | All 7 critical pitfalls are verified with production incident reports, security disclosures, and community post-mortems. Encoding corruption, RLS misconfig, and N+1 import performance are consistent across multiple unrelated sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **Firecrawl success rate on restricted URLs:** Firecrawl's free tier (500 scrapes) and behavior on Instagram/Google Drive is documented at the API level but real-world success rates for creative portfolio extraction are not benchmarked. Address in Phase 4 planning by running extraction tests against a sample of 20-30 real portfolio links before committing to the implementation approach.
- **Column mapping LLM vs heuristic tradeoff:** The research recommends showing column mapping to users before committing, but does not resolve whether the initial mapping suggestion should use keyword-alias heuristics or gpt-4o-mini inference. Address in Phase 2 planning — heuristic is cheaper and more predictable; LLM is more flexible for unusual column names.
- **Async queue infrastructure for AI extraction at scale:** The research recommends a background job queue for AI extraction but does not prescribe a specific tool. For v1 (small team, low import volume), a simple server-side async process may be sufficient. For Phase 5+ scale, Inngest or pg-boss is the right answer. This decision should be revisited at the start of Phase 4.

## Sources

### Primary (HIGH confidence)

- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — version, LTS status, Turbopack stable
- [Supabase docs: Use with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — integration patterns
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.80.0, Node 20+ requirement
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) — stable Jan 2025
- [shadcn/ui Dec 2025 changelog](https://ui.shadcn.com/docs/changelog/2025-12-shadcn-create) — Tailwind v4 + Next.js 16 compatibility
- [TanStack Query v5 docs](https://tanstack.com/query/v5/docs/framework/react/overview) — v5.90.21 current
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — zodResponseFormat, gpt-4o-mini support
- [openai npm package](https://www.npmjs.com/package/openai) — v6.27.0
- [Zod v4 InfoQ announcement](https://www.infoq.com/news/2025/08/zod-v4-available/) — stable Aug 2025, 14x faster
- [SheetJS Community Edition docs](https://docs.sheetjs.com/) — Apache 2.0 license confirmed
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS configuration
- [Supabase RLS Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security) — 83% exposure rate for RLS misconfig

### Secondary (MEDIUM confidence)

- [Drizzle vs Prisma — Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/) — bundle size comparison
- [Drizzle vs Prisma — Makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — SaaS-specific recommendations
- [Firecrawl npm @mendable/firecrawl-js](https://www.npmjs.com/package/@mendable/firecrawl-js) — v4.15.4, pricing tiers
- [Modern Full Stack Application Architecture Using Next.js 15+](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/) — feature-based structure patterns
- [AI-Powered ATS Architecture — Medium](https://medium.com/@anshulshukla_2523/building-an-ai-powered-applicant-tracking-system-ats-using-ml-and-ai-369748e62c64) — AI extraction pipeline design
- [Breezy HR Review 2026 — People Managing People](https://peoplemanagingpeople.com/tools/breezy-review/) — feature benchmarking
- [Airtable for Recruiting — The Daily Hire](https://thedailyhire.com/tools/airtable-recruiting-workflows-creative-budget-friendly) — DIY CRM comparison
- [Recruitment Pipeline Management for Small Agencies — Augtal](https://augtal.com/blog/recruitment-pipeline-management-for-small-agencies-in-2026-the-complete-guide/) — small-team ATS patterns
- [Top Web Scraping Challenges in 2025 — ScrapingBee](https://www.scrapingbee.com/blog/web-scraping-challenges/) — scraping pitfalls
- [CSV & Excel Encoding Hell in NodeJS — Theodo](https://blog.theodo.com/2017/04/csv-excel-escape-from-the-encoding-hell-in-nodejs/) — encoding pitfall documentation
- [Why CRM Projects Fail in 2025 — Atyantik](https://atyantik.com/why-crm-projects-fail-in-2025/) — CRM anti-patterns
- [The Reality of AI Hallucinations in 2025 — drainpipe.io](https://drainpipe.io/the-reality-of-ai-hallucinations-in-2025/) — extraction confidence calibration
- [How to Handle Large Datasets in Frontend Applications — Great Frontend](https://www.greatfrontend.com/blog/how-to-handle-large-datasets-in-front-end-applications) — performance patterns

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
