# Phase 2: Candidate Core - Research

**Researched:** 2026-03-13
**Domain:** Next.js 16 App Router — candidate list, profile drawer, pipeline status log, tier assignment, search/filter
**Confidence:** HIGH

## Summary

Phase 2 builds the full daily-use candidate workflow on top of Phase 1's foundation. The database schema is already complete (candidates, candidateEvents, candidateComments, tiers, statuses all defined). The role page shell exists at `/roles/[roleSlug]/page.tsx` and shows an empty state. The entire phase is a UI/data wiring job — no schema changes needed.

The main architectural challenge is the interaction model: the candidate list is a Client Component (needs `useState` for drawer, filters, search), but data fetching should be Server Component–first where possible. The recommended pattern is a hybrid: the page remains a Server Component that fetches candidates server-side, passes them as props to a `<CandidateListClient>` that handles all interactive state locally. Mutations (status change, tier change, field edits) use Next.js Server Actions with `revalidatePath` — the same pattern already proven in Phase 1's role actions.

The filter/search state should live entirely in URL search params (not `useState`) so filters are deep-linkable and survive page refresh. The drawer open state is the only piece of UI state that should live in `useState`. For the inline add-candidate row, controlled form state is appropriate.

**Primary recommendation:** Server Component page → Client Component list shell → Server Actions for mutations. URL search params for filter state. `useOptimistic` for instant tier/status badge updates before server roundtrip completes.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Table rows layout (spreadsheet-like) — 8 columns: Name, Email, Portfolio Link, Phone/WhatsApp, Instagram, Status (badge), Tier (badge), Date Added
- "Add Candidate" button opens inline form row — no modal, no context switch
- Default sort: newest first
- Side drawer slides in from the right (~400-500px) — table stays visible, dimmed behind it
- Click-to-edit fields: each field becomes an input on click, saves on blur or Enter — no global edit button
- Status history: vertical timeline, newest at top, each entry shows status change + who + when
- Mobile: bottom sheet (slides up from bottom, draggable to full height)
- Status badge in table row is clickable — opens dropdown with all 12 statuses, no confirmation dialog
- No bulk actions in Phase 2
- Tier badge cycles on click (Untiered → Junior → Senior → Both)
- Horizontal filter bar above table: Status (multi-select with checkboxes), Tier (pill buttons), Date Added
- Instant search (debounced 300ms) on name + email
- Active filter count badge on each dropdown + "Clear all" / "Reset" button when any filter is active
- Shows "Showing X of Y candidates" count

### Claude's Discretion
- Exact drawer width and animation
- Table pagination vs infinite scroll (for large candidate lists)
- Loading states and skeleton patterns
- Empty state illustrations and copy
- Exact filter dropdown component implementation
- Mobile table layout (horizontal scroll vs stacked cards)

