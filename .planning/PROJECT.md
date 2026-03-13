# HireFlow

## What This Is

A hiring and portfolio review management app for creative teams. It lets hiring managers import candidate data from spreadsheets, automatically extract contact info from portfolio links, organize candidates by role (Editor, Writer, Designer, AI/Tech + custom roles), track them through a multi-stage hiring pipeline, and collaborate as a team with comments — all in one responsive web app. Think: smart hiring CRM purpose-built for portfolio-heavy creative roles.

## Core Value

Team can import candidates in bulk, review portfolios by role, and move candidates through the hiring pipeline from first look to hire/reject — without switching between spreadsheets, emails, and messaging apps.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Role-based candidate lists with slider/tab navigation (Editor, Writer, Designer, AI/Tech + custom roles)
- [ ] Candidate list view showing name, email, portfolio link, status per role
- [ ] Candidate detail view with full profile, status history, team comments
- [ ] Multi-stage pipeline statuses: Left to Review, Under Review, Good Work/Shortlisted, Assignment Send Pending, Assignment Sent, Assignment Follow-up, Assignment Failed, Not Good Work, Maybe/Maybe, Hired, Rejected
- [ ] Junior/Senior classification — reviewer assigns after reviewing, filterable
- [ ] Single import: paste or upload Excel/CSV with candidate data
- [ ] Bulk import: upload spreadsheet, system maps columns intelligently (handles inconsistent formats — Name, Portfolio link, Email, Phone/WhatsApp, Social handles, Role applied for)
- [ ] AI extraction from portfolio links: auto-extract name, contact info, social media handles from portfolio pages (Instagram, YouTube, Google Drive, Behance, personal sites)
- [ ] Review screen for AI-extracted data — team confirms before saving (when info is incomplete or uncertain)
- [ ] Direct contact info pasting — system detects and stores email, WhatsApp, phone, Instagram, social profiles
- [ ] Search by name or email within candidate lists
- [ ] Filter by status, Junior/Senior within each role view
- [ ] Master view across all roles (in addition to per-role views)
- [ ] Rejection handling: log rejection reason + send custom rejection message (email/WhatsApp)
- [ ] Duplicate detection: flag when same person applies again or for multiple roles — team decides merge or keep separate
- [ ] Team comments on candidate profiles
- [ ] Dashboard with hiring stats: per role, per status, hired vs rejected counts
- [ ] Hired candidate flow: mark as hired with basic next-steps (v2: full onboarding in-app)
- [ ] Custom role creation: add new roles beyond the default set

### Out of Scope

- Native mobile app — web responsive is sufficient for v1
- Full onboarding workflow — v2, after hire tracking is validated
- In-app assignment sending — v1 tracks externally sent assignments (v2: direct send)
- Role-based permissions/access control — v1 is full team access (v2: granular permissions)
- Automated rejection messaging — v1 is manual custom message each time
- Video/audio playback within app — links out to source platforms
- ATS integrations (Greenhouse, Lever, etc.) — not needed for this team size

## Context

- **Company**: Zeeel.ai — scaling toward 100+ people, running parallel hiring across 5+ role categories
- **Team**: Zeel (Founder, final calls), Zaid (Ops Lead, imports/coordination), Vishal Tank (Video/Editing), Kunal Rana (Design), + core team
- **Current workflow**: Scattered across Google Sheets, Excel, Notion, Typeform responses, WhatsApp messages, DMs
- **Pain points**: No central candidate list, inconsistent data formats, no portfolio intelligence, no status tracking, no Junior/Senior triage, no collaboration layer, no duplicate detection
- **Portfolio types**: Instagram/YouTube links, Google Drive/Dropbox folders, personal websites, Behance, LinkedIn, raw pasted text with contact info
- **Candidate volume**: Hundreds per role per hiring cycle
- **Assignment workflow**: Tasks sent externally (email/WhatsApp), status tracked in-app
- **Detailed PRD**: ~/Downloads/HireFlow_PRD_v1.0.docx — full screen specs, API endpoints, DB schema, business rules
- **Implementation plan**: ~/Downloads/HIREFLOW_COMPLETE_PLAN.md — complete build reference with component library, state management, error handling

## Constraints

- **Platform**: Web-first, mobile responsive — no native apps
- **Team size**: Must work for small team (5-10) without complex permissions
- **Import flexibility**: Must handle messy, inconsistent spreadsheet formats gracefully
- **Portfolio extraction**: Best-effort AI extraction with human review step — never auto-save uncertain data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web responsive over native app | Faster to ship, team works from laptops primarily | — Pending |
| Junior/Senior assigned post-import | Candidates aren't pre-categorized — reviewer decides after seeing work | — Pending |
| AI extraction with review gate | Prevents bad data from auto-populating — team confirms uncertain extractions | — Pending |
| Full team access (no permissions v1) | Small team, trust-based, complexity not worth it yet | — Pending |
| Custom rejection messages | Each rejection is contextual — templates feel impersonal for creative roles | — Pending |
| Duplicate flagging over auto-merge | Team needs to decide case-by-case whether to merge or keep separate entries | — Pending |
| Next.js 16 + Supabase + Drizzle ORM | Research recommends over Prisma (90% smaller bundle, no cold-start) — PRD suggested Next.js 14 + Prisma but research is newer | — Pending |
| Clerk for auth | Simple team login v1, migrate to NextAuth + RBAC in v2 | — Pending |
| Firecrawl + OpenAI for extraction | Firecrawl converts URLs to markdown, GPT-4o-mini extracts structured data — research validated | — Pending |
| SheetJS Community + PapaParse for imports | Apache 2.0 licensed, handles Excel + CSV reliably | — Pending |

---
*Last updated: 2026-03-13 after requirements definition*
