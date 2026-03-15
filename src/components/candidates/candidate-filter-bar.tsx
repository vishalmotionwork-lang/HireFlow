"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { STATUS_LABELS } from "@/lib/constants";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus } from "@/types";

const TIER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "untiered", label: "Untiered" },
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
] as const;

const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

const SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "updated", label: "Last Updated" },
] as const;

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "paste", label: "Paste" },
  { value: "url", label: "URL" },
] as const;

interface RoleOption {
  id: string;
  name: string;
}

interface CandidateFilterBarProps {
  showing: number;
  total: number;
  /** Pass roles to show a Role filter (master view only) */
  roles?: RoleOption[];
}

export function CandidateFilterBar({
  showing,
  total,
  roles,
}: CandidateFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read current filter state from URL
  const rawStatus = searchParams.get("status") ?? "";
  const selectedStatuses: CandidateStatus[] = rawStatus
    ? (rawStatus
        .split(",")
        .filter((s) =>
          (CANDIDATE_STATUSES as readonly string[]).includes(s),
        ) as CandidateStatus[])
    : [];

  const selectedTier = searchParams.get("tier") ?? "all";
  const selectedDate = searchParams.get("date") ?? "";
  const selectedSort = searchParams.get("sort") ?? "priority";
  const duplicatesOnly = searchParams.get("duplicates") === "true";

  // Role multi-select (comma-separated role IDs, master view only)
  const rawRole = searchParams.get("roles") ?? "";
  const selectedRoles: string[] = rawRole
    ? rawRole.split(",").filter(Boolean)
    : [];

  // Import source multi-select (comma-separated, same pattern as status)
  const rawSource = searchParams.get("source") ?? "";
  const selectedSources: string[] = rawSource
    ? rawSource
        .split(",")
        .filter((s) => SOURCE_OPTIONS.some((o) => o.value === s))
    : [];

  // Search — local state + debounce
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch.trim()) {
      params.set("q", debouncedSearch.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /**
   * Update a single filter key in URL params.
   * Always resets page to 1 on any filter change.
   */
  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  /** Toggle a status in the comma-separated status list */
  function toggleStatus(status: CandidateStatus) {
    const current = new Set(selectedStatuses);
    if (current.has(status)) {
      current.delete(status);
    } else {
      current.add(status);
    }
    const newValue = Array.from(current).join(",") || null;
    setFilter("status", newValue);
  }

  /** Toggle an import source in the comma-separated source list */
  function toggleSource(source: string) {
    const current = new Set(selectedSources);
    if (current.has(source)) {
      current.delete(source);
    } else {
      current.add(source);
    }
    const newValue = Array.from(current).join(",") || null;
    setFilter("source", newValue);
  }

  /** Toggle a role in the comma-separated roles list */
  function toggleRole(roleId: string) {
    const current = new Set(selectedRoles);
    if (current.has(roleId)) {
      current.delete(roleId);
    } else {
      current.add(roleId);
    }
    const newValue = Array.from(current).join(",") || null;
    setFilter("roles", newValue);
  }

  /** Clear all active filters */
  function clearAll() {
    setSearchInput("");
    router.push(pathname);
  }

  // Count active filters (not counting sort since it always has a value)
  const activeFilterCount = [
    selectedStatuses.length > 0,
    selectedTier !== "all" && selectedTier !== "",
    !!selectedDate,
    duplicatesOnly,
    !!searchParams.get("q"),
    selectedSources.length > 0,
    selectedRoles.length > 0,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  // Mobile filter toggle
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Current sort label
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === selectedSort)?.label ?? "Newest";

  // Current date label
  const dateLabel = selectedDate
    ? DATE_OPTIONS.find((o) => o.value === selectedDate)?.label
    : null;

  return (
    <div className="space-y-2">
      {/* Mobile: search + filter toggle */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            filtersOpen || hasActiveFilters
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-700">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Main filter row — always visible on desktop, toggleable on mobile */}
      <div
        className={cn(
          filtersOpen
            ? "flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2"
            : "hidden md:flex md:flex-wrap md:items-center md:gap-2",
        )}
      >
        {/* 1. Status multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Status
            {selectedStatuses.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-700">
                {selectedStatuses.length}
              </span>
            )}
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-52 max-h-72 overflow-y-auto max-w-[calc(100vw-32px)]"
          >
            {CANDIDATE_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              >
                {STATUS_LABELS[status]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 1b. Role multi-select (master view only) */}
        {roles && roles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Role
              {selectedRoles.length > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-700">
                  {selectedRoles.length}
                </span>
              )}
              <ChevronDown size={14} className="text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-52 max-h-72 overflow-y-auto max-w-[calc(100vw-32px)]"
            >
              {roles.map((role) => (
                <DropdownMenuCheckboxItem
                  key={role.id}
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                >
                  {role.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 2. Tier dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {selectedTier && selectedTier !== "all" ? (
              <>
                Tier:{" "}
                <span className="text-blue-700">
                  {TIER_OPTIONS.find((o) => o.value === selectedTier)?.label ??
                    selectedTier}
                </span>
              </>
            ) : (
              "Tier"
            )}
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {TIER_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() =>
                  setFilter(
                    "tier",
                    option.value === "all" ? null : option.value,
                  )
                }
                className={
                  (option.value === "all" &&
                    (selectedTier === "all" || selectedTier === "")) ||
                  selectedTier === option.value
                    ? "bg-blue-50 text-blue-700"
                    : ""
                }
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 3. Date Added dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {dateLabel ? (
              <>
                Date: <span className="text-blue-700">{dateLabel}</span>
              </>
            ) : (
              "Date"
            )}
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {DATE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setFilter("date", option.value)}
                className={
                  selectedDate === option.value
                    ? "bg-blue-50 text-blue-700"
                    : ""
                }
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            {selectedDate && (
              <DropdownMenuItem
                onClick={() => setFilter("date", null)}
                className="text-gray-400"
              >
                All Time
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 4. Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Sort: <span className="text-gray-900">{sortLabel}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setFilter("sort", option.value)}
                className={
                  selectedSort === option.value
                    ? "bg-blue-50 text-blue-700"
                    : ""
                }
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 5. Import source multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Source
            {selectedSources.length > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-semibold text-blue-700">
                {selectedSources.length}
              </span>
            )}
            <ChevronDown size={14} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-44 max-w-[calc(100vw-32px)]"
          >
            {SOURCE_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedSources.includes(option.value)}
                onCheckedChange={() => toggleSource(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 6. Duplicates toggle */}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors select-none">
          <input
            type="checkbox"
            checked={duplicatesOnly}
            onChange={(e) =>
              setFilter("duplicates", e.target.checked ? "true" : null)
            }
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
          />
          Duplicates only
        </label>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 6. Search input (right-aligned) */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or email..."
            className="w-52 rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>

        {/* Done button — closes filter panel on mobile */}
        {filtersOpen && (
          <button
            onClick={() => setFiltersOpen(false)}
            className="mt-1 w-full rounded-md bg-gray-100 py-2 text-sm font-medium text-gray-700 md:hidden"
          >
            Done
          </button>
        )}
      </div>

      {/* 7. Active filter summary row */}
      {(hasActiveFilters || total > 0) && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            Showing <span className="font-medium text-gray-700">{showing}</span>{" "}
            of <span className="font-medium text-gray-700">{total}</span>{" "}
            {total === 1 ? "candidate" : "candidates"}
          </span>

          {hasActiveFilters && (
            <>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-100 px-1 font-semibold">
                  {activeFilterCount}
                </span>
                {activeFilterCount === 1 ? "filter" : "filters"} active
              </span>
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                <X size={12} />
                Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
