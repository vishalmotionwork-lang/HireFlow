# HireFlow Full Codebase Audit — 2026-03-16

## Executive Summary

4 parallel reviews (security, database, frontend, general code). **65+ issues found.**

**The app works but is NOT production-safe.** Two systemic problems:
1. **Auth is decorative** — server actions don't check permissions. A viewer can delete everything.
2. **No database indexes** — every query is a full table scan. Will degrade fast.

---

## CRITICAL — Fix Before Anyone Else Uses This

### 1. No Auth on 20+ Server Actions
**Severity:** CRITICAL | **Category:** Broken Access Control
**Files:** `src/lib/actions/candidates.ts`, `comments.ts`, `extraction.ts`, `import.ts`, `roles.ts`, `sheets.ts`, `notifications.ts`

Every mutation (createCandidate, deleteCandidates, deleteRole, mergeCandidates, importCandidates, connectSheet, etc.) runs without checking who's calling. Any authenticated user (even viewer) can do anything. Only `team.ts` uses `requireAuth()`.

**Fix:** Add `const user = await requireAuth("editor")` (or `"admin"` for destructive ops) at top of every server action.

---

### 2. Approve Endpoint Completely Open
**Severity:** CRITICAL | **Category:** Broken Access Control
**File:** `src/app/api/approve-member/route.ts`

Zero auth. Anyone who guesses a UUID can promote themselves to admin or delete team members. Listed in `PUBLIC_API_ROUTES` intentionally but dangerously.

**Fix:** Use HMAC-signed tokens in approval links instead of raw DB IDs. Verify token + expiry in the route handler.

---

### 3. MOCK_USER "Vishal" Hardcoded Everywhere
**Severity:** CRITICAL | **Category:** Broken Authentication
**Files:** `src/lib/constants.ts` + 20+ callsites across all action files

