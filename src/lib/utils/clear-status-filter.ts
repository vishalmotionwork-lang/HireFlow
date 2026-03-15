import type { useRouter } from "next/navigation";
import type { CandidateStatus } from "@/types";

/**
 * If the URL has an active status filter that would exclude the new status,
 * clear it so the candidate remains visible after the status change.
 */
export function clearStatusFilterIfNeeded(
  newStatus: CandidateStatus,
  searchParams: URLSearchParams,
  pathname: string,
  router: ReturnType<typeof useRouter>,
): void {
  const rawStatus = searchParams.get("status");
  if (!rawStatus) return; // no active filter -- all statuses shown

  const activeStatuses = rawStatus.split(",").filter(Boolean);
  if (activeStatuses.length === 0) return;

  // If the new status is already in the filter, the candidate stays visible
  if (activeStatuses.includes(newStatus)) return;

  // The new status would be filtered out -- clear the status filter
  const params = new URLSearchParams(searchParams.toString());
  params.delete("status");
  params.delete("page");
  router.replace(`${pathname}?${params.toString()}`);
}
