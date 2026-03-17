import { notFound } from "next/navigation";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import { CandidateTable } from "@/components/candidates/candidate-table";
import { KanbanBoard } from "@/components/candidates/kanban-board";
import { ViewToggle } from "@/components/candidates/view-toggle";
import { CandidateFilterBar } from "@/components/candidates/candidate-filter-bar";
import { CandidatePagination } from "@/components/candidates/candidate-pagination";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { getCandidates, getArchiveCount } from "@/lib/queries/candidates";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus } from "@/types";
import Link from "next/link";

interface RolePageProps {
  params: Promise<{ roleSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RolePage({
  params,
  searchParams,
}: RolePageProps) {
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

  const rawSort = typeof sp.sort === "string" ? sp.sort : "priority";
  const sort: "newest" | "oldest" | "name_asc" | "updated" | "priority" =
    rawSort === "oldest" ||
    rawSort === "name_asc" ||
    rawSort === "newest" ||
    rawSort === "priority"
      ? rawSort
      : "priority";

  const q = typeof sp.q === "string" ? sp.q : "";

  const rawDate = typeof sp.date === "string" ? sp.date : null;
  const dateRange: "today" | "week" | "month" | null =
    rawDate === "today" || rawDate === "week" || rawDate === "month"
      ? rawDate
      : null;

  const duplicatesOnly = sp.duplicates === "true";
  const showArchived = sp.archived === "true";

  const rawSource = typeof sp.source === "string" ? sp.source : "";
  const importSource: string[] = rawSource
    ? rawSource.split(",").filter(Boolean)
    : [];

  const rawView = typeof sp.view === "string" ? sp.view : "list";
  const view: "list" | "board" = rawView === "board" ? "board" : "list";

  // Fetch the current role
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.slug, roleSlug))
    .limit(1);

  if (!role) {
    notFound();
  }

  const loadAll = sp.loadAll === "true" || page > 1 || view === "board";

  // Fetch filtered candidates + archive count in parallel
  const [{ candidates, total, totalPages }, archiveCount] = await Promise.all([
    getCandidates({
      roleId: role.id,
      page,
      status,
      tier,
      sort,
      q,
      dateRange,
      duplicatesOnly,
      importSource,
      loadAll,
      showArchived,
    }),
    getArchiveCount(role.id),
  ]);

  return (
    <div className="space-y-4">
      {/* Real-time: refresh when candidates or activities change for this role */}
      <RealtimeRefresh
        subscriptions={[
          { table: "candidates", filter: `role_id=eq.${role.id}` },
          { table: "candidate_comments" },
          { table: "activities", filter: `role_id=eq.${role.id}` },
        ]}
      />

      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <DynamicIcon name={role.icon} size={18} className="text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">
              {role.name}{" "}
              <span className="text-sm font-normal text-gray-400">
                ({total})
              </span>
            </h1>
            {showArchived ? (
              <Link
                href={`/roles/${roleSlug}`}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                &larr; Back to active
              </Link>
            ) : archiveCount > 0 ? (
              <Link
                href={`/roles/${roleSlug}?archived=true`}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Archive ({archiveCount})
              </Link>
            ) : null}
          </div>
          {showArchived ? (
            <p className="text-xs text-gray-400">Archived candidates</p>
          ) : (
            role.description && (
              <p className="text-xs text-gray-400">{role.description}</p>
            )
          )}
        </div>
      </div>

      {/* View toggle + filter bar */}
      <div className="flex items-center justify-between gap-3">
        <CandidateFilterBar showing={candidates.length} total={total} />
        <ViewToggle currentView={view} />
      </div>

      {/* Candidates view — table or kanban board */}
      {view === "board" ? (
        <KanbanBoard candidates={candidates} />
      ) : (
        <>
          <CandidateTable
            candidates={candidates}
            total={total}
            roleId={role.id}
            roleName={role.name}
            currentPage={page}
            totalPages={totalPages}
          />

          {/* Load More / Load All */}
          <CandidatePagination
            currentPage={page}
            totalPages={totalPages}
            total={total}
            showing={candidates.length}
          />
        </>
      )}
    </div>
  );
}
