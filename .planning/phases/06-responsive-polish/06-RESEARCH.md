# Phase 6: Responsive Polish - Research

**Researched:** 2026-03-13
**Domain:** Mobile-responsive layout with Tailwind CSS v4, shadcn/ui sidebar, and base-ui Sheet
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RESP-01 | All screens mobile responsive — sidebar collapses to bottom nav or hamburger on mobile | shadcn Sidebar already handles mobile as Sheet overlay; SidebarTrigger in topbar is wired; gap is bottom nav bar alternative |
| RESP-02 | Candidate profile opens full-screen on mobile instead of drawer | CandidateDrawer already detects `isMobile` and sets `side="bottom"` — needs upgrade to full-screen Sheet or dedicated page route |
| RESP-03 | Role cards stack to single column on mobile | Dashboard role grid already has `grid-cols-1 gap-4 md:grid-cols-2` — needs audit of stat bar and other layouts |
| RESP-04 | Filter bar collapses to expandable panel on mobile | CandidateFilterBar already has mobile toggle with `filtersOpen` state — needs refinement and polish |
</phase_requirements>

---

## Summary

The codebase is substantially further along on mobile responsiveness than the requirements suggest. Phase 1-5 implementation already includes: `useIsMobile` hook at `src/hooks/use-mobile.ts`, shadcn's Sidebar component which automatically renders as a Sheet overlay on mobile (via `SidebarProvider` + `SidebarTrigger`), a `CandidateFilterBar` with a mobile toggle pattern, and role cards with `grid-cols-1 md:grid-cols-2` layout. The gap between what exists and what RESP-01 through RESP-04 require is a polish pass, not a rebuild.

