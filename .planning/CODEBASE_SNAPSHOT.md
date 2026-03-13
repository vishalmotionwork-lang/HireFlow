# Codebase Snapshot — Read This Before Executing

> Captured 2026-03-13. Saves re-reading 20+ files in the next session.

## Current DB Schema (`src/db/schema.ts`)

### Enums
```
candidateStatusEnum: left_to_review, under_review, shortlisted, not_good, maybe, assignment_pending, assignment_sent, assignment_followup, assignment_passed, assignment_failed, hired, rejected
tierEnum: untiered, junior, senior, both
```

### Tables (6)
**roles**: id(uuid PK), name(text), slug(text unique), icon(text default "Briefcase"), description(text?), sortOrder(int default 0), isActive(bool default true), createdAt, updatedAt

**importBatches**: id(uuid PK), roleId(FK→roles), source(text), totalRows(int), importedCount(int), skippedCount(int), createdBy(text), createdAt

**candidates**: id(uuid PK), roleId(FK→roles), name(text), email(text?), phone(text?), instagram(text?), portfolioUrl(text?), status(enum default left_to_review), tier(enum default untiered), isDuplicate(bool default false), importBatchId(FK→importBatches?), createdBy(text default "mock-user"), createdAt, updatedAt

**candidateEvents**: id(uuid PK), candidateId(FK→candidates), eventType(text), fromValue(text?), toValue(text), createdBy(text), createdAt — INSERT ONLY

**candidateComments**: id(uuid PK), candidateId(FK→candidates), body(text), createdBy(text), createdAt, editedAt(timestamp?)

**extractionDrafts**: id(uuid PK), importBatchId(FK→importBatches?), sourceUrl(text?), rawData(text?), extractedData(text?), status(text default "pending"), createdAt

## Server Actions (`src/lib/actions/candidates.ts`)
- `createCandidate(formData)` — validates with Zod, inserts candidate + "created" event
- `changeStatus(candidateId, fromStatus, toStatus)` — transaction: update + insert event
- `changeTier(candidateId, fromTier, toTier)` — transaction: update + insert event
- `updateCandidateField(candidateId, field, value)` — whitelist: name, email, phone, instagram, portfolioUrl
- `fetchCandidateProfile(candidateId)` — wrapper for getCandidateWithEvents

All use `MOCK_USER.name` for createdBy. All call `revalidatePath("/", "layout")`.

## Queries (`src/lib/queries/candidates.ts`)
- `getCandidates({roleId?, page, status[], tier, sort, q, dateRange, duplicatesOnly})` — shared conditions for count+data, 50/page
- `getCandidateWithEvents(candidateId)` — candidate + events ordered by createdAt desc

## Pages (6)
- `/` → redirect to `/dashboard`
- `/dashboard` → stats bar (hardcoded 0s), role cards grid
- `/roles/[roleSlug]` → role header, tab strip, filter bar, candidate table, pagination
- `/master` → same as role page but cross-role, adds Role column
- `/settings` → role CRUD (list, add, edit, deactivate)

## Components (key ones)
- `AppShell` — server component, loads roles, wraps SidebarProvider
- `AppSidebar` — sidebar nav with role links
- `Topbar` — logo, global search (debounced → /master?q=...), avatar
- `CandidateTable` — table + add row + drawer. Props: candidates, total, roleId, page/pages, showRoleColumn?, rolesMap?
- `CandidateRow` — single row, onClick opens drawer. Shows: name, email, portfolio, phone, instagram, status, tier, date
- `CandidateAddRow` — inline form, uses useActionState + createCandidate
- `CandidateDrawer` — Sheet component, loads profile via fetchCandidateProfile. Shows: header (name edit, status, tier), contact block (email/phone/instagram/portfolio with copy+edit), comments placeholder, status history, metadata footer
- `CandidateFilterBar` — URL-based filters: status multi-select, tier pills, date dropdown, sort, duplicates toggle, search input
- `CandidatePagination` — page selector
- `StatusBadge` — clickable dropdown, changes status directly (no confirmation)
- `TierBadge` — click cycles through tiers
- `StatusHistory` — vertical timeline from events
- `EditField` — inline editable text, saves on blur/Enter

## Layout Structure
```
RootLayout (server) → loads roles → AppShell
  AppShell → SidebarProvider → Sidebar + SidebarInset(Topbar + main)
```

## Key Patterns
- Next.js 16: `params` and `searchParams` must be `await`ed in server components
- shadcn/ui v4: @base-ui/react, NOT Radix. No `asChild` prop.
- Filter state lives in URL search params, not React state
- Drizzle ORM: use `eq()`, `and()`, `or()`, `ilike()`, `inArray()` from drizzle-orm
- Server actions use FormData (not JSON)
- MOCK_USER = { name: "Vishal", avatar: null }
- All Lucide icons rendered via DynamicIcon component (React.lazy)

## Import Paths
```
@/db → src/db/index.ts (Drizzle client singleton)
@/db/schema → src/db/schema.ts
@/types → src/types/index.ts
@/lib/constants → src/lib/constants.ts
@/lib/actions/candidates → src/lib/actions/candidates.ts
@/lib/queries/candidates → src/lib/queries/candidates.ts
@/components/ui/* → shadcn components
@/components/candidates/* → candidate-specific components
@/components/layout/* → app-shell, app-sidebar, topbar, dynamic-icon
@/hooks/* → use-debounce, use-mobile
```

## Constants
```typescript
STATUS_LABELS: Record<CandidateStatus, string> — display text for each status
STATUS_COLORS: Record<CandidateStatus, string> — Tailwind classes (bg + text)
TIER_LABELS: Record<Tier, string> — display text
TIER_COLORS: Record<Tier, string> — Tailwind classes
LUCIDE_ROLE_ICONS: 20 icon names for role picker
MOCK_USER: { name: "Vishal", avatar: null }
```

## DB Connection
```
DATABASE_URL=postgresql://hireflow:hireflow_dev@localhost:5432/hireflow
```
PostgreSQL 16 via Homebrew. `npm run db:push` to apply schema changes.