### Deferred Ideas (OUT OF SCOPE)
- Bulk status changes (select multiple, change at once) — future phase
- Import source filter — after Phase 3 (Import Pipeline) is built
- Keyboard shortcuts for status changes — future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROLE-03 | Each role has its own dedicated candidate list view at /roles/[slug] | Role page shell exists — needs candidate table wired in |
| ROLE-04 | Role switcher tab strip at top of list view | Tab strip already rendered in role page — no changes needed |
| CAND-01 | User can manually add a candidate with all fields and role assignment | Inline form row pattern; Server Action with Zod validation |
| CAND-02 | Candidate list: name, contact snippet, portfolio link, status badge, tier badge, date added, last updated | Table row Client Component; columns mapped to schema fields |
| CAND-03 | Clicking candidate row opens profile as right drawer (desktop) or full screen (mobile) | `Sheet` component already installed (base-ui Dialog); `side="right"` for drawer, `side="bottom"` for mobile |
| CAND-04 | Profile: editable header, contact block, portfolio chips, status history timeline, comment thread, metadata | `CandidateDrawer` compound component; click-to-edit fields pattern |
| CAND-05 | User can edit any candidate field inline from profile view | Click-to-edit pattern: `onFocus` switches to `<input>`, `onBlur`/`Enter` fires Server Action |
| CAND-06 | Master View at /master shows all candidates with Role column and Role filter | `/master/page.tsx` exists as empty shell; same list component, different query |
| PIPE-01 | 12-stage pipeline statuses defined | Already in schema as `candidateStatusEnum`; labels/colors in `constants.ts` |
| PIPE-02 | Status change logged immediately with who, from, to, when | Server Action: UPDATE candidates + INSERT candidateEvents in same call |
| PIPE-03 | Status history as insert-only event log | `candidateEvents` table is INSERT ONLY — schema already enforces this |
| PIPE-04 | Activity feed shows last 10 status changes with 30s refresh | Dashboard only — this is Phase 5 scope per REQUIREMENTS.md |
| PIPE-05 | Clicking activity item opens candidate profile | Dashboard only — Phase 5 |
| PIPE-06 | Bulk status change | Explicitly deferred from Phase 2 per CONTEXT.md |
| TIER-01 | All candidates start as Untiered | Schema default: `tierEnum("tier").default("untiered")` — already in schema |
| TIER-02 | Reviewer assigns tier from candidate profile | Click tier badge → cycle through values → Server Action |
| TIER-03 | Tier filter pills on every role list | Pill UI in filter bar; filters against `tier` column |
| TIER-04 | Tier is changeable at any time | No lock logic needed — just allow updates |
| TIER-05 | Tier changes logged in activity/audit trail | INSERT into `candidateEvents` with `eventType: "tier_change"` |
| SRCH-01 | In-role search by name, email, WhatsApp (300ms debounce) | Client-side debounce against server-fetched data OR URL param + server re-fetch |
| SRCH-02 | Global search in topbar | Topbar already exists; add search route or modal |
| SRCH-03 | Filter by status (multi-select dropdown) | `DropdownMenuCheckboxItem` already in UI kit |
| SRCH-04 | Filter by tier (pill buttons) | Simple pill toggle; state in URL search params |
| SRCH-05 | Filter by date added (Today/This Week/This Month/Custom) | Date range filter; Drizzle `gte`/`lte` on `createdAt` |
| SRCH-06 | Filter by import source | Deferred per CONTEXT.md — after Phase 3 |
| SRCH-07 | Show duplicates only toggle | Drizzle filter on `isDuplicate = true` |
| SRCH-08 | Sort by: Last Updated (default), Date Added, Name A-Z, Status grouped | Drizzle `orderBy` param; controlled by URL param |
| SRCH-09 | Active filter count badge + reset all | Badge count from active params; reset = navigate to base URL |
| SRCH-10 | Pagination — 50 per page with page selector and total count | Drizzle `.limit(50).offset((page-1)*50)` + count query |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router pages, Server Actions | Already in use |
| Drizzle ORM | 0.45.1 | DB queries, filters, joins | Already in use |
| @base-ui/react | 1.3.0 | Sheet (drawer), DropdownMenu, Dialog | Already installed — this project's UI primitive layer |
| shadcn/ui (built on @base-ui) | 4.0.5 | Badge, Button, Input, Skeleton | Already installed |
| Tailwind CSS | 4 | Styling | Already in use |
| Zod | 4.3.6 | Validation in Server Actions | Already in use |
| sonner | 2.0.7 | Toast notifications for mutations | Already installed |
| lucide-react | 0.577.0 | Icons | Already in use |

### No New Dependencies Required
Phase 2 is fully achievable with the existing stack. Do NOT add:
- A state management library (Zustand, Jotai) — URL params + Server Actions are sufficient
- A form library (React Hook Form) — controlled state + Zod + Server Actions matches Phase 1 pattern
- A date picker library — native `<input type="date">` or simple custom component handles the date filter

