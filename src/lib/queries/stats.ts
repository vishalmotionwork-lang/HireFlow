import { count, eq, and, not, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { candidates, roles, candidateEvents } from "@/db/schema";
import { ARCHIVED_STATUSES } from "@/lib/constants/pipeline";

/**
 * Dashboard stats — global counts by status.
 */
export async function getDashboardStats() {
  const rows = await db
    .select({
      status: candidates.status,
      total: count(),
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.isDeleted, false),
        not(inArray(candidates.status, [...ARCHIVED_STATUSES])),
      ),
    )
    .groupBy(candidates.status);

  const statusMap = Object.fromEntries(rows.map((r) => [r.status, r.total]));

  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return {
    total,
    leftToReview: statusMap["left_to_review"] ?? 0,
    underReview: statusMap["under_review"] ?? 0,
    shortlisted: statusMap["shortlisted"] ?? 0,
    hired: statusMap["hired"] ?? 0,
    rejected: statusMap["rejected"] ?? 0,
  };
}

/**
 * Per-role candidate counts for role cards on the dashboard.
 */
export async function getRoleCandidateCounts() {
  const rows = await db
    .select({
      roleId: candidates.roleId,
      total: count(),
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.isDeleted, false),
        not(inArray(candidates.status, [...ARCHIVED_STATUSES])),
      ),
    )
    .groupBy(candidates.roleId);

  return Object.fromEntries(rows.map((r) => [r.roleId, r.total]));
}

export interface RoleHireSummary {
  roleId: string;
  roleName: string;
  hired: number;
  rejected: number;
  juniorHired: number;
  seniorHired: number;
  hireRate: number; // 0-100, percentage of (hired / (hired + rejected)) * 100
  avgDaysToHire: number | null; // null when no hired candidates
}

/**
 * Per-role hired/rejected summary with tier breakdown and avg days to hire.
 * Used by the dashboard hired/rejected table (DASH-05).
 *
 * Returns only roles that have at least one hired or rejected candidate.
 */
export async function getHiredRejectedByRole(): Promise<RoleHireSummary[]> {
  // Fetch all hired/rejected candidates with their role info
  const rows = await db
    .select({
      roleId: candidates.roleId,
      roleName: roles.name,
      status: candidates.status,
      tier: candidates.tier,
      candidateId: candidates.id,
      createdAt: candidates.createdAt,
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(
      and(
        eq(candidates.isDeleted, false),
        inArray(candidates.status, ["hired", "rejected"]),
      ),
    );

  if (rows.length === 0) return [];

  // Fetch hire events for avg days to hire computation
  const hiredCandidateIds = rows
    .filter((r) => r.status === "hired")
    .map((r) => r.candidateId);

  const hireEvents =
    hiredCandidateIds.length > 0
      ? await db
          .select({
            candidateId: candidateEvents.candidateId,
            eventDate: candidateEvents.createdAt,
          })
          .from(candidateEvents)
          .where(
            and(
              inArray(candidateEvents.candidateId, hiredCandidateIds),
              eq(candidateEvents.toValue, "hired"),
            ),
          )
      : [];

  // Build a map: candidateId -> first hire event date
  const hireEventMap = new Map<string, Date>();
  for (const ev of hireEvents) {
    if (!hireEventMap.has(ev.candidateId)) {
      hireEventMap.set(ev.candidateId, ev.eventDate);
    }
  }

  // Aggregate per role
  const roleMap = new Map<
    string,
    {
      roleName: string;
      hired: number;
      rejected: number;
      juniorHired: number;
      seniorHired: number;
      totalDaysToHire: number;
      hiredWithEvent: number;
    }
  >();

  for (const row of rows) {
    if (!roleMap.has(row.roleId)) {
      roleMap.set(row.roleId, {
        roleName: row.roleName,
        hired: 0,
        rejected: 0,
        juniorHired: 0,
        seniorHired: 0,
        totalDaysToHire: 0,
        hiredWithEvent: 0,
      });
    }

    const entry = roleMap.get(row.roleId)!;

    if (row.status === "hired") {
      entry.hired += 1;
      if (row.tier === "junior") entry.juniorHired += 1;
      if (row.tier === "senior") entry.seniorHired += 1;

      const hireDate = hireEventMap.get(row.candidateId);
      if (hireDate) {
        const diffMs = hireDate.getTime() - row.createdAt.getTime();
        const diffDays = Math.max(
          0,
          Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        );
        entry.totalDaysToHire += diffDays;
        entry.hiredWithEvent += 1;
      }
    } else {
      entry.rejected += 1;
    }
  }

  // Build the final result array
  const result: RoleHireSummary[] = [];
  for (const [roleId, entry] of roleMap.entries()) {
    const total = entry.hired + entry.rejected;
    const hireRate = total > 0 ? Math.round((entry.hired / total) * 100) : 0;
    const avgDaysToHire =
      entry.hiredWithEvent > 0
        ? Math.round(entry.totalDaysToHire / entry.hiredWithEvent)
        : null;

    result.push({
      roleId,
      roleName: entry.roleName,
      hired: entry.hired,
      rejected: entry.rejected,
      juniorHired: entry.juniorHired,
      seniorHired: entry.seniorHired,
      hireRate,
      avgDaysToHire,
    });
  }

  // Sort by hired count descending
  return result.sort((a, b) => b.hired - a.hired);
}

/**
 * Per-role breakdown with tier split for role cards.
 */
export async function getRoleTierBreakdown() {
  const rows = await db
    .select({
      roleId: candidates.roleId,
      tier: candidates.tier,
      total: count(),
    })
    .from(candidates)
    .where(
      and(
        eq(candidates.isDeleted, false),
        not(inArray(candidates.status, [...ARCHIVED_STATUSES])),
      ),
    )
    .groupBy(candidates.roleId, candidates.tier);

  const breakdown: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!breakdown[row.roleId]) breakdown[row.roleId] = {};
    breakdown[row.roleId][row.tier] = row.total;
  }
  return breakdown;
}
