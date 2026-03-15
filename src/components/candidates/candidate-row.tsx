"use client";

import { ExternalLink, AtSign, Phone as PhoneIcon, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { formatRelativeTime } from "@/lib/utils/format-time";
import type { Candidate } from "@/types";

interface CandidateRowProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
  isChecked?: boolean;
  onCheckboxToggle?: (candidateId: string) => void;
  isDragOverlay?: boolean;
  dragHandle?: React.ReactNode;
}

/**
 * Extract the name part of an email: "harshit@gmail.com" → "harshit"
 */
function emailName(email: string): string {
  return email.split("@")[0] ?? email;
}

/**
 * Get a short domain label from a URL: "https://behance.net/john" → "behance.net"
 */
function shortDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return "Link";
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
    ? "border-b border-gray-100 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition-colors border-l-4 border-l-emerald-500"
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
      <td className="w-8 px-2 py-2">
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
      <td className="px-3 py-2 max-w-[150px]">
        <span className="font-medium text-sm text-gray-900 truncate flex items-center gap-1 min-w-0">
          {candidate.isDuplicate && (
            <TriangleAlert size={13} className="text-amber-500 flex-shrink-0" />
          )}
          <span className="truncate">{candidate.name}</span>
        </span>
      </td>

      {/* Role — only shown in master view */}
      {showRoleColumn && (
        <td className="px-2 py-2">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 truncate max-w-[100px]">
            {roleName}
          </span>
        </td>
      )}

      {/* Email — show name part only, full on hover */}
      <td className="hidden lg:table-cell px-2 py-2 max-w-[130px]">
        {candidate.email ? (
          <span
            className="text-sm text-gray-500 truncate block"
            title={candidate.email}
          >
            {emailName(candidate.email)}
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Portfolio — compact: domain name as clickable link */}
      <td className="hidden xl:table-cell px-2 py-2">
        {candidate.portfolioUrl ? (
          <a
            href={candidate.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            title={candidate.portfolioUrl}
          >
            <ExternalLink size={12} className="flex-shrink-0" />
            <span className="truncate max-w-[90px]">{shortDomain(candidate.portfolioUrl)}</span>
          </a>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Phone — compact with icon */}
      <td className="hidden xl:table-cell px-2 py-2">
        {candidate.phone ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 tabular-nums" title={candidate.phone}>
            <PhoneIcon size={11} className="text-gray-400 flex-shrink-0" />
            <span className="truncate max-w-[90px]">{candidate.phone}</span>
          </span>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Instagram — @ icon + handle, compact */}
      <td className="hidden lg:table-cell px-2 py-2">
        {candidate.instagram ? (
          <a
            href={`https://instagram.com/${candidate.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-xs text-gray-500 hover:text-pink-600"
            title={`@${candidate.instagram.replace("@", "")}`}
          >
            <AtSign size={12} className="flex-shrink-0" />
            <span className="truncate max-w-[70px]">{candidate.instagram.replace("@", "")}</span>
          </a>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Status Badge */}
      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <StatusBadge candidateId={candidate.id} status={candidate.status} />
      </td>

      {/* Tier Badge */}
      <td
        className="hidden sm:table-cell px-2 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <TierBadge candidateId={candidate.id} tier={candidate.tier} />
      </td>

      {/* Date Added */}
      <td className="hidden md:table-cell px-2 py-2 whitespace-nowrap">
        <span
          className="text-xs text-gray-400"
          title={new Date(candidate.createdAt).toLocaleString()}
        >
          {formatRelativeTime(candidate.createdAt)}
        </span>
      </td>
    </tr>
  );
}
