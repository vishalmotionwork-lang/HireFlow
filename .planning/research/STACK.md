# Stack Research

**Domain:** Hiring/Portfolio Review CRM — web app with spreadsheet import, AI extraction, pipeline management, team collaboration
**Researched:** 2026-03-13
**Confidence:** HIGH (core stack), MEDIUM (AI extraction tooling)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1 (LTS, Oct 2025) | Full-stack React framework | App Router gives server components + API routes in one repo. Latest LTS version with Turbopack stable. Vercel-native deployment. Standard for new SaaS in 2025. |
| React | 19 | UI rendering | Required by Next.js 16. Server Actions reduce client-side boilerplate for form submissions and mutations. |
| TypeScript | 5.x | Type safety | Non-negotiable for team codebases. Catches schema mismatches at compile time — critical when AI extraction outputs flow into DB. |
| Tailwind CSS | 4.x (stable Jan 2025) | Styling | v4 is 5x faster builds, zero config, automatic content detection. shadcn/ui is built on it. No reason to use v3 on a greenfield project. |
| Supabase | supabase-js 2.80.0 | Postgres DB + Auth + Realtime + Storage | Managed Postgres with Row Level Security, built-in auth (email/password + magic link), realtime subscriptions for live pipeline updates, file storage for spreadsheet uploads. Removes infra management for a small team. |
| Drizzle ORM | 0.45.1 (stable) | Type-safe DB queries | 90% smaller bundle than Prisma, no cold-start penalty on Vercel serverless. SQL-like API means no magic — queries are predictable. Use stable 0.45.x; avoid v1.0.0-beta.x in production. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (CLI-driven) | UI component system | Every UI component — tables, dialogs, forms, tabs, badges. It is a code-ownership model (copy into repo), not a runtime dependency. Compatible with Next.js 16 + React 19 + Tailwind v4. |
| @tanstack/react-table | 8.x | Candidate list tables | Headless table with sorting, filtering, pagination, row selection. Use with shadcn/ui DataTable wrapper. Best-in-class for complex tabular data (per-role candidate lists). |
| @tanstack/react-query | 5.90.x | Server state management | Handles caching, background refetch, optimistic updates for pipeline status changes. ~20% smaller than v4. Use for all server data fetching in client components. |
| Zod | 4.x (released Aug 2025) | Schema validation | 14x faster parsing than v3, 57% smaller core. Use for: form validation, API input validation, AI extraction output schema definition. |
| openai | 6.27.0 | AI extraction + column mapping | Official OpenAI Node SDK. Structured Outputs with `zodResponseFormat` for portfolio data extraction and intelligent CSV column mapping. gpt-4o-mini for cost efficiency on extraction tasks. |
| @mendable/firecrawl-js | 4.15.4 | Portfolio page scraping | Turns any URL (Behance, personal site, etc.) into LLM-ready markdown. Handles JS-rendered sites, rate limits, and CAPTCHAs. Use before feeding page content to OpenAI for extraction. Required for non-social portfolio URLs. |
| xlsx (SheetJS) | 0.18.5 | Spreadsheet parsing | Apache 2.0 licensed community edition. Parses .xlsx, .xls, .csv in Node.js. Use for bulk import — extract raw rows, then pass to GPT-4o-mini for column mapping. Do NOT use the Pro/Commercial edition — it has changed licensing terms. |
| papaparse | 5.4.x | CSV-specific parsing | Streaming CSV parser with auto-delimiter detection. Use when input is known to be CSV (lighter than SheetJS). Fallback: use SheetJS as the universal handler. |
| react-hook-form | 7.x | Form state management | Zero re-renders on change, integrates with Zod resolver for validation. Use for all forms: candidate add, import preview, status update. |
| @hookform/resolvers | 3.x | Zod + RHF bridge | Connects Zod schemas to react-hook-form. Required for type-safe form validation. |
| resend | 4.x | Transactional email | Simple SDK for sending rejection emails. Pairs with React Email for template-based composition. Free tier: 100 emails/day. Sufficient for a 5-10 person hiring team. |
| react-email | 3.x | Email templates | React components that compile to email-safe HTML. Use for rejection email templates. |
| date-fns | 3.x | Date formatting | Lightweight tree-shakable alternative to moment.js. Use for status timestamps, pipeline duration calculations. |
| lucide-react | latest | Icons | Icon library that shadcn/ui uses by default. Consistent with the design system. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel | Deployment | Native Next.js deployment. Serverless functions for AI extraction jobs. Zero config. Free for small teams. |
| Drizzle Kit | DB migrations | `drizzle-kit generate` + `drizzle-kit migrate`. Works with Supabase's direct connection string (not pooled). |
| ESLint + Prettier | Code quality | Next.js ships with ESLint config. Add Prettier + `eslint-config-prettier` to avoid conflicts. |
| Vitest | Unit testing | Jest-compatible, Vite-powered. Faster than Jest for component and utility testing. |
| Playwright | E2E testing | For critical flows: import pipeline, status transitions, AI extraction review screen. |

