# Phase 2: Candidate Core - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Team can view candidates organized by role, manage individual profiles, move candidates through the 12-stage pipeline, assign Junior/Senior tiers, and search/filter within role views — covering the full daily-use workflow. Import, AI extraction, comments, and dashboard stats are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Candidate list layout
- Table rows (spreadsheet-like) — compact, scannable, fits high-volume hiring
- Extended 8 columns: Name, Email, Portfolio Link, Phone/WhatsApp, Instagram, Status (badge), Tier (badge), Date Added
- "Add Candidate" button at top of table opens an inline form row — no modal, no context switch
- Default sort: newest first (most recently added at top)
- Clicking a row opens the profile drawer (see below)

### Profile/detail view
- Side drawer slides in from the right (~400-500px) — table stays visible behind it, dimmed
- Click-to-edit fields: each field looks like text until clicked, then becomes an input. Saves on blur or Enter. No global edit button.
- Status history: vertical timeline, newest at top. Each entry shows status change, who made it, when. Connected by a thin vertical line.
- Mobile: bottom sheet (slides up from bottom, draggable to full height). Same content as drawer, just full width.

### Pipeline interaction
- Status badge in the table is clickable — opens a dropdown with all 12 statuses. One click to change. No need to open profile.
- No confirmation on status changes — instant change. History log means nothing is lost. Undo by changing status back.
- No bulk actions in Phase 2 — one candidate at a time. Bulk operations deferred.
- Tier assignment: tier badge in table is clickable — cycles through Untiered → Junior → Senior → Both.

### Search & filter UX
- Horizontal filter bar above table, between tab strip and table. Always visible.
- Filter dropdowns: Status (multi-select with checkboxes), Tier, Date Added
- Search input on the right side of filter bar — instant filter as you type (debounced ~300ms), searches name and email
- Active filters show count badge on each dropdown. "Clear all" / "✕ Reset" button appears when any filter is active. Shows "Showing X of Y candidates".

### Claude's Discretion
- Exact drawer width and animation
- Table pagination vs infinite scroll (for large candidate lists)
- Loading states and skeleton patterns
- Empty state illustrations and copy
- Exact filter dropdown component implementation
- Mobile table layout (horizontal scroll vs stacked cards)

</decisions>

<specifics>
## Specific Ideas

- Table should feel like Linear's issue list — clean rows, status badges, scannable
- Drawer should feel like Linear's issue drawer — slides in from right, table dimmed behind
- Mobile bottom sheet pattern like Google Maps / Apple Maps — familiar, draggable
- Click-to-edit should feel native — no "edit mode", just click any field to change it

</specifics>

<deferred>
## Deferred Ideas

- Bulk status changes (select multiple candidates, change status at once) — future phase
- Import source filter — will make sense after Phase 3 (Import Pipeline) is built
- Keyboard shortcuts for status changes — future enhancement
- PIPE-04 (dashboard activity feed with 30s refresh) — deferred to Phase 5, dashboard is basic in Phase 2
- PIPE-05 (clicking activity item opens candidate profile) — deferred to Phase 5, depends on PIPE-04
- CAND-04 comment thread — Phase 2 adds a placeholder "Comments coming soon" section in profile drawer; full comment thread built in Phase 5 (COLB-01..04)

</deferred>

---

*Phase: 02-candidate-core*
*Context gathered: 2026-03-13*
