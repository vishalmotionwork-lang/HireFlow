# Phase 5: Collaboration and Dashboard - Research

**Researched:** 2026-03-13
**Domain:** Next.js server actions, Drizzle ORM queries, React polling patterns, @mention UI, dashboard stats
**Confidence:** HIGH

## Summary

Phase 5 is the final feature-complete phase before responsive polish. It has three domains: rejection flow enforcement, team comments with @mentions, and dashboard completeness. The critical finding is that substantial scaffolding already exists in the codebase — `RejectionModal`, `BulkActionBar`, `CommentThread`, `ActivityFeed`, and all three stats query functions are built. What is missing is the *wiring and integration* of these components into the live flows, plus specific features: rejection modal interception on status change, @mention parsing/rendering in comments, clickable stats + auto-refresh on the dashboard, a hired vs rejected summary table (DASH-05), and the import source filter (SRCH-06).

This phase is more integration and augmentation than greenfield work. The DB schema supports everything needed — no migrations required. The plan should be structured around: (1) wiring the rejection gate into the status change path, (2) adding @mention support to comments, (3) completing the dashboard with missing sections and interactivity. Bulk status change (PIPE-06) is already built in BulkActionBar and needs only to be verified as wired into the table.

**Primary recommendation:** Treat this as a wiring-and-completion phase. Reuse existing components. Focus effort on the dashboard's two missing sections (clickable stats, hired/rejected table) and the 30s auto-refresh pattern. @mention support is the only meaningful new UI build.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REJC-01 | When status set to Rejected, rejection reason modal appears before save | RejectionModal component exists; needs interception in StatusBadge/changeStatus flow |
| REJC-02 | Quick-select chips for common reasons | RejectionModal already has REJECTION_REASONS chips from constants.ts |
| REJC-03 | Custom reason text field | Already in RejectionModal ("Other" chip + text input) |
| REJC-04 | Message compose box, logged reason shown above for reference | Already in RejectionModal as textarea |
| REJC-05 | Save Only or Save & Copy Message options | Already in RejectionModal (handleConfirm vs handleCopyAndConfirm) |
| COLB-01 | Any team member can leave a comment on any candidate profile | CommentThread exists and is wired in CandidateDrawer |
| COLB-02 | Comments timestamped with commenter name and avatar | CommentItem renders createdBy + relative time; avatar is initial fallback |
| COLB-03 | @mention support — reference other team members in comments | NOT implemented — needs mention detection on @, user list fetch, highlight rendering |
| COLB-04 | Comments editable within 5 minutes of posting, not deletable | canEdit() function + editComment action already built |
| DASH-01 | Dashboard is default landing page after login | Already exists at /dashboard with redirect from / |
| DASH-02 | Global stats bar — clicking any stat filters Master View | Stats bar exists; links to /master with status filter param NOT yet added |
| DASH-03 | Role cards grid with tier breakdown and quick actions | Role cards exist; tier breakdown mini-bar + Add/Import quick actions NOT yet added |
| DASH-04 | "Create New Role" card at end of grid | Already implemented in dashboard/page.tsx |
| DASH-05 | Hired vs Rejected summary table per role | NOT built — query and component both missing |
| DASH-06 | Recent activity feed, auto-refresh 30s, clickable to candidate profile | ActivityFeed exists; auto-refresh and click-to-open drawer NOT yet wired |
| PIPE-04 | Activity feed shows last 10 status changes, 30s refresh | Same as DASH-06 — ActivityFeed exists, refresh missing |
| PIPE-05 | Clicking activity item opens candidate profile | NOT implemented — ActivityFeed items are not clickable |
| PIPE-06 | Bulk status change via checkboxes | BulkActionBar exists and is built; needs verification it is wired into CandidateTable |
| SRCH-06 | Filter by import source (Excel/CSV/Manual/Paste/URL/Form) | NOT implemented in filter bar UI or getCandidates query |
| CAND-04 | Comment thread on candidate profile (replace placeholder) | CommentThread IS wired in CandidateDrawer — already real, not a placeholder |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 App Router | 16.x | Server components, server actions, routing | Established project stack |
| Drizzle ORM | current | Type-safe DB queries, transactions | Established project stack |
| React 19 | 19.x | UI, `useTransition`, `startTransition` | Established project stack |
| Tailwind CSS | 4.x | Styling | Established project stack |
| @base-ui/react | current | Modals, dropdowns, sheets | shadcn v4 uses @base-ui NOT Radix — critical gotcha |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | current | Icons | All icon needs |
| zod v4 | 4.x | Validation | Server action input validation |