### One Optional Consideration
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-debounce` | ~4.0 | `useDebounce` hook if project prefers not hand-rolling | Only if the hand-rolled `useDebounce` in `frontend-patterns` SKILL.md feels insufficient |

The project's `frontend-patterns` skill already documents a working `useDebounce` implementation — use that instead of installing a package.

---

## Architecture Patterns

### Recommended File Structure for Phase 2
```
src/
├── app/
│   ├── roles/[roleSlug]/
│   │   └── page.tsx              # Server Component — fetches role + candidates + roles list
│   └── master/
│       └── page.tsx              # Server Component — fetches all candidates with role join
├── components/
│   └── candidates/
│       ├── candidate-table.tsx       # Client Component — table shell, filter/search state
│       ├── candidate-row.tsx         # Row with clickable status/tier badges
│       ├── candidate-drawer.tsx      # Profile drawer (Sheet component, right side)
│       ├── candidate-add-row.tsx     # Inline add form row
│       ├── candidate-filter-bar.tsx  # Horizontal filter bar
│       ├── status-badge.tsx          # Clickable status badge with dropdown
│       ├── tier-badge.tsx            # Clickable tier badge with cycle-on-click
│       ├── status-history.tsx        # Vertical timeline of candidateEvents
│       └── edit-field.tsx            # Click-to-edit field primitive
└── lib/
    └── actions/
        └── candidates.ts            # Server Actions: createCandidate, updateCandidateField,
                                     #   changeStatus, changeTier
```

### Pattern 1: Server Component Page → Client List Shell

The page fetches initial data server-side. The Client Component receives candidates as props and manages all interactive state (drawer open, filter params, search string).

```typescript
// src/app/roles/[roleSlug]/page.tsx (Server Component)
export default async function RolePage({ params, searchParams }) {
  const { roleSlug } = await params
  const sp = await searchParams

  const [role] = await db.select().from(roles).where(eq(roles.slug, roleSlug)).limit(1)
  if (!role) notFound()

  const allRoles = await db.select().from(roles).where(eq(roles.isActive, true)).orderBy(roles.sortOrder)

  // Build filters from searchParams
  const page = Number(sp.page ?? 1)
  const status = sp.status ? (sp.status as string).split(',') : []
  const tier = sp.tier ?? null
  const sort = (sp.sort as string) ?? 'newest'
  const q = (sp.q as string) ?? ''

  const { candidates: data, total } = await getCandidates({ roleId: role.id, page, status, tier, sort, q })

  return (
    <CandidateTable
      role={role}
      allRoles={allRoles}
      initialCandidates={data}
      total={total}
      currentPage={page}
    />
  )
}
```

**Why:** Server Components handle DB access; Client Components handle interactivity. This matches Next.js App Router best practices and the pattern Phase 1 established.

### Pattern 2: URL Search Params as Filter State (CRITICAL)

Filters must live in URL search params, not `useState`. This makes filters deep-linkable, bookmarkable, and shareable. The router push happens on filter change, which triggers a server re-fetch.

```typescript
// Inside CandidateTable (Client Component)
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function CandidateTable({ ... }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // ...
}
```

**Anti-pattern to avoid:** Do NOT filter the initial candidate list client-side (filtering `initialCandidates` in useState). With URL params as source of truth, the server always returns the correctly filtered page.

### Pattern 3: Server Actions for Mutations (matches Phase 1)

```typescript
// src/lib/actions/candidates.ts
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { candidates, candidateEvents } from '@/db/schema'
import { MOCK_USER } from '@/lib/constants'

export async function changeStatus(
  candidateId: string,
  fromStatus: CandidateStatus,
  toStatus: CandidateStatus
): Promise<ActionResult> {
  await db.transaction(async (tx) => {
    await tx.update(candidates)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId))

    // INSERT ONLY — event log
    await tx.insert(candidateEvents).values({
      candidateId,
      eventType: 'status_change',
      fromValue: fromStatus,
      toValue: toStatus,
      createdBy: MOCK_USER.name,
    })
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
```

**Key:** Status change and event log INSERT must happen in a single transaction. Drizzle supports `.transaction()` — use it here.

### Pattern 4: Click-to-Edit Field

```typescript
// src/components/candidates/edit-field.tsx
'use client'
import { useState, useRef } from 'react'

interface EditFieldProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
}

