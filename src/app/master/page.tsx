import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { CandidateFilterBar } from "@/components/candidates/candidate-filter-bar";
import { CandidatePagination } from "@/components/candidates/candidate-pagination";
import { getCandidates } from "@/lib/queries/candidates";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus } from "@/types";

interface MasterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MasterPage({ searchParams }: MasterPageProps) {
  // Next.js 16: searchParams must be awaited
  const sp = await searchParams;

  // Parse filter params from URL search params
  const page = Math.max(1, Number(sp.page) || 1);

  const rawStatus = typeof sp.status === "string" ? sp.status : "";
  const status: CandidateStatus[] = rawStatus
    ? (rawStatus
        .split(",")
        .filter((s) =>
          (CANDIDATE_STATUSES as readonly string[]).includes(s),
        ) as CandidateStatus[])
    : [];

  const rawTier = typeof sp.tier === "string" ? sp.tier : null;
  const tier =
    rawTier === "junior" ||
    rawTier === "senior" ||
    rawTier === "intern" ||
    rawTier === "untiered"
      ? rawTier
      : null;

  const rawSort = typeof sp.sort === "string" ? sp.sort : "newest";
  const sort: "newest" | "oldest" | "name_asc" | "updated" =
    rawSort === "oldest" || rawSort === "name_asc" || rawSort === "updated"
      ? rawSort
      : "newest";

  const q = typeof sp.q === "string" ? sp.q : "";

  const rawDate = typeof sp.date === "string" ? sp.date : null;
  const dateRange: "today" | "week" | "month" | null =
    rawDate === "today" || rawDate === "week" || rawDate === "month"
      ? rawDate
      : null;

  const duplicatesOnly = sp.duplicates === "true";

  const rawSource = typeof sp.source === "string" ? sp.source : "";
  const importSource: string[] = rawSource
    ? rawSource.split(",").filter(Boolean)
    : [];

  const rawRoles = typeof sp.roles === "string" ? sp.roles : "";
  const roleIds: string[] = rawRoles ? rawRoles.split(",").filter(Boolean) : [];

  // Fetch all active roles for role name lookup
  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  // Build rolesMap: roleId -> roleName for display in Role column
  const rolesMap: Record<string, string> = Object.fromEntries(
    allRoles.map((r) => [r.id, r.name]),
  );

  const loadAll = sp.loadAll === "true" || page > 1;

  // Fetch ALL candidates across all roles (no roleId filter)
  const { candidates, total, totalPages } = await getCandidates({
    // roleId omitted intentionally — master view shows all candidates
    page,
    status,
    tier,
    sort,
    q,
    dateRange,
    duplicatesOnly,
    importSource,
    roleIds: roleIds.length > 0 ? roleIds : undefined,
    loadAll,
  });

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          All Candidates{" "}
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Cross-role master view — every candidate from every role
        </p>
      </div>

      {/* Filter bar */}
      <CandidateFilterBar
        showing={candidates.length}
        total={total}
        roles={allRoles.map((r) => ({ id: r.id, name: r.name }))}
      />

      {/* Candidates table — Role column enabled */}
      <CandidateTable
        candidates={candidates}
        total={total}
        roleId=""
        currentPage={page}
        totalPages={totalPages}
        showRoleColumn={true}
        rolesMap={rolesMap}
      />

      {/* Load More / Load All */}
      <CandidatePagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
        showing={candidates.length}
      />
    </div>
  );
}
