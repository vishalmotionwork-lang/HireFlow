# HireFlow — Resume Context

## Last Session: 2026-03-13
## Status: Phase 5 (Collaboration & Dashboard) — IN PROGRESS, fixing UI issues

## Current Blocker

Dashboard UI has issues after Plan 05-02 execution:
1. **Stale `.next` cache** — cleared (`rm -rf .next`). Caused hydration error referencing non-existent `CandidateCard.tsx` in `pipeline/` directory with DnD attributes. User needs to restart dev server + hard refresh.
2. **"Ratings" showing on dashboard** — user reported unexpected ratings UI. Likely the Star icon used for "Shortlisted" stat card looks like a rating. Need user screenshot after cache clear to confirm.
3. **Bad fonts** — Geist font loads via `next/font/google` in layout.tsx. May be a cache issue or a CSS problem. Check after restart.

## What To Do Next

1. **Restart dev server**: `cd ~/HireFlow && npm run dev`
2. **Hard refresh browser**: Cmd+Shift+R at http://localhost:3000
3. **Take screenshot** of dashboard after fresh load — compare to issues reported
4. **Fix any remaining visual issues** based on user feedback
5. **Complete human-verify checkpoint** (Task 2 of Plan 05-02) — 9 verification steps
6. **Run phase verification** after checkpoint approved

## Phase 5 Execution Progress

| Plan | Status | Commits |
|------|--------|---------|
| 05-01: Data layer + @mention foundation | DONE | 26d7526, 362190b |
| 05-02: Interactive dashboard (Task 1/2) | Code DONE, checkpoint PENDING | ccd58ba |

### 05-01 Built (Data Layer)
- `formatRelativeTime` shared utility
- `getHiredRejectedByRole` query (tier breakdown, avg days to hire)
- Import source filter end-to-end (SRCH-06)
- @mention support in CommentThread (COLB-03)

### 05-02 Built (Dashboard UI)
- DashboardClient wrapper (`"use client"`, manages drawer + 30s auto-refresh)
- Clickable stats bar → Link to `/master?status=X` (DASH-02)
- RoleCard with tier breakdown mini-bar + Add/Import/View All quick actions (DASH-03)
- HiredRejectedTable per-role summary (DASH-05)
- ActivityFeed items clickable → opens CandidateDrawer (DASH-06, PIPE-05)
- 30s auto-refresh via `router.refresh()` (DASH-06)

### Human Verify Checklist (9 steps — NOT YET VERIFIED)
1. Dashboard is landing page
2. Stats cards clickable → filtered master view
3. Role cards show tier mini-bar + quick actions
4. Hired/Rejected table renders
5. Activity feed items open candidate drawer
6. 30s auto-refresh in network tab
7. @mention comments work
8. Import source filter in filter bar
9. Rejection flow modal on status change

## GSD Executor State

- Phase: 05-collaboration-dashboard
- Plan: 02 (wave 2)
- Task: 2 of 2 (checkpoint:human-verify) — AWAITING USER
- Agent ID: a09f4980b23a90574 (DO NOT resume — spawn fresh continuation agent)

## All Phases Summary

| Phase | Plans | Status |
|-------|-------|--------|
| 1: Foundation | 3/3 | DONE |
| 2: Candidate Core | 5/5 | DONE |
| 3: Import Pipeline | 4/4 | DONE |
| 4: AI Extraction | 3/3 | DONE |
| 5: Collaboration & Dashboard | 1/2 | IN PROGRESS — checkpoint pending |
| 6: Responsive Polish | 0/TBD | Not started (roadmap has old responsive work here) |

## Key Files Modified This Session
| File | What |
|------|------|
| `src/lib/utils/format-relative-time.ts` | NEW — shared relative time utility |
| `src/lib/queries/stats.ts` | Added getHiredRejectedByRole, getRoleTierBreakdown |
| `src/lib/queries/candidates.ts` | Added importSource filter param |
| `src/components/candidates/comment-thread.tsx` | @mention popover + blue rendering |
| `src/components/candidates/candidate-filter-bar.tsx` | Source multi-select dropdown |
| `src/components/dashboard/dashboard-client.tsx` | NEW — client wrapper with drawer + auto-refresh |
| `src/components/dashboard/role-card.tsx` | NEW — tier mini-bar + quick actions |
| `src/components/dashboard/hired-rejected-table.tsx` | NEW — per-role hire summary |
| `src/components/dashboard/activity-feed.tsx` | Made items clickable |
| `src/app/dashboard/page.tsx` | Refactored to server-only data fetcher → DashboardClient |

## Tech Stack (DO NOT CHANGE)
- Next.js 16 + React 19 + TypeScript 5
- Drizzle ORM (NOT Prisma) + PostgreSQL 16
- shadcn/ui v4 (@base-ui/react, NOT Radix)
- Tailwind CSS 4
- OpenAI SDK (gpt-4o-mini) + Firecrawl
- Server actions (NOT REST API routes)
- MOCK_USER auth (Clerk deferred)

## Resume Command
```bash
cd ~/HireFlow && cat .planning/RESUME.md
```