### No New Dependencies Required
All Phase 5 features are buildable with the existing stack. No new packages needed.

**Installation:**
```bash
# No new packages for Phase 5
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── dashboard/
│       └── page.tsx              # Extend with DASH-02, DASH-03, DASH-05
├── components/
│   ├── candidates/
│   │   ├── comment-thread.tsx    # Extend with @mention (COLB-03)
│   │   ├── rejection-modal.tsx   # Already built — wire in
│   │   ├── status-badge.tsx      # Wire rejection gate here
│   │   └── bulk-action-bar.tsx   # Verify wiring into table
│   └── dashboard/
│       ├── activity-feed.tsx     # Extend: clickable + auto-refresh
│       ├── role-card.tsx         # NEW — extract from dashboard/page.tsx
│       └── hired-rejected-table.tsx  # NEW — DASH-05
└── lib/
    ├── actions/
    │   └── candidates.ts         # changeStatus already accepts rejection param
    └── queries/
        ├── stats.ts              # Extend with hired/rejected per role + avg days
        └── candidates.ts         # Add importSource filter param
```

### Pattern 1: Rejection Gate on Status Change
**What:** Before `changeStatus("rejected")` is called, show `RejectionModal`. Only call `changeStatus` after user confirms reason.
**When to use:** Anywhere status can be set to "rejected" — StatusBadge dropdown AND BulkActionBar (already done in bulk).
**Example:**
```typescript
// In StatusBadge (client component)
const handleStatusChange = (newStatus: CandidateStatus) => {
  if (newStatus === "rejected") {
    setPendingStatus("rejected")  // store intent
    setShowRejectionModal(true)   // intercept
    return
  }
  // else proceed normally
  startTransition(() => changeStatus(candidateId, currentStatus, newStatus))
}

const handleRejectionConfirm = (reason: string, message: string) => {
  setShowRejectionModal(false)
  startTransition(() =>
    changeStatus(candidateId, currentStatus, "rejected", { reason, message })
  )
}
```

### Pattern 2: 30-Second Auto-Refresh (Dashboard Activity Feed)
**What:** Client component polls an API route or re-fetches via router.refresh() on an interval.
**When to use:** ActivityFeed and dashboard stats that need live updates.
**Example:**
```typescript
// In a 'use client' wrapper around ActivityFeed
useEffect(() => {
  const interval = setInterval(() => {
    router.refresh()  // triggers server component re-render
  }, 30_000)
  return () => clearInterval(interval)
}, [router])
```
**Why `router.refresh()`:** In Next.js App Router, `router.refresh()` re-runs server components without a full navigation. It's the idiomatic approach — no custom fetch or state needed on the client. Confirmed by Next.js 14+ docs.

### Pattern 3: Clickable Activity Items Opening Candidate Drawer
**What:** ActivityFeed items need to open the CandidateDrawer for that candidate.
**Problem:** ActivityFeed is currently a pure display component with no click handler. The drawer is controlled by `selectedCandidateId` state in the parent table component. The dashboard page has no drawer context.
**Solution:** The dashboard needs its own drawer state. ActivityFeed receives an `onCandidateClick` prop.
```typescript
// dashboard/page.tsx becomes a client component or has a client wrapper
// ActivityFeed prop:
interface ActivityFeedProps {
  activities: Activity[]
  onCandidateClick?: (candidateId: string) => void
}

// In dashboard client wrapper:
const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
<ActivityFeed activities={activities} onCandidateClick={setSelectedCandidateId} />
<CandidateDrawer candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} />
```

**Critical:** Dashboard page is currently a pure server component. To add state (drawer + interval), extract a `DashboardClient` wrapper that's `"use client"`, keeping the server component for data fetching.

### Pattern 4: @Mention in Comments (COLB-03)
**What:** When user types `@`, show a dropdown of team members. Insert `@Name` into comment body. Render `@Name` with highlight in display.
**Current state:** `createComment` already accepts `mentions: Array<{userId, name}>`. The schema stores mentions as JSONB. Only the UI parsing is missing.
**Simple approach for v1 (small team):** Hard-coded team member list from a constant or a lightweight `getTeamMembers()` query. No complex mention library needed.
```typescript
// Detect @ in input, show popover with team list
const handleInputChange = (val: string) => {
  setNewComment(val)
  const atIdx = val.lastIndexOf('@')
  if (atIdx !== -1 && atIdx === val.length - 1) {
    setShowMentionPopover(true)
  } else {
    setShowMentionPopover(false)
  }
}

// Parse mentions from body before sending
function extractMentions(body: string, teamMembers: TeamMember[]): Mention[] {
  return teamMembers
    .filter(m => body.includes(`@${m.name}`))
    .map(m => ({ userId: m.name, name: m.name }))
}
```
**Render:** Replace `@Name` tokens in comment body with `<span className="text-blue-600 font-medium">@Name</span>`.