---

## Installation

```bash
# Scaffold
npx create-next-app@latest hireflow --typescript --tailwind --eslint --app

# Core data layer
npm install @supabase/supabase-js @supabase/ssr drizzle-orm postgres
npm install -D drizzle-kit

# Validation + forms
npm install zod @hookform/resolvers react-hook-form

# UI components (shadcn installs components individually via CLI)
npx shadcn@latest init

# Tables + server state
npm install @tanstack/react-table @tanstack/react-query @tanstack/react-query-devtools

# AI extraction + scraping
npm install openai @mendable/firecrawl-js

# Spreadsheet import
npm install xlsx papaparse
npm install -D @types/papaparse

# Email
npm install resend react-email

# Utilities
npm install date-fns lucide-react
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle ORM | Prisma 7 | If team strongly prefers Prisma's ergonomic API and auto-migrations. Prisma 7 eliminated the Rust engine, so edge/serverless is no longer a problem. Use Drizzle here because bundle size and SQL transparency matter more than abstraction. |
| Supabase | Neon + Auth.js | If you want self-hosted auth or more control over Postgres config. Supabase adds realtime and storage which HireFlow needs — Neon alone doesn't provide these. |
| Supabase | PlanetScale | PlanetScale is MySQL-based and has ended its free tier. PostgreSQL ecosystem is standard for new projects. |
| Next.js 16 | Remix / TanStack Start | If your team has strong Remix background. Next.js 16 has the larger ecosystem and is the de facto standard for SaaS. |
| OpenAI gpt-4o-mini | Claude Haiku / Gemini Flash | If OpenAI costs become an issue at scale. Both support structured outputs. gpt-4o-mini is the cheapest per-token option with Structured Outputs support as of 2025. |
| Firecrawl | Playwright (self-hosted) | If Firecrawl API costs are a concern. Playwright requires infrastructure management. Start with Firecrawl (free tier: 500 scrapes) and migrate to self-hosted Playwright if volume justifies it. |
| Resend | Nodemailer + SMTP | Only if you own a sending domain and want zero external dependencies. Resend is simpler with better deliverability for small teams. |
| Tailwind v4 | Tailwind v3 + Tailwind Merge | Only if an existing project uses v3. On greenfield, v4 is strictly better. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Redux / Zustand for server state | Redundant when using TanStack Query. Adding a global state library for async data creates two sources of truth. | TanStack Query (server state) + React `useState`/`useReducer` (UI state) |
| Prisma Client for Edge functions | Prisma 7 fixed this, but on Supabase's connection pooler (port 6543), Prisma still needs workarounds. Drizzle works out of the box with `prepare: false`. | Drizzle ORM with `postgres` driver |
| Next.js Pages Router | Legacy. No Server Components, no Server Actions. Greenfield projects should use App Router only. | Next.js App Router |
| Moment.js | 67KB, deprecated by maintainers. | date-fns (tree-shakable, 2-3KB for what you use) |
| socket.io | Heavy WebSocket library. Supabase Realtime already provides channel-based subscriptions over WebSockets for pipeline status updates. | Supabase Realtime |
| Multer for file uploads | Node.js middleware approach doesn't integrate cleanly with Next.js App Router Server Actions. | Supabase Storage with signed upload URLs from a Server Action |
| SheetJS Pro / Commercial | License terms changed — commercial use requires a paid license. The Community Edition (Apache 2.0) is sufficient for import-only use. | SheetJS Community Edition (xlsx@0.18.5) |
| next-auth v4 | Outdated. Auth.js v5 is the successor, but Supabase Auth is simpler and already included in the stack. | Supabase Auth |
| @tanstack/react-query v4 | Current version is v5 with a simplified API. v4 is no longer maintained. | @tanstack/react-query v5 |

---

## Stack Patterns by Variant

**For spreadsheet bulk import:**
- Server Action receives the file upload
- SheetJS parses .xlsx/.xls to raw row arrays on the server
- PapaParse handles .csv (lighter, streaming-capable)
- First N rows passed to `gpt-4o-mini` with `zodResponseFormat` for intelligent column detection
- AI returns: `{ name_col, email_col, portfolio_col, phone_col, role_col }`
- User confirms mapping in a review UI before rows are inserted

**For AI portfolio extraction:**
- Firecrawl scrapes the URL → returns clean markdown
- Markdown passed to `gpt-4o-mini` with a Zod schema for `CandidateExtraction`
- Schema: `{ name?, email?, phone?, instagram?, youtube?, behance?, role_hint? }`
- All fields optional (best-effort). Confidence below threshold → send to human review queue
- Never auto-commit uncertain extractions (per PROJECT.md constraint)

**For pipeline status updates:**
- Supabase Realtime channels subscribed per-role-view
- Status change triggers a broadcast → all open clients see the update in real time
- Use TanStack Query `invalidateQueries` after mutations for consistency

**For duplicate detection:**
- On candidate insert, Supabase unique constraint check on `(email)` and fuzzy match on `(name, portfolio_url)`
- pg_trgm extension for similarity search in Postgres
- Surface as a review prompt, not automatic merge (per PROJECT.md)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 16 | React 19 | Required pairing. React 18 is NOT supported in Next.js 16. |
| Tailwind v4 | shadcn/ui latest | shadcn/ui updated in Dec 2025 for Tailwind v4 support. |
| Drizzle ORM 0.45.x | postgres 3.x | Use `postgres` (not `pg`) as the driver with Drizzle for Supabase. |
| @supabase/supabase-js 2.80.x | Node.js 20+ | Dropped Node 18 support in 2.79.0. Use Node 20 or 22. |
| openai 6.x | Zod 4.x | Use `zodResponseFormat` from `openai/helpers/zod`. Max 5 nesting levels in schema. |
| react-hook-form 7.x | Zod 4.x via @hookform/resolvers 3.x | Resolvers package must match RHF major version. |
| TanStack Query v5 | React 19 | Full React 19 support. Note: `isLoading` renamed to `isPending` in v5. |

---

## Sources

- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — confirmed version, LTS status, Turbopack stable
- [Next.js 16.1 release](https://nextjs.org/blog/next-16-1) — Dec 2025 update
- [Supabase docs: Use with Next.js](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — integration patterns (HIGH confidence)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.80.0, Node 20+ requirement (HIGH confidence)
- [Drizzle vs Prisma 2026 — Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/) — performance comparison, bundle sizes (MEDIUM confidence)
- [Drizzle vs Prisma — Makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — SaaS-specific recommendations (MEDIUM confidence)
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) — stable Jan 2025 (HIGH confidence)
- [shadcn/ui Dec 2025 changelog](https://ui.shadcn.com/docs/changelog/2025-12-shadcn-create) — Tailwind v4 + Next.js 16 compatibility (HIGH confidence)
- [TanStack Query v5 docs](https://tanstack.com/query/v5/docs/framework/react/overview) — v5.90.21 current version (HIGH confidence)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — zodResponseFormat, gpt-4o-mini support (HIGH confidence)
- [openai npm package](https://www.npmjs.com/package/openai) — v6.27.0 (HIGH confidence)
- [Firecrawl npm @mendable/firecrawl-js](https://www.npmjs.com/package/@mendable/firecrawl-js) — v4.15.4, pricing tiers (MEDIUM confidence)
- [Zod v4 InfoQ announcement](https://www.infoq.com/news/2025/08/zod-v4-available/) — stable Aug 2025, 14x faster (HIGH confidence)
- [SheetJS Community Edition docs](https://docs.sheetjs.com/) — Apache 2.0 license confirmed (HIGH confidence)
- [Papa Parse](https://www.papaparse.com/) — MIT licensed, streaming CSV (HIGH confidence)
- [Resend + Next.js](https://resend.com/nextjs) — App Router Server Action integration (HIGH confidence)

---

*Stack research for: HireFlow — Hiring/Portfolio Review CRM*
*Researched: 2026-03-13*
