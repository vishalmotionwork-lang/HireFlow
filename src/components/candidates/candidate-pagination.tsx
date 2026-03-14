"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronsDown } from "lucide-react";

interface CandidatePaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  /** Number of candidates currently shown */
  showing: number;
}

export function CandidatePagination({
  currentPage,
  totalPages,
  total,
  showing,
}: CandidatePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasMore = currentPage < totalPages;

  if (!hasMore || total <= showing) {
    return null;
  }

  const remaining = total - showing;

  function loadMore() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(currentPage + 1));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function loadAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(totalPages));
    params.set("loadAll", "true");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button
        onClick={loadMore}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <ChevronDown size={14} />
        Load More
        <span className="text-gray-400 font-normal">(50)</span>
      </button>
      {remaining > 50 && (
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ChevronsDown size={14} />
          Load All
          <span className="text-gray-400 font-normal">({remaining})</span>
        </button>
      )}
    </div>
  );
}