### Pattern 5: Hired vs Rejected Summary Table (DASH-05)
**What:** Per-role counts of hired and rejected, hire rate %, Junior/Senior hire breakdown, avg days to hire.
**Query approach:** Single Drizzle query joining candidates to roles, grouping by roleId + status + tier.
```typescript
// In stats.ts
export async function getHiredRejectedSummary() {
  const rows = await db
    .select({
      roleId: candidates.roleId,
      roleName: roles.name,
      status: candidates.status,
      tier: candidates.tier,
      total: count(),
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(
      and(
        eq(candidates.isDeleted, false),
        inArray(candidates.status, ["hired", "rejected"])
      )
    )
    .groupBy(candidates.roleId, roles.name, candidates.status, candidates.tier)

  // Aggregate in JS: build per-role summary
}
```
**Avg days to hire:** Needs `createdAt` and `updatedAt` of the status change to "hired". This requires joining `candidateEvents` where `toValue = 'hired'`. Use the event's `createdAt` minus the candidate's `createdAt`. This is a slightly complex query — it's best done with a sub-query or raw SQL fragment via Drizzle's `sql` tag.

### Pattern 6: Import Source Filter (SRCH-06)
**What:** Filter candidates by their `source` field ('manual' | 'excel' | 'csv' | 'paste' | 'url').
**Implementation:** Straightforward — add `importSource` param to `getCandidates`, add `inArray(candidates.source, [...])` condition, add dropdown to `CandidateFilterBar`.
```typescript
// In getCandidates params:
importSource?: ImportSource[]

// In condition building:
if (importSource && importSource.length > 0) {
  conditions.push(inArray(candidates.source, importSource))
}
```

### Pattern 7: Stats Bar Linking to Master View (DASH-02)
**What:** Each stat card should link to `/master?status=<status>` to filter the master view.
**Implementation:** Wrap each stat card in a `<Link>` or add `onClick` that navigates. Current stat cards are plain divs.
```typescript
// Simple: replace Card with Link-wrapped Card
<Link href={`/master?status=${statusKey}`}>
  <Card className="cursor-pointer hover:border-blue-200 transition-colors">
    ...
  </Card>
</Link>
```

### Anti-Patterns to Avoid
- **Converting dashboard/page.tsx to fully client:** Keep it a server component for data. Extract a thin `DashboardClient` wrapper for state (drawer + refresh interval) only.
- **Re-fetching activities via fetch() on interval:** Use `router.refresh()` — it re-runs server components without client-side fetch boilerplate.
- **Building a complex mention library:** This is a small internal tool; a simple `@` detection + team member popover is sufficient. Don't reach for tiptap or ProseMirror.
- **Running avg-days-to-hire as N+1 queries:** Compute in a single SQL query with a join to candidateEvents.
- **Adding new rejection columns to DB:** All rejection fields (`rejectionReason`, `rejectionMessage`, `rejectionMarkedAt`) already exist on the candidates table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal overlay | Custom div with backdrop | @base-ui/react Dialog or existing inline modal pattern (as RejectionModal does it) | Already established pattern in codebase |
| Auto-refresh data | Custom fetch/polling hook | `router.refresh()` in useEffect interval | App Router idiomatic, no extra state |
| Relative timestamps | Custom date library | The `formatRelativeTime` function already exists in both ActivityFeed and CommentThread | Already built — copy/share the utility |
| Mention text parsing | Complex rich text editor | Simple string matching + indexOf | Overkill for internal tool |
| Dashboard stats aggregation | Per-row JS loops | Single Drizzle GROUP BY query | Database does aggregation efficiently |

**Key insight:** Most of the "hard" parts of this phase are already scaffolded. The risk is accidentally duplicating code that already exists (like formatRelativeTime, which appears in two files and should be extracted to a shared util).

## Common Pitfalls

