"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CandidatePaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

/**
 * Compute the page numbers to display, with ellipsis markers.
 * Always shows: first page, last page, current page ±1.
 * Returns an array of page numbers or null (representing ellipsis).
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];
  const delta = 1; // pages shown on each side of current

  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);

  if (rangeStart > 2) {
    pages.push(null); // left ellipsis
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < totalPages - 1) {
    pages.push(null); // right ellipsis
  }

  pages.push(totalPages);

  return pages;
}

export function CandidatePagination({
  currentPage,
  totalPages,
  total,
}: CandidatePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only render when there are multiple pages
  if (totalPages <= 1) {
    return null;
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
      {/* Page info */}
      <span className="text-sm text-gray-500">
        Page{" "}
        <span className="font-medium text-gray-700">{currentPage}</span> of{" "}
        <span className="font-medium text-gray-700">{totalPages}</span>
        <span className="ml-2 text-gray-400">
          ({total} {total === 1 ? "candidate" : "candidates"})
        </span>
      </span>

      {/* Page navigation */}
      <nav
        className="flex items-center gap-1"
        aria-label="Pagination"
      >
        {/* Previous */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={isFirst}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {/* Page numbers */}
        {pageNumbers.map((page, index) => {
          if (page === null) {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 w-8 items-center justify-center text-sm text-gray-400 select-none"
                aria-hidden="true"
              >
                &hellip;
              </span>
            );
          }

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => goToPage(page)}
              aria-label={`Page ${page}`}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "border border-blue-500 bg-blue-50 text-blue-700"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={isLast}
          aria-label="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </nav>
    </div>
  );
}
