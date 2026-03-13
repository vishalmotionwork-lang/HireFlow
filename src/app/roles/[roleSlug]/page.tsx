import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { CandidateFilterBar } from "@/components/candidates/candidate-filter-bar";
import { CandidatePagination } from "@/components/candidates/candidate-pagination";
import { getCandidates } from "@/lib/queries/candidates";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus } from "@/types";

interface RolePageProps {
  params: Promise<{ roleSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RolePage({ params, searchParams }: RolePageProps) {
  // Next.js 16: both params and searchParams must be awaited
  const { roleSlug } = await params;
  const sp = await searchParams;

  // Parse filter params from URL search params
  const page = Math.max(1, Number(sp.page) || 1);

  const rawStatus = typeof sp.status === "string" ? sp.status : "";
  const status: CandidateStatus[] = rawStatus
    ? (rawStatus
        .split(",")
        .filter((s) =>
          (CANDIDATE_STATUSES as readonly string[]).includes(s)
        ) as CandidateStatus[])
    : [];

  const rawTier = typeof sp.tier === "string" ? sp.tier : null;
  const tier =
    rawTier === "junior" || rawTier === "senior" || rawTier === "both" || rawTier === "untiered"
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

  // Fetch the current role
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.slug, roleSlug))
    .limit(1);

  if (!role) {
    notFound();
  }

  // Fetch all active roles for the tab strip
  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  // Fetch filtered, paginated candidates for this role
  const { candidates, total, totalPages } = await getCandidates({
    roleId: role.id,
    page,
    status,
    tier,
    sort,
    q,
    dateRange,
    duplicatesOnly,
  });

  return (
    <div className="space-y-4">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <DynamicIcon name={role.icon} size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {role.name}{" "}
            <span className="text-sm font-normal text-gray-400">
              ({total})
            </span>
          </h1>
          {role.description && (
            <p className="text-xs text-gray-400">{role.description}</p>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {allRoles.map((r) => (
          <Link
            key={r.id}
            href={`/roles/${r.slug}`}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              r.slug === roleSlug
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {r.name}
          </Link>
        ))}
      </div>

      {/* Filter bar — between tab strip and table */}
      <CandidateFilterBar showing={candidates.length} total={total} />

      {/* Candidates table */}
      <CandidateTable
        candidates={candidates}
        total={total}
        roleId={role.id}
        currentPage={page}
        totalPages={totalPages}
      />

      {/* Pagination — below the table */}
      <CandidatePagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