### Pitfall 1: Dashboard Page Server/Client Split
**What goes wrong:** Developer adds `useState` or `useEffect` directly to `dashboard/page.tsx` without realizing it's a server component. Next.js throws "You're importing a component that needs useState. It only works in a Client Component."
**Why it happens:** The file has no `"use client"` directive — it's a server component by default.
**How to avoid:** Create a `DashboardClient` wrapper component marked `"use client"` that receives pre-fetched data as props and handles all client state (drawer, refresh interval).
**Warning signs:** TypeScript/Next.js build error about hooks in server components.

### Pitfall 2: Rejection Modal Not Blocking Status Save
**What goes wrong:** StatusBadge calls `changeStatus("rejected")` directly without waiting for rejection modal confirmation. The status changes but no reason is logged.
**Why it happens:** The existing StatusBadge was built before rejection flow — it calls `changeStatus` immediately in the `DropdownMenuItem` onClick.
**How to avoid:** Add a `pendingStatus` state. If `pendingStatus === "rejected"`, render RejectionModal and DO NOT call `changeStatus` until `onConfirm` is called.
**Warning signs:** Rejected candidates have null `rejectionReason` in the DB.

### Pitfall 3: ActivityFeed candidateId May Be Null
**What goes wrong:** Clicking an activity item tries to open the drawer with `candidateId = null` because some activity types (like imported batches) don't have a `candidateId`.
**Why it happens:** `activities.candidateId` is nullable in the schema.
**How to avoid:** Guard the click handler: `if (activity.candidateId) onCandidateClick(activity.candidateId)`. Show cursor-pointer only when candidateId is non-null.

### Pitfall 4: @Mention Detection Edge Case
**What goes wrong:** `@` detection fires on every keystroke causing the popover to flash. Or pressing Escape doesn't close it, trapping keyboard focus.
**Why it happens:** Simple string search without tracking cursor position.
**How to avoid:** Use `input.selectionStart` to find the `@` relative to cursor position, not just the last `@` in the string. Close popover on Escape keydown. Keep the implementation simple — if cursor complexity is high, just use a "mention chips" approach where user types name and picks from a list.

### Pitfall 5: DASH-05 Avg Days to Hire — No Data
**What goes wrong:** Avg days to hire shows 0 or NaN because no candidates are actually at "hired" status yet in the real dataset.
**Why it happens:** Early-stage product with no hired candidates.
**How to avoid:** Handle the empty case gracefully — show "—" instead of "0 days". Don't divide by zero.

### Pitfall 6: router.refresh() Not Re-Running Specific Queries
**What goes wrong:** After `router.refresh()`, the dashboard doesn't update because Next.js cached the data.
**Why it happens:** `fetch()` in server components is cached by default. However, Drizzle queries don't go through Next.js `fetch` cache — they re-run on refresh.
**How to avoid:** Drizzle queries run directly against PostgreSQL and are NOT cached by Next.js. `router.refresh()` will always re-run them. This is fine.

### Pitfall 7: Bulk Action Bar Already Exists — Don't Rebuild
**What goes wrong:** Plan creates a new BulkActionBar component, not knowing one already exists.
**Why it happens:** Planner doesn't know the codebase state.
**How to avoid:** `src/components/candidates/bulk-action-bar.tsx` already exists and handles bulk status change WITH rejection modal support. Verify it is properly toggled by checkbox selection in `CandidateTable`. If not, wire it there.

### Pitfall 8: CommentThread is Real, Not a Placeholder
**What goes wrong:** Plan re-implements CommentThread thinking CAND-04 is still a placeholder.
**Why it happens:** REQUIREMENTS.md marks CAND-04 as complete but the note says "replace placeholder."
**How to avoid:** `comment-thread.tsx` is a fully functional component already wired into `CandidateDrawer`. The only missing piece is @mention support (COLB-03). All other COLB requirements are already met.

## Code Examples

Verified patterns from existing codebase:

### Auto-Refresh Pattern (verified Next.js App Router)
```typescript
// DashboardClient.tsx — "use client" wrapper
"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface DashboardClientProps {
  // pre-fetched data from server component
  activities: Activity[]
  stats: DashboardStats
  // ... other data
}

export function DashboardClient({ activities, stats }: DashboardClientProps) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 30_000)
    return () => clearInterval(interval)
  }, [router])

  // render activity feed, stats bar, etc.
}
```