The three concrete gaps are: (1) the sidebar on mobile opens as a left-side overlay Sheet, but the requirements mention "bottom nav bar" as an option — this is the main decision point; (2) the candidate drawer on mobile uses `side="bottom"` which is a partial-height bottom sheet, NOT a full-screen view as RESP-02 requires; (3) the filter bar toggle exists but needs to be verified and polished across the roles page, master view, and import pages. The stat bar on the dashboard (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`) needs a mobile audit.

**Primary recommendation:** Use Tailwind CSS responsive classes exclusively — no new libraries needed. Fix the candidate drawer mobile mode to render full-screen (remove height cap or switch to a full-screen Sheet). Keep the shadcn hamburger sidebar (already working). Polish filter bar toggle. Audit every page for overflow issues at 375px viewport width.

---

## Standard Stack

### Core (already installed — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | ^4 | Responsive breakpoint utilities | Already in project, CSS-first approach |
| shadcn/ui Sidebar | installed | Desktop sidebar + mobile Sheet overlay | Already handles mobile via `isMobile` + Sheet |
| @base-ui/react Sheet | ^1.3.0 | Candidate drawer, sidebar overlay on mobile | Already used; `side="bottom"` or full-screen |
| lucide-react | ^0.577.0 | Icons (hamburger, X, SlidersHorizontal) | Already in project |
| `useIsMobile` hook | local | 768px breakpoint detection | Already at `src/hooks/use-mobile.ts` |

### No new packages needed

Phase 6 is pure CSS + component modification. All infrastructure exists. Do NOT add:
- react-navigation or any mobile nav library
- Framer Motion (not in project)
- Any bottom-nav component library

**Installation:**
```bash
# Nothing to install — all dependencies already in package.json
```

---

## Architecture Patterns

### Current Mobile Infrastructure (what already exists)

```
src/
├── hooks/
│   └── use-mobile.ts          # useIsMobile() — 768px breakpoint
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx      # SidebarProvider wrapping entire layout
│   │   ├── app-sidebar.tsx    # Sidebar with collapsible="icon"
│   │   └── topbar.tsx         # SidebarTrigger (hamburger) already present
│   ├── candidates/
│   │   ├── candidate-drawer.tsx  # isMobile → side="bottom" (NEEDS: full-screen)
│   │   └── candidate-filter-bar.tsx  # Mobile toggle exists (NEEDS: polish)
│   └── dashboard/
│       └── dashboard-client.tsx  # grid-cols-1 md:grid-cols-2 (NEEDS: stat bar audit)
└── app/
    └── roles/[slug]/page.tsx   # NEEDS: verify filter bar + table overflow
```

### Pattern 1: Shadcn Sidebar Mobile Behavior (already implemented)

The shadcn Sidebar component already handles mobile correctly. When `isMobile` is true (window width < 768px), the `Sidebar` component renders as a `Sheet` overlay instead of a fixed left panel. `SidebarTrigger` in the topbar toggles `openMobile` state. The hamburger icon is already present.

**What exists:**
```typescript
// src/components/ui/sidebar.tsx — lines 165-204 (already in codebase)
if (isMobile) {
  return (
    <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
      <SheetContent
        data-sidebar="sidebar"
        data-mobile="true"
        style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
        className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        side="left"
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
```

**Gap:** Verify `SidebarTrigger` is visible on all mobile pages. The topbar already renders `SidebarTrigger`. This is likely already working — manual verification needed at 375px.

### Pattern 2: Full-Screen Candidate Profile on Mobile (RESP-02)

The current `CandidateDrawer` uses `side={isMobile ? "bottom" : "right"}`. The bottom sheet has `h-auto` which makes it partial height — not full screen.

**Fix approach:** Override `className` on mobile to force full-height:

```typescript
// Source: existing CandidateDrawer pattern + Sheet component side="bottom" behavior
// In src/components/candidates/candidate-drawer.tsx

const side = isMobile ? "bottom" : "right";

// Current class: "w-full sm:max-w-[480px] overflow-y-auto p-0"
// Mobile needs: full screen — override with conditional className

<SheetContent
  side={side}
  className={cn(
    "overflow-y-auto p-0",
    isMobile
      ? "w-full h-[100dvh] max-h-[100dvh] inset-x-0 bottom-0 rounded-none"
      : "w-full sm:max-w-[480px]"
  )}
  showCloseButton
>
```

**Alternative approach:** Use `side="right"` always but set `w-full h-full` on mobile via className. The Sheet's right side variant allows `sm:max-w-sm` to be overridden.

**Best approach:** Keep `side="bottom"` on mobile but force `h-[100dvh]`. The `data-[side=bottom]:h-auto` in the Sheet component CSS will be overridden by the explicit `h-[100dvh]` class (Tailwind specificity). Use `100dvh` not `100vh` to account for mobile browser UI chrome (address bar).

```typescript
// Verified pattern — uses existing Sheet component, no new libraries
<SheetContent
  side={isMobile ? "bottom" : "right"}
  className={cn(
    "overflow-y-auto p-0",
    isMobile
      ? "h-[100dvh] rounded-t-none border-t-0"
      : "sm:max-w-[480px]"
  )}
  showCloseButton
>
```

### Pattern 3: Filter Bar Mobile Panel (RESP-04)

`CandidateFilterBar` already has the mobile toggle infrastructure:
- Mobile search row always visible at top
- "Filters" button toggles `filtersOpen` state
- Filter controls hidden with `hidden md:flex`, shown when `filtersOpen ? "flex" : "hidden md:flex"`

**What needs polish:**
1. When filters are open on mobile, the panel should have a visible close button or "Apply" action
2. Filter controls should stack vertically (`flex-col`) on mobile, not `flex-wrap`
3. The tier pill buttons (5 pills) overflow horizontally on small screens — needs `flex-wrap` or scrolling

```typescript
// Current filter container class:
className={`flex-wrap items-center gap-2 ${filtersOpen ? "flex" : "hidden md:flex"}`}

// Mobile improvement — stack vertically when expanded:
className={cn(
  "items-center gap-2",
  filtersOpen
    ? "flex flex-col md:flex-row md:flex-wrap"
    : "hidden md:flex md:flex-wrap"
)}
```

### Pattern 4: Dashboard Role Cards Grid (RESP-03)

Dashboard already has `grid-cols-1 gap-4 md:grid-cols-2`. This satisfies RESP-03 for role cards.

**Stat bar needs attention:**
```typescript
// Current: grid-cols-2 sm:grid-cols-3 lg:grid-cols-6
// At 375px: 2 columns → 3 stat cards per row → each card is ~175px
// This is acceptable but tight — verify text doesn't overflow
```

**Candidate table on mobile:** The 8-column table (`Name, Email, Portfolio, Phone, Instagram, Status, Tier, Date Added`) will not fit on mobile without horizontal scroll. This needs either:
- Horizontal scroll container (simplest, acceptable for internal tool)
- Responsive column hiding (hide Email, Phone, Instagram on mobile — show only Name, Status, Tier)

RESP-03 mentions "role cards stack" — the requirement does NOT mention the table itself. Horizontal scroll on the table is acceptable per the requirements scope.

### Pattern 5: Touch Target Sizing

All interactive elements need minimum 44x44px touch targets on mobile. Buttons with `py-1.5 px-3` at `text-sm` (14px) are approximately 36px tall — below minimum. Use `py-2` on mobile via responsive classes.

### Anti-Patterns to Avoid

- **Using `100vh` instead of `100dvh`:** On iOS Safari, `100vh` includes the URL bar height causing overflow. Always use `100dvh` for full-screen mobile elements.
- **Hiding content with `display:none` in JS:** Use Tailwind responsive classes (`hidden md:block`) — avoids hydration mismatches in Next.js.
- **New mobile nav library:** The shadcn sidebar Sheet overlay already satisfies RESP-01. A bottom navigation bar would require restructuring the layout — only do this if the hamburger approach fails manual verification.
- **Modifying the sidebar component directly:** `src/components/ui/sidebar.tsx` is a generated shadcn file (~600 lines). Modify behavior via props and wrapper components only.
- **useIsMobile for layout decisions in server components:** `useIsMobile` is a client-side hook. Server components must use CSS-only responsive classes. Never import `useIsMobile` in a server component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile sidebar overlay | Custom drawer component | Shadcn Sidebar (already in codebase) | Already handles Sheet overlay, keyboard shortcut, cookie persistence |
| Full-screen mobile sheet | Custom modal/route | Existing Sheet with `h-[100dvh]` className | No new component needed — CSS fix |
| Mobile filter panel | Custom accordion component | Existing `filtersOpen` state toggle | Already implemented, needs CSS polish only |
| Touch events / swipe-to-close | Custom gesture handler | Sheet component handles this via base-ui | base-ui Sheet has built-in dismiss behavior |
| Breakpoint detection | Custom resize listener | `useIsMobile` hook (already exists) | Already in `src/hooks/use-mobile.ts` |

**Key insight:** This is a CSS polish phase, not a feature build. Every infrastructure piece exists. The work is finding the 10-15 specific Tailwind class changes that make each screen work at 375px.

---

## Common Pitfalls

### Pitfall 1: `100vh` vs `100dvh` on iOS Safari
**What goes wrong:** Full-screen Sheet on mobile has a gap at the bottom — content is cut off.
**Why it happens:** iOS Safari calculates `100vh` including the browser chrome (address bar + toolbar), so `100vh` actually exceeds the visible area.
**How to avoid:** Always use `h-[100dvh]` for full-screen mobile elements. `dvh` = "dynamic viewport height" which accounts for browser UI.
**Warning signs:** White gap at bottom of full-screen sheet on iPhone.

### Pitfall 2: Candidate table horizontal overflow breaks page layout
**What goes wrong:** The 8-column table causes the entire page to scroll horizontally, not just the table.
**Why it happens:** Table without `overflow-x-auto` container pushes page width beyond viewport.
**How to avoid:** Wrap table in `<div className="overflow-x-auto -mx-4 md:mx-0">`. The `-mx-4` negative margin lets the table use full viewport width on mobile.
**Warning signs:** Page scrolls horizontally when table has many columns.

### Pitfall 3: Sheet component CSS specificity for full-screen override
**What goes wrong:** Adding `h-[100dvh]` to SheetContent doesn't work — the component's own `data-[side=bottom]:h-auto` wins.
**Why it happens:** The `h-auto` is set via data attribute selector which has higher specificity than a plain utility class in Tailwind v4.
**How to avoid:** Add `!h-[100dvh]` (important modifier) or restructure — set `side="right"` always and override width/height for mobile. Alternative: add `max-h-none` to override any max-height.
**Warning signs:** Full-screen sheet still shows as partial-height bottom sheet.

### Pitfall 4: Hydration mismatch from `useIsMobile` in layout
**What goes wrong:** Server renders sidebar as desktop layout, client detects mobile and switches — causes React hydration error or layout flash.
**Why it happens:** `useIsMobile` starts as `undefined` (SSR), becomes `true/false` on client. If the initial render differs, React logs hydration mismatch.
**How to avoid:** The existing `useIsMobile` returns `!!isMobile` which defaults to `false` (not `undefined`). This means SSR always renders desktop layout. On mobile devices, there will be a brief flash of desktop layout before client-side correction. This is acceptable behavior — don't try to fix it with suppressHydrationWarning on sensitive elements.
**Warning signs:** Console warning "Hydration mismatch" or visible flash of desktop sidebar before mobile sidebar appears.

### Pitfall 5: Filter bar dropdowns (base-ui portals) on mobile
**What goes wrong:** Dropdown menus from the filter bar render in a portal and appear off-screen or behind other elements on mobile.
**Why it happens:** Portal-based dropdowns compute position relative to trigger. On mobile viewports, there may not be enough space below the trigger.
**How to avoid:** The DropdownMenuContent from base-ui has `align="start"` — verify it also has a `side` fallback. Test all dropdowns at 375px. If a dropdown overflows, add `className="max-w-[calc(100vw-32px)]"` to DropdownMenuContent.
**Warning signs:** Dropdown content is cut off or appears underneath viewport edge.

### Pitfall 6: Mobile search duplication in filter bar
**What goes wrong:** Two search inputs visible simultaneously — one in topbar (global search, hidden on mobile via `hidden sm:block`) and one in filter bar (role-level search). At some breakpoints, both may be visible.
**Why it happens:** Topbar has `hidden sm:block` — hidden below `sm:` (640px). Filter bar search is always visible in the mobile row. This is correct behavior but needs verification.
**How to avoid:** Test at 375px, 414px (iPhone Plus), 640px (sm breakpoint boundary) to confirm no duplication.

---

## Code Examples

### Full-Screen Mobile Candidate Profile (RESP-02)

```typescript
// Source: existing CandidateDrawer + Sheet component in codebase
// File: src/components/candidates/candidate-drawer.tsx

import { cn } from "@/lib/utils"

// In CandidateDrawer component:
const isMobile = useIsMobile();
const side = isMobile ? "bottom" : "right";

<SheetContent
  side={side}
  className={cn(
    "overflow-y-auto p-0",
    isMobile
      ? "!h-[100dvh] rounded-t-none"
      : "sm:max-w-[480px]"
  )}
  showCloseButton
>
```

### Mobile Filter Toggle (RESP-04)

```typescript
// Source: existing candidate-filter-bar.tsx pattern
// The toggle already exists — polish the container layout:

<div
  className={cn(
    "items-center gap-2",
    filtersOpen
      ? "flex flex-col md:flex-row md:flex-wrap"
      : "hidden md:flex md:flex-wrap"
  )}
>
  {/* On mobile (flex-col), each filter control gets full width */}
  {/* On desktop (flex-row flex-wrap), they flow horizontally */}
```

### Table Overflow Container (prevents page-level horizontal scroll)

```typescript
// Source: standard HTML/CSS pattern, verified with Tailwind v4
// Wrap the candidate table in roles page:

<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <CandidateTable ... />
</div>
```

### Responsive Role Cards Grid (RESP-03 — already correct)

```typescript
// Source: existing dashboard-client.tsx line 142
// Already implemented — documenting for verification:
<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
  {activeRoles.map(role => <RoleCard ... />)}
</div>
// This already satisfies RESP-03
```

### Bottom Navigation Bar (alternative to hamburger — only if required)

```typescript
// Source: Tailwind CSS pattern — only implement if hamburger is deemed insufficient
// This is a significant structural change — research recommends hamburger first

// Would require wrapping SidebarInset to add padding-bottom on mobile:
<SidebarInset className="pb-16 md:pb-0">
  {/* existing content */}
</SidebarInset>

// And a fixed bottom nav component:
<nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 border-t bg-white md:hidden">
  <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
  <NavItem href="/master" icon={Users} label="All" />
  <NavItem href="/import" icon={Upload} label="Import" />
  <NavItem href="/settings" icon={Settings} label="Settings" />
</nav>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate mobile menu component | shadcn Sidebar with Sheet overlay | shadcn v2+ | No custom code needed — sidebar handles itself |
| `vh` units for full-screen | `dvh` units (dynamic viewport height) | CSS spec 2022, all modern browsers | Eliminates iOS Safari chrome overlap |
| `window.innerWidth` checks | CSS responsive classes + `matchMedia` | CSS/React best practices | No layout flash, hydration-safe |
| Bottom nav as primary mobile nav | Hamburger/drawer pattern | Industry trend | Simpler, less layout restructuring |

**Deprecated/outdated:**
- `overflow-scroll` with `-webkit-overflow-scrolling: touch`: No longer needed for momentum scrolling — native on all modern iOS/Android.
- Fixed `100vh` for full-screen mobile: Replaced by `100dvh` or `100svh` (small viewport height).

---

## Open Questions

1. **Bottom nav vs hamburger for RESP-01**
   - What we know: The shadcn sidebar already renders as a left-side Sheet overlay on mobile with a hamburger trigger in the topbar. This satisfies "hamburger menu" from RESP-01.
   - What's unclear: Whether the team wants a bottom navigation bar instead (as also mentioned in RESP-01). Bottom nav requires restructuring the layout to add padding-bottom + a fixed nav bar.
   - Recommendation: Verify the hamburger approach works well at 375px first. Only implement bottom nav if the hamburger sheet fails the success criteria. The requirement says "bottom nav OR hamburger" — hamburger is the lower-effort path.

2. **Candidate table on mobile**
   - What we know: RESP-03 says "role cards stack" and RESP-04 says "filter bar collapses" but doesn't mention the table. RESP-02 covers the profile drawer.
   - What's unclear: Whether the 8-column candidate table needs responsive column hiding or if horizontal scroll is acceptable.
   - Recommendation: Add overflow-x-auto container for the table. This is the minimal-effort fix that keeps all data accessible. The requirements don't call for column hiding.

3. **Import wizard mobile**
   - What we know: The import page has a multi-step wizard UI. None of the RESP requirements explicitly cover the import flow.
   - What's unclear: Whether import wizard needs mobile optimization.
   - Recommendation: Out of scope for Phase 6. The requirements only cover RESP-01 through RESP-04. Import wizard is desktop-centric workflow.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/components/ui/sidebar.tsx` (shadcn sidebar with mobile Sheet behavior, lines 165-204)
- Direct codebase inspection — `src/components/candidates/candidate-drawer.tsx` (existing `useIsMobile` + side="bottom")
- Direct codebase inspection — `src/components/candidates/candidate-filter-bar.tsx` (existing mobile toggle pattern)
- Direct codebase inspection — `src/hooks/use-mobile.ts` (768px breakpoint hook)
- Direct codebase inspection — `src/components/ui/sheet.tsx` (Sheet component variants including `side="bottom"` with `h-auto`)

### Secondary (MEDIUM confidence)
- Tailwind CSS `dvh` unit documentation — `100dvh` for mobile full-screen (supported in Tailwind v3.3+, project uses v4)
- MDN Web Docs — CSS `dvh` (dynamic viewport height) unit — all modern browsers since 2023

### Tertiary (LOW confidence)
- iOS Safari `100vh` behavior with browser chrome — widely documented community knowledge, not officially re-tested in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, no new choices needed
- Architecture patterns: HIGH — based on direct codebase inspection, exact file paths and line numbers verified
- Pitfalls: HIGH — derived from actual component code (e.g., Sheet's `data-[side=bottom]:h-auto` class confirmed in sheet.tsx)
- Mobile nav approach: MEDIUM — hamburger already works but bottom nav alternative is LOW (would require layout restructure)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable — Tailwind v4 and base-ui are mature, no breaking changes expected in 30 days)
