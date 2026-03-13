# Phase 1: Foundation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

A working Next.js app running locally with complete database schema, app shell (sidebar, topbar, main content area), default role seeding, custom role creation from Settings, and empty-but-structured role pages. No candidate CRUD, no import, no AI extraction — those are Phases 2-4.

**AUTH DEFERRED:** Authentication (Clerk), RLS, sign-in/sign-up pages, and deployment are all skipped in Phase 1. Build everything local-first. Auth + shipping added as a later phase after all features work.

**Reference documents:**
- PRD: `~/Downloads/HIREFLOW_COMPLETE_PLAN.md` — full screen specs, DB schema (Prisma), API endpoints, component library, business rules
- The PRD uses Prisma + Next.js 14 but our roadmap chose **Drizzle ORM + Next.js 16 + Supabase** — adapt schema accordingly
- For Phase 1: use local SQLite or Postgres via Drizzle (no Supabase connection needed yet)

</domain>

<decisions>
## Implementation Decisions

### App Shell Layout
- Sidebar follows PRD responsive spec: full with labels on desktop, icon-only on tablet, overlay via hamburger on mobile
- Claude's discretion on sidebar behavior (fixed vs collapsible on desktop) — follow what feels cleanest
- Sidebar navigation structure: **grouped** — Dashboard and Master View at top, then a "ROLES" section header with the role list below, "+ New Role" link at bottom of role list, Settings pinned at bottom
- **No candidate count badges** on sidebar roles — counts are visible on dashboard and role pages
- "+ New Role" available in **both** sidebar and Settings page
- Topbar: HireFlow logo + search bar (visible but disabled/non-functional in Phase 1) + mock user avatar (hardcoded)
- User avatar dropdown: show mock user name, no sign-out until auth is added

### Dashboard (Empty State)
- Show the skeleton dashboard with all stats at zero and empty role cards (4 defaults + "Create New Role" card)
- Claude's discretion on whether to include the hired/rejected table and activity feed sections as empty placeholders, or just the stats bar + role cards
- Role cards in Phase 1: show card structure with 0 candidates. **Hide** action buttons (Import, Add Candidate) until those features land in later phases. Only "View All" link to role page.

### Role Pages
- Each role gets its own page (`/roles/[roleSlug]`) from Phase 1
- Show the role tab strip at top + role header with "(0)" count + "No candidates yet" empty state
- This structure is ready for Phase 2 to populate with candidate table

### Settings Page
- Phase 1 scope: **Role management only** — list, create, edit, reorder, deactivate roles
- Team member view deferred to later phase
- Role creation form: name + icon (from **preset Lucide icon set**, ~20 creative-role-relevant icons) + description
- Default roles (Video Editor, Writer/Scriptwriter, Designer, AI/Tech) are **fully editable** — can rename, change icon, reorder, deactivate. Nothing locked.
- Role reordering: Claude's discretion (drag-to-reorder or manual sort number — either works)

### Auth & Onboarding — DEFERRED
- **Skipped for Phase 1.** No Clerk, no sign-in pages, no protected routes, no RLS.
- App runs fully open locally — no auth middleware, no user context.
- Hardcode a mock user (name + avatar) for UI elements that need it (topbar avatar, "added by" fields).
- Landing page at `/`: redirect straight to `/dashboard` (no branded landing page until auth exists).
- Auth + deployment will be added as a dedicated phase after all features work locally.

### Visual Identity & Theming
- **Light theme only** — no dark mode toggle
- **Light sidebar** — white/light grey background with subtle border separator (NOT dark navy). Clean, airy, like Notion or Linear.
- Dark navy (#0F2D52) reserved for sign-in page background and branding accents only
- Content area: white (#FFFFFF) or light grey (#F8FAFC) background
- Cards: white with subtle border
- Primary accent color: **Blue (#3B82F6)** — for buttons, active states, links
- Typography: Claude's discretion (Inter, Geist, or system fonts — pick what works best for a productivity app)
- Status badge colors: **Softer/lighter palette** than the PRD's saturated Tailwind colors. Adapt to work well on light backgrounds — use pastel/muted variants with readable text. Keep the same 12 statuses and semantic color mapping (green family for positive, red family for negative, etc.)
- Tier badge colors: follow PRD approach but softened to match

### Database Schema
- Follow PRD schema structure but adapt from Prisma to **Drizzle ORM**
- Use **local PostgreSQL** (or SQLite for simplicity) — no Supabase connection in Phase 1
- Core tables in Phase 1: roles, candidates, candidate_events (immutable status log), candidate_comments, extraction_drafts, import_batches — per roadmap success criteria
- **RLS deferred** — will be added when connecting to Supabase for deployment
- Default roles seeded on first run: Video Editor, Writer/Scriptwriter, Designer, AI/Tech

### Claude's Discretion
- Sidebar fixed vs collapsible behavior on desktop
- User avatar dropdown contents (profile + sign out minimum)
- Dashboard: include empty hired/rejected table + activity feed sections, or just stats + role cards
- Role reordering mechanism (drag or manual sort number)
- Font choice
- Exact softer status badge color palette

</decisions>

<specifics>
## Specific Ideas

- Sidebar layout explicitly chosen as "grouped with section header" — Dashboard + Master View at top, "ROLES" header, role list, Settings at bottom
- The PRD at `~/Downloads/HIREFLOW_COMPLETE_PLAN.md` has detailed wireframes for every screen, full Prisma schema, API endpoint specs, component library, and business rules — use as implementation reference but adapt for our stack (Drizzle/Supabase/Next.js 16 instead of Prisma/Next.js 14)
- The PRD's responsive rules (Section 21) should be followed: mobile hidden sidebar as overlay, tablet icon-only sidebar, desktop full sidebar
- Status badge grouping from PRD Section 8 (Review, Decision, Assignment, Final) should inform the status dropdown design even though status changes aren't in Phase 1

</specifics>

<deferred>
## Deferred Ideas

- **Authentication (Clerk) + RLS + sign-in pages** — add as dedicated phase after all features work locally
- **Deployment / shipping** — after auth is wired up
- Import feature buttons on role cards — add when Phase 3 (Import Pipeline) lands
- Team member view in Settings — add when collaboration features are built (Phase 5)
- Dark mode toggle — could be added as a future enhancement
- Candidate count badges on sidebar roles — reconsider when candidates exist
- Branded landing page at `/` — add when auth exists

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-13*
