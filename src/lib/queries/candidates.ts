import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  not,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import { candidates, candidateEvents, roles } from "@/db/schema";
import { ARCHIVED_STATUSES } from "@/lib/constants/pipeline";
import type { Candidate, CandidateStatus, Tier } from "@/types";

interface GetCandidatesParams {
  roleId?: string;
  /** Filter by multiple role IDs (master view) */
  roleIds?: string[];
  page?: number;
  status?: CandidateStatus[];
  tier?: Tier | null;
  sort?: "newest" | "oldest" | "name_asc" | "updated" | "priority";
  q?: string;
  dateRange?: "today" | "week" | "month" | null;
  duplicatesOnly?: boolean;
  importSource?: string[];
  /** When true, load all rows up to page * PAGE_SIZE (accumulating mode) */
  loadAll?: boolean;
  /** When true, show only archived candidates; when false (default), exclude them */
  showArchived?: boolean;
}

/**
 * Compute start-of-day date for date range filters.
 */
function getDateRangeStart(range: "today" | "week" | "month"): Date {
  const now = new Date();

  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // month
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Fetch a paginated, filtered, sorted list of candidates.
 * Both count and data queries share the same conditions array to prevent
 * total count mismatch (pitfall 6 in research).
 *
 * Search (q) searches across name, email, AND phone — per SRCH-01.
 */
export async function getCandidates({
  roleId,
  page = 1,
  status = [],
  tier = null,
  sort = "priority",
  q = "",
  dateRange = null,
  duplicatesOnly = false,
  importSource = [],
  roleIds,
  loadAll = false,
  showArchived = false,
}: GetCandidatesParams) {
  const PAGE_SIZE = 50;
  // In accumulating mode, fetch from 0 to page * PAGE_SIZE
  const limit = loadAll ? page * PAGE_SIZE : PAGE_SIZE;
  const offset = loadAll ? 0 : (page - 1) * PAGE_SIZE;

  // Build conditions — guard every condition to avoid Drizzle undefined pitfall
  const conditions = [];

  // Always exclude soft-deleted candidates
  conditions.push(eq(candidates.isDeleted, false));

  // Archive filter: show archived OR exclude archived
  if (showArchived) {
    conditions.push(inArray(candidates.status, [...ARCHIVED_STATUSES]));
  } else {
    conditions.push(not(inArray(candidates.status, [...ARCHIVED_STATUSES])));
  }

  if (roleId) {
    conditions.push(eq(candidates.roleId, roleId));
  }

  if (roleIds && roleIds.length > 0) {
    conditions.push(inArray(candidates.roleId, roleIds));
  }

  if (status.length > 0) {
    conditions.push(inArray(candidates.status, status));
  }

  if (tier) {
    conditions.push(eq(candidates.tier, tier));
  }

  if (q.trim()) {
    const search = `%${q.trim()}%`;
    // SRCH-01: search name + email + phone (WhatsApp)
    conditions.push(
      or(
        ilike(candidates.name, search),
        ilike(candidates.email, search),
        ilike(candidates.phone, search),
      )!,
    );
  }

  if (dateRange) {
    const rangeStart = getDateRangeStart(dateRange);
    conditions.push(gte(candidates.createdAt, rangeStart));
  }

  if (duplicatesOnly) {
    conditions.push(eq(candidates.isDuplicate, true));
  }

  if (importSource && importSource.length > 0) {
    conditions.push(inArray(candidates.source, importSource));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Status-priority weight: SQL CASE for ordering by pipeline stage
  const statusPriorityExpr = sql`CASE ${candidates.status}
    WHEN 'hired' THEN 1
    WHEN 'shortlisted' THEN 1
    WHEN 'assignment_passed' THEN 1
    WHEN 'assignment_sent' THEN 2
    WHEN 'assignment_followup' THEN 2
    WHEN 'assignment_pending' THEN 2
    WHEN 'under_review' THEN 2
    WHEN 'left_to_review' THEN 3
    WHEN 'maybe' THEN 3
    WHEN 'rejected' THEN 4
    WHEN 'not_good' THEN 4
    WHEN 'assignment_failed' THEN 4
    ELSE 5
  END`;

  // Build orderBy clauses array
  const buildOrderBy = () => {
    const clauses = [];

    // When sortOrder is set, always sort by it first
    clauses.push(sql`${candidates.sortOrder} ASC NULLS LAST`);

    if (sort === "priority") {
      clauses.push(sql`${statusPriorityExpr} ASC`);
      clauses.push(desc(candidates.updatedAt));
    } else if (sort === "oldest") {
      clauses.push(asc(candidates.createdAt));
    } else if (sort === "name_asc") {
      clauses.push(asc(candidates.name));
    } else if (sort === "newest") {
      clauses.push(desc(candidates.createdAt));
    } else {
      // "updated"
      clauses.push(desc(candidates.updatedAt));
    }

    return clauses;
  };

  const orderByClauses = buildOrderBy();

  // Count + data queries in parallel — both use SAME conditions (shared array)
  const [countResult, data] = await Promise.all([
    db.select({ total: count() }).from(candidates).where(whereClause),
    db
      .select()
      .from(candidates)
      .where(whereClause)
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    candidates: data,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * Fetch a single candidate plus their full event history.
 * NOTE: This function uses Drizzle directly and CANNOT be called from client
 * components. Use the fetchCandidateProfile server action in candidates.ts
 * to access this from client components.
 */
export async function getCandidateWithEvents(candidateId: string) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) {
    return null;
  }

  const [events, [role]] = await Promise.all([
    db
      .select()
      .from(candidateEvents)
      .where(eq(candidateEvents.candidateId, candidateId))
      .orderBy(desc(candidateEvents.createdAt)),
    db
      .select({ name: roles.name })
      .from(roles)
      .where(eq(roles.id, candidate.roleId))
      .limit(1),
  ]);

  return { candidate, events, roleName: role?.name ?? null };
}

export interface BestCandidate extends Candidate {
  roleName: string;
  roleSlug: string;
}

export async function getBestCandidates(
  roleId?: string,
): Promise<BestCandidate[]> {
  const BEST_STATUSES: CandidateStatus[] = [
    "shortlisted",
    "assignment_passed",
    "hired",
  ];

  const conditions = [
    eq(candidates.isDeleted, false),
    inArray(candidates.status, BEST_STATUSES),
  ];

  if (roleId) {
    conditions.push(eq(candidates.roleId, roleId));
  }

  const rows = await db
    .select({
      id: candidates.id,
      roleId: candidates.roleId,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      instagram: candidates.instagram,
      portfolioUrl: candidates.portfolioUrl,
      linkedinUrl: candidates.linkedinUrl,
      location: candidates.location,
      experience: candidates.experience,
      resumeUrl: candidates.resumeUrl,
      portfolioLinks: candidates.portfolioLinks,
      socialHandles: candidates.socialHandles,
      status: candidates.status,
      tier: candidates.tier,
      isDuplicate: candidates.isDuplicate,
      duplicateOfId: candidates.duplicateOfId,
      duplicateAction: candidates.duplicateAction,
      rejectionReason: candidates.rejectionReason,
      rejectionMessage: candidates.rejectionMessage,
      rejectionMarkedAt: candidates.rejectionMarkedAt,
      isDeleted: candidates.isDeleted,
      source: candidates.source,
      sortOrder: candidates.sortOrder,
      lastModifiedBy: candidates.lastModifiedBy,
      importBatchId: candidates.importBatchId,
      resumeFileName: candidates.resumeFileName,
      statusChangedBy: candidates.statusChangedBy,
      statusChangedAt: candidates.statusChangedAt,
      createdBy: candidates.createdBy,
      createdAt: candidates.createdAt,
      updatedAt: candidates.updatedAt,
      roleName: roles.name,
      roleSlug: roles.slug,
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(and(...conditions))
    .orderBy(desc(candidates.updatedAt))
    .limit(100);

  return rows;
}

/**
 * Count candidates in archived statuses for a given role.
 */
export async function getArchiveCount(roleId: string): Promise<number> {
  const [result] = await db
    .select({ total: count() })
    .from(candidates)
    .where(
      and(
        eq(candidates.isDeleted, false),
        eq(candidates.roleId, roleId),
        inArray(candidates.status, [...ARCHIVED_STATUSES]),
      ),
    );

  return result?.total ?? 0;
}

/**
 * Count candidates with "left_to_review" status, grouped by role_id.
 * Used for sidebar "Needs Review" badges.
 */
export async function getReviewCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      roleId: candidates.roleId,
      total: count(),
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.isDeleted, false),
        eq(candidates.status, "left_to_review"),
      ),
    )
    .groupBy(candidates.roleId);

  return Object.fromEntries(rows.map((r) => [r.roleId, r.total]));
}
