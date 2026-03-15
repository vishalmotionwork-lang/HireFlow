"use client";

import { TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { CompactStarRating } from "@/components/candidates/star-rating";
import { formatRelativeTime } from "@/lib/utils/format-time";
import type { Candidate } from "@/types";

interface CandidateRowProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
  isChecked?: boolean;
  onCheckboxToggle?: (candidateId: string) => void;
  /** When true, renders with elevation/shadow for drag overlay */
  isDragOverlay?: boolean;
  /** Drag handle element to render in the first cell */
  dragHandle?: React.ReactNode;
}

/**
 * Format a date as relative time (e.g. "2d ago") or short date (e.g. "Mar 13")
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // Short date for older entries
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Strip protocol from a URL, showing just the domain + path.
 * e.g. "https://behance.net/john" -> "behance.net/john"
 */
function stripProtocol(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    return url;
  }
}

export function CandidateRow({
  candidate,
  onSelect,
  showRoleColumn = false,
  rolesMap = {},
  isChecked = false,
  onCheckboxToggle,
  isDragOverlay = false,
  dragHandle,
}: CandidateRowProps) {
  const handleRowClick = () => {
    onSelect(candidate);
  };

  const instagramHandle =
    candidate.instagram && !candidate.instagram.startsWith("@")
      ? `@${candidate.instagram}`
      : candidate.instagram;

  const roleName = showRoleColumn
    ? (rolesMap[candidate.roleId] ?? "Unknown Role")
    : null;

  const isPositive =
    candidate.status === "shortlisted" ||
    candidate.status === "assignment_passed" ||
    candidate.status === "hired";

  const isNegative =
    candidate.status === "rejected" ||
    candidate.status === "not_good" ||
    candidate.status === "assignment_failed";

  const baseRowClass = isPositive
    ? "border-b border-gray-100 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition-colors border-l-4 border-l-emerald-500 [&_td:first-child]:pl-1.5"
    : isNegative
      ? "border-b border-gray-100 bg-red-50 hover:bg-red-100/70 cursor-pointer transition-colors border-l-4 border-l-red-400"
      : "border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors";

  const overlayClass = isDragOverlay
    ? "shadow-lg ring-2 ring-blue-400/50 bg-white opacity-95"
    : "";

  const rowClass = `${baseRowClass} ${overlayClass}`;

  return (
    <tr onClick={handleRowClick} className={rowClass}>
      {/* Drag handle — only render if provided */}
      {dragHandle && <td className="w-6 px-0.5 py-2.5">{dragHandle}</td>}

      {/* Checkbox */}
      <td className="w-8 px-2 py-2.5">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onCheckboxToggle?.(candidate.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select ${candidate.name}`}
        />
      </td>

      {/* Name */}
      <td className="px-3 py-2.5 max-w-[160px]">
        <span className="font-medium text-sm text-gray-900 truncate flex items-center gap-1 min-w-0">
          {candidate.isDuplicate && (
            <span
              title="Potential duplicate"
              aria-label="Potential duplicate"
              className="flex-shrink-0"
            >
              <TriangleAlert size={14} className="text-amber-500" />
            </span>
          )}
          <span className="truncate">{candidate.name}</span>
        </span>
      </td>

      {/* Role -- only shown in master view */}
      {showRoleColumn && (
        <td className="px-3 py-2.5 max-w-[140px]">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 truncate max-w-full">
            {roleName}
          </span>
        </td>
      )}

      {/* Email */}
      <td className="hidden lg:table-cell px-3 py-2.5">
        <span className="text-sm text-gray-500 truncate block max-w-[200px]">
          {candidate.email || <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Portfolio Link */}
      <td className="hidden xl:table-cell px-3 py-2.5">
        {candidate.portfolioUrl ? (
          <a
            href={candidate.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-[180px]"
            title={candidate.portfolioUrl}
          >
            {stripProtocol(candidate.portfolioUrl)}
          </a>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Phone/WhatsApp */}
      <td className="hidden xl:table-cell px-3 py-2.5">
        <span className="text-sm text-gray-500 tabular-nums">
          {candidate.phone || <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Instagram */}
      <td className="hidden lg:table-cell px-3 py-2.5">
        <span className="text-sm text-gray-500 truncate block max-w-[120px]">
          {instagramHandle || <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Status Badge */}
      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
        <StatusBadge candidateId={candidate.id} status={candidate.status} />
      </td>

      {/* Tier Badge */}
      <td
        className="hidden sm:table-cell px-3 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <TierBadge candidateId={candidate.id} tier={candidate.tier} />
      </td>

      {/* Rating — only show in drawer for now, not in table */}

      {/* Date Added */}
      <td className="hidden md:table-cell px-3 py-2.5 whitespace-nowrap">
        <span
          className="text-sm text-gray-400"
          title={new Date(candidate.createdAt).toLocaleString()}
        >
          {formatRelativeTime(candidate.createdAt)}
        </span>
      </td>
    </tr>
  );
}