### Rejection Gate in StatusBadge
```typescript
// Addition to existing status-badge.tsx
const [pendingStatus, setPendingStatus] = useState<CandidateStatus | null>(null)
const [showRejectionModal, setShowRejectionModal] = useState(false)

const handleSelect = (s: CandidateStatus) => {
  if (s === "rejected") {
    setPendingStatus(s)
    setShowRejectionModal(true)
    return
  }
  startTransition(() => changeStatus(candidateId, status, s))
}

const handleRejectionConfirm = (reason: string, message: string) => {
  setShowRejectionModal(false)
  if (!pendingStatus) return
  startTransition(() =>
    changeStatus(candidateId, status, pendingStatus, { reason, message })
  )
}
```

### Hired vs Rejected Query (stats.ts extension)
```typescript
// Source: Drizzle ORM docs + existing stats.ts patterns
export async function getHiredRejectedByRole() {
  const hiredRows = await db
    .select({
      roleId: candidates.roleId,
      roleName: roles.name,
      status: candidates.status,
      tier: candidates.tier,
      total: count(),
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(
      and(
        eq(candidates.isDeleted, false),
        inArray(candidates.status, ["hired", "rejected"])
      )
    )
    .groupBy(candidates.roleId, roles.name, candidates.status, candidates.tier)

  // Group into per-role shape in JS
  const byRole: Record<string, RoleHireSummary> = {}
  for (const row of hiredRows) {
    if (!byRole[row.roleId]) {
      byRole[row.roleId] = { roleId: row.roleId, roleName: row.roleName, hired: 0, rejected: 0, juniorHired: 0, seniorHired: 0 }
    }
    if (row.status === "hired") {
      byRole[row.roleId].hired += row.total
      if (row.tier === "junior") byRole[row.roleId].juniorHired += row.total
      if (row.tier === "senior") byRole[row.roleId].seniorHired += row.total
    } else {
      byRole[row.roleId].rejected += row.total
    }
  }
  return Object.values(byRole)
}
```

### Import Source Filter in getCandidates
```typescript
// Extend existing GetCandidatesParams
importSource?: ImportSource[]

// In conditions array
if (importSource && importSource.length > 0) {
  conditions.push(inArray(candidates.source, importSource))
}
```

### @Mention Rendering in CommentItem
```typescript
function renderCommentBody(body: string): React.ReactNode {
  // Split on @Word pattern, highlight mentions
  const parts = body.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-blue-600 font-medium">{part}</span>
      : part
  )
}
```

## What Already Exists (Do Not Rebuild)

This section is critical for the planner to avoid wasted work.

| Component/Function | File | Status | Notes |
|-------------------|------|--------|-------|
| `RejectionModal` | `src/components/candidates/rejection-modal.tsx` | COMPLETE | Has chips, custom reason, message compose, save/copy options |
| `BulkActionBar` | `src/components/candidates/bulk-action-bar.tsx` | COMPLETE | Handles bulk status + bulk rejection |
| `CommentThread` | `src/components/candidates/comment-thread.tsx` | COMPLETE except @mention | Has create, edit, 5-min window, timestamps, avatars |
| `createComment` | `src/lib/actions/comments.ts` | COMPLETE | Accepts mentions param, inserts to DB |
| `editComment` | `src/lib/actions/comments.ts` | COMPLETE | 5-min window enforced server-side |
| `ActivityFeed` | `src/components/dashboard/activity-feed.tsx` | PARTIAL | Exists but not clickable, no auto-refresh |
| `getDashboardStats` | `src/lib/queries/stats.ts` | COMPLETE | Returns total, leftToReview, underReview, shortlisted, hired, rejected |
| `getRoleCandidateCounts` | `src/lib/queries/stats.ts` | COMPLETE | Per-role total counts |
| `getRoleTierBreakdown` | `src/lib/queries/stats.ts` | COMPLETE | Per-role tier breakdown |
| `getRecentActivities` | `src/lib/queries/activities.ts` | COMPLETE | Returns last N activities |
| `changeStatus` | `src/lib/actions/candidates.ts` | COMPLETE | Accepts rejection param, writes DB + event log + activity |
| Dashboard page | `src/app/dashboard/page.tsx` | PARTIAL | Has stats bar, role cards, activity feed — missing DASH-02 links, DASH-03 tier mini-bar, DASH-05, auto-refresh |
| `REJECTION_REASONS` | `src/lib/constants.ts` | COMPLETE | 6 chip options already defined |
| `IMPORT_SOURCES` | `src/lib/constants.ts` | COMPLETE | manual, excel, csv, paste, url |
| `formatRelativeTime` | Duplicated in 2 files | NEEDS EXTRACT | Same function in activity-feed.tsx and comment-thread.tsx — extract to shared util |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom fetch polling | `router.refresh()` interval | Next.js 13+ App Router | No client fetch, server components re-run cleanly |
| Separate API routes for dashboard data | Server component direct DB queries | Next.js 13+ | No API needed for SSR data |
| Heavy mention libraries (tiptap, ProseMirror) | Simple string detection for internal tools | Always | Overkill for small internal hiring tool |

