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
  or,
} from "drizzle-orm";
import { db } from "@/db";
import { candidates, candidateEvents } from "@/db/schema";
import type { CandidateStatus, Tier } from "@/types";

interface GetCandidatesParams {
  roleId?: string;
  /** Filter by multiple role IDs (master view) */
  roleIds?: string[];
  page?: number;
  status?: CandidateStatus[];
  tier?: Tier | null;
  sort?: "newest" | "oldest" | "name_asc" | "updated";
  q?: string;
  dateRange?: "today" | "week" | "month" | null;
  duplicatesOnly?: boolean;
  importSource?: string[];
  /** When true, load all rows up to page * PAGE_SIZE (accumulating mode) */
  loadAll?: boolean;
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
  sort = "newest",
  q = "",
  dateRange = null,
  duplicatesOnly = false,
  importSource = [],
  roleIds,
  loadAll = false,
}: GetCandidatesParams) {
  const PAGE_SIZE = 50;
  // In accumulating mode, fetch from 0 to page * PAGE_SIZE
  const limit = loadAll ? page * PAGE_SIZE : PAGE_SIZE;
  const offset = loadAll ? 0 : (page - 1) * PAGE_SIZE;

  // Build conditions — guard every condition to avoid Drizzle undefined pitfall
  const conditions = [];

  // Always exclude soft-deleted candidates
  conditions.push(eq(candidates.isDeleted, false));

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

  // orderBy mapping — default is "updated" so status changes bubble to top
  const orderByClause =
    sort === "oldest"
      ? asc(candidates.createdAt)
      : sort === "name_asc"
        ? asc(candidates.name)
        : sort === "newest"
          ? desc(candidates.createdAt)
          : desc(candidates.updatedAt); // updated (default)

  // Count query — uses SAME conditions (shared array)
  const [countResult] = await db
    .select({ total: count() })
    .from(candidates)
    .where(whereClause);

  const total = countResult?.total ?? 0;

  // Data query — uses SAME conditions + ordering + pagination
  const data = await db
    .select()
    .from(candidates)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

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

  const events = await db
    .select()
    .from(candidateEvents)
    .where(eq(candidateEvents.candidateId, candidateId))
    .orderBy(desc(candidateEvents.createdAt));

  return { candidate, events };
}