export function EditField({ value, onSave, placeholder }: EditFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setEditing(false)
    if (draft !== value) {
      await onSave(draft)
    }
  }

  if (!editing) {
    return (
      <span
        className="cursor-text hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0) }}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
      className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
    />
  )
}
```

### Pattern 5: Status Badge with Dropdown (using existing DropdownMenu)

The `DropdownMenu` component already exists in `src/components/ui/dropdown-menu.tsx`, using `@base-ui/react/menu`. The status badge in the table row wraps the badge in a `DropdownMenuTrigger`.

```typescript
// src/components/candidates/status-badge.tsx
'use client'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import { changeStatus } from '@/lib/actions/candidates'
import type { CandidateStatus } from '@/types'
import { CANDIDATE_STATUSES } from '@/types'

export function StatusBadge({ candidateId, status }: { candidateId: string; status: CandidateStatus }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {CANDIDATE_STATUSES.map(s => (
          <DropdownMenuItem key={s} onSelect={() => changeStatus(candidateId, status, s)}>
            <span className={`mr-2 h-2 w-2 rounded-full inline-block ${STATUS_COLORS[s].split(' ')[0]}`} />
            {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Pattern 6: Tier Badge with Cycle-on-Click

```typescript
// src/components/candidates/tier-badge.tsx
'use client'
import { useTransition } from 'react'
import { changeTier } from '@/lib/actions/candidates'
import { TIER_LABELS, TIER_COLORS } from '@/lib/constants'
import type { Tier } from '@/types'

const TIER_CYCLE: Tier[] = ['untiered', 'junior', 'senior', 'both']

export function TierBadge({ candidateId, tier }: { candidateId: string; tier: Tier }) {
  const [isPending, startTransition] = useTransition()
  const nextTier = TIER_CYCLE[(TIER_CYCLE.indexOf(tier) + 1) % TIER_CYCLE.length]

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => changeTier(candidateId, tier, nextTier))}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer ${TIER_COLORS[tier]} ${isPending ? 'opacity-50' : ''}`}
      title={`Click to change: ${TIER_LABELS[nextTier]}`}
    >
      {TIER_LABELS[tier]}
    </button>
  )
}
```

### Pattern 7: Profile Drawer (Sheet component — already installed)

The `Sheet` component at `src/components/ui/sheet.tsx` wraps `@base-ui/react/dialog` and supports `side="right"` for the drawer and `side="bottom"` for the mobile bottom sheet.

```typescript
// src/components/candidates/candidate-drawer.tsx
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Candidate } from '@/types'

interface CandidateDrawerProps {
  candidate: Candidate | null
  onClose: () => void
}

export function CandidateDrawer({ candidate, onClose }: CandidateDrawerProps) {
  const isMobile = useIsMobile() // existing hook at src/hooks/use-mobile.ts

  return (
    <Sheet open={!!candidate} onOpenChange={open => !open && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="w-full sm:max-w-[480px] overflow-y-auto"
        showCloseButton
      >
        {candidate && (
          <>
            <SheetHeader>
              <SheetTitle>{candidate.name}</SheetTitle>
            </SheetHeader>
            {/* Editable fields, contact block, status history */}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

**Note on Sheet width:** The default `sm:max-w-sm` in `SheetContent` is ~384px. Override with `className="sm:max-w-[480px]"` for the 400-500px target width.

### Anti-Patterns to Avoid

- **Client-side filtering of server data:** Don't filter `initialCandidates` in useState. Use URL params → server re-fetch instead. Client-side filtering breaks pagination and total count display.
- **Calling Server Actions directly from event handlers without `useTransition`:** Wrap Server Action calls in `startTransition` so React can show pending state and avoid blocking the UI.
- **Opening a Sheet via a trigger inside a table row:** The Sheet `open` state should be controlled by the parent (CandidateTable) via `selectedCandidate` state. Don't use `SheetTrigger` on the row — use `onClick` on the row to `setSelectedCandidate(candidate)`.
- **Using `router.refresh()` instead of `revalidatePath`:** Server Actions already call `revalidatePath`; calling `router.refresh()` from the client is redundant and can cause double-fetches.
- **Drizzle transactions for single operations:** Only use `.transaction()` when two writes must be atomic (e.g., status change + event log). Simple field updates don't need a transaction.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drawer / slide-over panel | Custom CSS slide | `Sheet` from `@/components/ui/sheet` | Already installed, handles focus trap, backdrop, animation, a11y |
| Status dropdown | Custom dropdown | `DropdownMenu` from `@/components/ui/dropdown-menu` | Already installed, uses @base-ui Menu which handles keyboard nav, a11y |
| Status/tier color mapping | Compute colors in component | `STATUS_COLORS`, `TIER_COLORS` from `@/lib/constants` | Already defined for all 12 statuses and 4 tiers |
| Status display labels | String manipulation | `STATUS_LABELS`, `TIER_LABELS` from `@/lib/constants` | Already defined |
| Debounce | `setTimeout` + useRef | `useDebounce` hook (see frontend-patterns skill) | Skill documents this exactly; use it as-is |
| Toast notifications | Custom toast | `sonner` (already installed) | Already wired in `app/layout.tsx` presumably |
| Skeleton loading | Custom skeleton | `Skeleton` from `@/components/ui/skeleton` | Already installed |
| Mobile detection | `window.innerWidth` check | `useIsMobile` from `@/hooks/use-mobile.ts` | Already exists in project |

**Key insight:** Almost every primitive needed for Phase 2 is already installed. The phase is about composition and wiring, not new library introduction.

---

## Common Pitfalls

### Pitfall 1: @base-ui `render` prop instead of `asChild`
**What goes wrong:** Using Radix UI's `asChild` prop pattern on @base-ui components causes a runtime error or the prop is silently ignored.
**Why it happens:** This project uses shadcn v4 with @base-ui/react, which replaces Radix UI. @base-ui uses `render={<Component />}` instead of `asChild`.
**How to avoid:** When you need to render a base-ui primitive as a different element or custom component, use `render={<MyButton />}` — never `asChild`.
**Warning signs:** If you see `asChild` in any candidate component code, it's wrong for this codebase.

### Pitfall 2: Sheet `open` state conflict with row onClick
**What goes wrong:** If a `SheetTrigger` is placed inside a table row that also has an `onClick`, clicking the badge or tier inside the row fires both the row click (opens drawer) and the badge click (changes status). Events bubble unexpectedly.
**Why it happens:** Row-level `onClick` captures all clicks including those on child interactive elements.
**How to avoid:** Use `e.stopPropagation()` on the status badge and tier badge click handlers. Alternatively, only open the drawer when the non-interactive parts of the row are clicked (name cell, date cell).
**Warning signs:** Clicking a status badge simultaneously opens the drawer AND changes the status.

### Pitfall 3: Drizzle filter with undefined vs null
**What goes wrong:** Passing `undefined` to a Drizzle `where` clause condition causes unexpected query behavior (may return no results or ignore the condition).
**Why it happens:** Drizzle's `eq(field, undefined)` doesn't short-circuit — it produces an invalid SQL predicate.
**How to avoid:** Always guard filter conditions: `...(status.length > 0 ? [inArray(candidates.status, status)] : [])`. Use Drizzle's `and()` with conditional array spreading.

```typescript
// CORRECT pattern
import { and, eq, inArray, ilike, gte, lte } from 'drizzle-orm'

const conditions = [eq(candidates.roleId, roleId)]
if (statusFilter.length > 0) conditions.push(inArray(candidates.status, statusFilter))
if (tierFilter) conditions.push(eq(candidates.tier, tierFilter))
if (search) conditions.push(
  or(ilike(candidates.name, `%${search}%`), ilike(candidates.email, `%${search}%`))
)

const results = await db.select().from(candidates).where(and(...conditions))
```

### Pitfall 4: `searchParams` is async in Next.js 16 App Router
**What goes wrong:** Accessing `searchParams.status` directly (synchronously) in a Server Component page causes a type error or undefined value.
**Why it happens:** Next.js 16 made `searchParams` a Promise (same as `params`). This pattern already appears in the Phase 1 role page: `const { roleSlug } = await params`.
**How to avoid:** Always `await searchParams` in the page component before reading any value.

```typescript
export default async function RolePage({ params, searchParams }: {
  params: Promise<{ roleSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { roleSlug } = await params
  const sp = await searchParams
  const page = Number(sp.page ?? 1)
  // ...
}
```

### Pitfall 5: Status change without event log — audit trail break
**What goes wrong:** Updating `candidates.status` without also inserting a `candidateEvents` row means the status history timeline in the drawer is empty or incorrect.
**Why it happens:** The two writes are easy to accidentally decouple during implementation.
**How to avoid:** Always do both writes inside a single `db.transaction()` call in the `changeStatus` Server Action. Write a single action that does both — never let components call them separately.

### Pitfall 6: Pagination total count mismatch
**What goes wrong:** The "Showing X of Y" count is wrong because the count query doesn't include the same filters as the data query.
**Why it happens:** Easy to write the count query without applying filters when they're added later.
**How to avoid:** Extract the `where` conditions into a shared array and apply to both the data query and count query.

```typescript
const conditions = buildConditions(filters) // shared function
const [{ total }] = await db.select({ total: count() }).from(candidates).where(and(...conditions))
const data = await db.select().from(candidates).where(and(...conditions)).limit(50).offset(offset)
```

---

## Code Examples

### Drizzle: getCandidates with filters + pagination

```typescript
// src/lib/queries/candidates.ts
import { db } from '@/db'
import { candidates } from '@/db/schema'
import { and, eq, inArray, ilike, or, count, desc, asc, gte } from 'drizzle-orm'
import type { CandidateStatus, Tier } from '@/types'

interface GetCandidatesParams {
  roleId: string
  page?: number
  status?: CandidateStatus[]
  tier?: Tier | null
  sort?: 'newest' | 'oldest' | 'name_asc' | 'updated'
  q?: string
  dateRange?: { from: Date; to: Date } | null
}

export async function getCandidates({
  roleId, page = 1, status = [], tier, sort = 'newest', q = '', dateRange
}: GetCandidatesParams) {
  const limit = 50
  const offset = (page - 1) * limit

  const conditions = [eq(candidates.roleId, roleId)]
  if (status.length > 0) conditions.push(inArray(candidates.status, status))
  if (tier) conditions.push(eq(candidates.tier, tier))
  if (q.trim()) {
    conditions.push(or(
      ilike(candidates.name, `%${q.trim()}%`),
      ilike(candidates.email, `%${q.trim()}%`),
    )!)
  }
  if (dateRange) {
    conditions.push(gte(candidates.createdAt, dateRange.from))
    conditions.push(lte(candidates.createdAt, dateRange.to))
  }

  const orderByClause = sort === 'oldest' ? asc(candidates.createdAt)
    : sort === 'name_asc' ? asc(candidates.name)
    : sort === 'updated' ? desc(candidates.updatedAt)
    : desc(candidates.createdAt) // newest (default)

  const [{ total }] = await db
    .select({ total: count() })
    .from(candidates)
    .where(and(...conditions))

  const data = await db
    .select()
    .from(candidates)
    .where(and(...conditions))
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  return { candidates: data, total }
}
```

### Server Action: Create Candidate

```typescript
// src/lib/actions/candidates.ts
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { candidates, candidateEvents } from '@/db/schema'
import { z } from 'zod'
import { MOCK_USER } from '@/lib/constants'

const candidateCreateSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200).trim(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  instagram: z.string().max(100).optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
})

export async function createCandidate(formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData)
  const parsed = candidateCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [newCandidate] = await db.insert(candidates).values({
    ...parsed.data,
    createdBy: MOCK_USER.name,
  }).returning({ id: candidates.id })

  // Log the initial status as a creation event
  await db.insert(candidateEvents).values({
    candidateId: newCandidate.id,
    eventType: 'created',
    fromValue: null,
    toValue: 'left_to_review',
    createdBy: MOCK_USER.name,
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
```

### useDebounce Hook (from skills — do not install a package)

```typescript
// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix UI `asChild` | @base-ui `render={<Component />}` | shadcn v4 (2024) | ALL component wrappers must use `render` pattern — no `asChild` anywhere |
| `searchParams` as sync object | `searchParams` as `Promise<{}>` | Next.js 15+ (App Router) | Must `await searchParams` in every Server Component page |
| `getServerSideProps` | Server Component + Server Actions | Next.js 13+ App Router | No API route needed for mutations — Server Actions handle it |
| `useState` for filters | URL search params + `useRouter` | App Router best practice | Filters are deep-linkable; refresh preserves state |
| Prisma | Drizzle ORM | Project decision Phase 1 | 90% smaller bundle; type-safe without code-gen step |

---

## Open Questions

1. **Inline add row vs modal for "Add Candidate"**
   - What we know: CONTEXT.md locks this to "inline form row" — no modal
   - What's unclear: When the inline row is open and the user clicks a candidate row, should the inline form auto-dismiss?
   - Recommendation: Yes — opening a candidate drawer should auto-dismiss the inline form (reset to initial state). Implement with a `setAddRowOpen(false)` call in the row click handler.

2. **Master View candidate join with role data**
   - What we know: CAND-06 requires a "Role" column in the master table
   - What's unclear: Whether to join candidates with roles in the query or pass roles as a lookup map
   - Recommendation: Use Drizzle's relational query or a left join to fetch `roleName` alongside each candidate. Avoid N+1.

3. **PIPE-04 and PIPE-05 scope clarification**
   - What we know: REQUIREMENTS.md maps PIPE-04 and PIPE-05 to Phase 2, but they describe dashboard activity feed
   - What's unclear: The dashboard page is Phase 5 per REQUIREMENTS.md traceability table
   - Recommendation: Planner should scope PIPE-04/05 out of Phase 2 plans — the status history on the candidate drawer (PIPE-03) is the Phase 2 deliverable. Dashboard feed is Phase 5.

---

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase — `src/db/schema.ts`, `src/lib/actions/roles.ts`, `src/components/ui/sheet.tsx`, `src/components/ui/dropdown-menu.tsx` — all verified by direct file read
- `src/lib/constants.ts` — STATUS_LABELS, STATUS_COLORS, TIER_LABELS, TIER_COLORS all confirmed present
- `src/types/index.ts` — Candidate, CandidateEvent types and CANDIDATE_STATUSES array confirmed
- `package.json` — all dependency versions confirmed

### Secondary (MEDIUM confidence)
- Next.js App Router docs pattern for async `searchParams` — confirmed by Phase 1 existing pattern (`await params`) and Next.js 16 behavior
- Drizzle ORM `and()` / `inArray()` / `ilike()` / `count()` — confirmed used in Phase 1 codebase (count() in roles.ts)
- @base-ui `render` prop pattern — confirmed in Phase 1 gotcha note in STATE.md: "shadcn v4 uses @base-ui/react — no asChild, use render={<Component />}"

### Tertiary (LOW confidence — not required)
- None — all findings are codebase-verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json
- Architecture: HIGH — patterns derived from Phase 1 codebase patterns and Next.js App Router conventions
- Pitfalls: HIGH — sourced from STATE.md accumulated context and existing code patterns
- Drizzle query patterns: HIGH — confirmed operators used in existing codebase

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable libraries, no external dependencies to go stale)