**Not applicable to this phase:**
- WebSockets / SSE for real-time: 30s polling is specified in requirements, polling is correct for this scale
- Optimistic UI: Not required — `useTransition` provides sufficient pending states

## Open Questions

1. **Team members list for @mention (COLB-03)**
   - What we know: Schema stores mentions as `[{userId, name}]`. `createComment` accepts mentions param. No team members table exists (auth is MOCK_USER).
   - What's unclear: Since Clerk auth is deferred (FOUND-02 not complete), there's no real user list. How do we populate the mention dropdown?
   - Recommendation: Use a hardcoded constant `TEAM_MEMBERS` array for now, consistent with the MOCK_USER pattern. When Clerk is added in a future phase, replace with Clerk's user list API. The planner should document this as a MOCK pattern.

2. **Avg days to hire query complexity (DASH-05)**
   - What we know: `candidateEvents` has INSERT-ONLY log with `toValue = 'hired'` and `createdAt`. `candidates.createdAt` is when they were added.
   - What's unclear: Is "days to hire" from candidate creation to hired event, or from "under review" to hired?
   - Recommendation: Use candidate `createdAt` to hired event `createdAt`. Simple, unambiguous, and the most useful metric. The planner can simplify further if needed (e.g., just show hired count without avg days in v1).

3. **CandidateTable checkbox selection for BulkActionBar (PIPE-06)**
   - What we know: BulkActionBar is fully built. candidate-table.tsx exists.
   - What's unclear: Whether checkboxes are already in CandidateRow and selectedCandidates state is in CandidateTable, or if that was deferred.
   - Recommendation: The planner should check `candidate-table.tsx` and `candidate-row.tsx` for checkbox/selection state. If missing, it's a 1-task addition. If present, just verify BulkActionBar is rendered conditionally.

## Plan Structure Recommendation

Based on dependency analysis, this phase should have 3-4 plans:

**Plan 05-01 — Query Layer + Data Foundation**
- `getHiredRejectedByRole()` in stats.ts (DASH-05)
- `importSource` filter in `getCandidates` + `CandidateFilterBar` UI (SRCH-06)
- Extract `formatRelativeTime` to shared util (cleanup enabling later plans)
- Verify/wire checkbox selection in CandidateTable for BulkActionBar (PIPE-06)

**Plan 05-02 — Rejection Gate + Comments @Mention**
- Wire `RejectionModal` into `StatusBadge` (REJC-01 through REJC-05)
- Add @mention detection + popover + rendering to `CommentThread` (COLB-03)
- COLB-01, COLB-02, COLB-04 are already done — just verify

**Plan 05-03 — Dashboard Completion + Activity Feed Interactivity**
- Dashboard page refactor: extract `DashboardClient` for state + 30s refresh (PIPE-04, DASH-06)
- Make ActivityFeed items clickable → open CandidateDrawer (PIPE-05, DASH-06)
- Make stats bar cards link to Master View with status filter (DASH-02)
- Add tier breakdown mini-bar + Add/Import quick actions to role cards (DASH-03)
- Add hired vs rejected summary table using new query (DASH-05)
- Confirm DASH-01 (dashboard is default landing) — likely already handled by root page.tsx redirect

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all component/action/query file contents read and verified
- Next.js App Router `router.refresh()` pattern — verified from established project patterns and Next.js App Router conventions
- Drizzle ORM GROUP BY + inArray patterns — verified from existing stats.ts and candidates.ts in codebase

### Secondary (MEDIUM confidence)
- @mention implementation approach — based on established small-app patterns; no external library needed

### Tertiary (LOW confidence)
- None — all findings are grounded in direct codebase inspection

## Metadata

**Confidence breakdown:**
- What's already built vs. missing: HIGH — direct file reads
- Standard stack: HIGH — established project stack, no changes
- Architecture: HIGH — patterns proven in existing phases
- Rejection gate: HIGH — existing RejectionModal + changeStatus are directly composable
- @mention: MEDIUM — straightforward but no existing mention code to reference
- DASH-05 avg days query: MEDIUM — requires candidateEvents join, complexity manageable

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack — 30 days)