Every action is attributed to "Vishal". Audit trail is useless. Comment edit guard broken (anyone can edit anyone's comments since all are by "Vishal").

**Fix:** Replace all `MOCK_USER.name` with `user.name` from `requireAuth()` return value.

---

### 4. Zero Database Indexes on Candidates Table
**Severity:** CRITICAL | **Category:** Performance
**File:** `src/db/schema.ts`

The most-queried table has ZERO indexes. Every query is a sequential scan. Also missing indexes on: candidate_events, candidate_comments, activities, team_members, invitations, import_batches, extraction_drafts.

**Fix:** Single migration adding ~15 indexes. Immediate query performance improvement.

---

### 5. Import Filter Logic Inverted
**Severity:** CRITICAL | **Category:** Logic Bug
**File:** `src/components/import/Step3Validate.tsx:472`

```tsx
// CURRENT (wrong): keeps invalid rows
.filter((r) => r.decision !== "skip" || !r.validated.isValid)

// CORRECT: only keeps valid, non-skipped rows
.filter((r) => r.decision !== "skip" && r.validated.isValid && r.resolvedRoleId)
```

---

### 6. All Timestamps Timezone-Naive
**Severity:** CRITICAL | **Category:** Data Integrity
**File:** `src/db/schema.ts` — every table

Using `timestamp` instead of `timestamptz`. Sorting/filtering will break across DST changes or server region changes.

**Fix:** Migrate all columns to `timestamptz`.

---

### 7. Cron Secret Optional (Fails Open)
**Severity:** CRITICAL | **Category:** Security Misconfiguration
**File:** `src/app/api/cron/sync-sheets/route.ts:16`

If `CRON_SECRET` not set, the check is skipped entirely. Anyone can trigger sheet sync.

**Fix:** `if (!cronSecret || authHeader !== \`Bearer ${cronSecret}\`) return 401`

---

### 8. Operator Precedence Bug in Email baseUrl
**Severity:** CRITICAL | **Category:** Logic Bug
**File:** `src/lib/email.ts:32-35`

`NEXT_PUBLIC_SITE_URL` is never used due to `||` vs `?:` precedence. Approval email links may be wrong.

**Fix:** Use the existing `getBaseUrl()` helper that's correctly implemented lower in the same file.

---

## HIGH — Fix Before Next Production Deploy

| # | Issue | File |
|---|-------|------|
| 9 | HTML injection in emails — user names/comments unescaped | `email.ts` |
| 10 | SSRF via URL import — can fetch internal network/cloud metadata | `importFromUrl.ts` |
| 11 | Open redirect in auth callback — `?redirect=//evil.com` | `auth/callback/route.ts` |
| 12 | Notification actions accept userId from client — IDOR | `notifications.ts` |
| 13 | Race condition: two simultaneous signups → both become admin | `auth/callback/route.ts` |
| 14 | Invitation expiry never checked on acceptance | `auth/callback/route.ts` |
| 15 | `useMemo` with setState inside — React semantic violation | `Step2Mapping.tsx:213` |
| 16 | Type safety abandoned — `as unknown as` double cast | `ImportWizard.tsx:408,430` |
| 17 | Connection pool `max: 3` on serverless — should be `max: 1` | `db/index.ts` |
| 18 | Root layout DB queries on every page (even login) via unreliable header heuristic | `layout.tsx` |
| 19 | Zero test coverage (1 test file in entire app) | Everywhere |
| 20 | `sheets.ts` 833 lines with duplicated CSV parser | `sheets.ts` |
| 21 | No rate limiting anywhere | All endpoints |
| 22 | getTeamMembers/getPendingMembers have no auth guard | `team.ts` |

---

## MEDIUM — Fix When Building New Features

| # | Issue | File |
|---|-------|------|
| 23 | `createCandidate` not in transaction (event insert can fail alone) | `candidates.ts` |
| 24 | Race condition on role slug creation (concurrent syncs) | `sheets.ts` |
| 25 | Sequential DB queries that should be parallel (count+data, role+allRoles) | `candidates.ts`, role page |
| 26 | `formatDate`/`timeAgo` duplicated 3x (shared util exists) | 3 components |
| 27 | `clearStatusFilterIfNeeded` copy-pasted in 2 files | `status-badge.tsx`, `bulk-action-bar.tsx` |
| 28 | `Step3Validate.tsx` 979 lines (800 limit) | Import components |
| 29 | `revalidatePath("/", "layout")` too broad — 17 callsites | All actions |
| 30 | `notifyMentionedMembers` loads ALL team members, filters in JS | `comments.ts` |
| 31 | `processPendingExtractions` unbounded loop — no LIMIT | `extraction.ts` |
| 32 | `findOrCreateRole` fetches all roles on every cache miss (N+1) | `sheets.ts` |
| 33 | No ON DELETE cascade on FKs — orphan data risk | Schema |
| 34 | `extractionDrafts.status` is free text, not enum | Schema |
| 35 | No unique constraint on `candidates.email` — concurrent dupes possible | Schema |
| 36 | Dashboard re-fetches roles already fetched in layout | `dashboard/page.tsx` |
| 37 | Comment body has no length limit | `comments.ts` |
| 38 | Import batch created outside transaction — orphan on failure | `import.ts` |
| 39 | No retry/timeout for OpenAI API calls | `openai.ts` |
| 40 | Hardcoded prod URL in 3 files | `approve-member`, `email.ts`, `comments.ts` |
| 41 | Hardcoded team members list with stale TODO | `constants.ts` |
| 42 | No security headers (CSP, X-Frame-Options) | `next.config.ts` |

---

## Frontend Issues

| # | Severity | Issue | File |
|---|----------|-------|------|
| 43 | CRITICAL | DOM query for form state | `team-section.tsx:289` |
| 44 | HIGH | Inline anonymous functions cause re-renders | `candidate-table.tsx` |
| 45 | HIGH | `setTimeout` leak in CopyButton on unmount | `candidate-drawer.tsx` |
| 46 | HIGH | `setTimeout(0)` for focus — fragile | `edit-field.tsx` |
| 47 | HIGH | Race condition in URL-change detection (sheets) | `sheets-section.tsx` |
| 48 | WARN | Redundant `isPending` + `isMerging` state | `merge-modal.tsx` |
| 49 | WARN | `eslint-disable` hides stale closure bug | `candidate-filter-bar.tsx` |
| 50 | WARN | `window.confirm()` for destructive actions | `team-section.tsx`, `role-list.tsx` |
| 51 | SUG | Contact fields repeated 6x — should be mapped | `candidate-drawer.tsx` |
| 52 | SUG | `InlineIconPicker` duplicates `IconPicker` | `Step2Mapping.tsx` |

---

## Database Issues

| # | Severity | Issue |
|---|----------|-------|
| 53 | CRITICAL | No indexes on candidates (10+ needed) |
| 54 | CRITICAL | No FK indexes (candidate_events, comments) |
| 55 | CRITICAL | All timestamps timezone-naive |
| 56 | HIGH | No index on team_members(user_id) — every auth check |
| 57 | HIGH | No index on activities(created_at) |
| 58 | HIGH | No index on extraction_drafts(import_batch_id) |
| 59 | MEDIUM | max: 3 pool on serverless — should be max: 1 |
| 60 | MEDIUM | Two queries for count+data — could be one with window fn |
| 61 | MEDIUM | loadAll has no upper limit |
| 62 | MEDIUM | getComments has no LIMIT |

---

## Priority Remediation Order

### Sprint 1: Security Hardening (do first)
1. Add `requireAuth()` to every server action
2. Replace MOCK_USER with real auth identity
3. Fix approve-member endpoint (signed tokens)
4. Fix cron secret (fail closed)
5. Fix open redirect in auth callback
6. Fix notification IDOR (derive userId from session)
7. Escape HTML in email templates
8. Fix baseUrl operator precedence bug

### Sprint 2: Database & Performance
9. Add all missing indexes (single migration)
10. Migrate timestamps to timestamptz
11. Fix connection pool (max: 1, max_lifetime)
12. Parallelize sequential queries
13. Add LIMIT to unbounded queries

### Sprint 3: Code Quality
14. Fix import filter logic (inverted condition)
15. Fix useMemo with setState
16. Fix type safety (remove double cast)
17. Extract duplicated utilities
18. Split large files (Step3Validate, sheets.ts)
19. Add proper route groups for public vs auth layouts

### Sprint 4: Features
20. Status-priority sort + drag-and-drop
21. Resend custom domain
22. Security headers
23. Rate limiting
