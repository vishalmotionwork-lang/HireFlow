"use client";

import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import type { Candidate } from "@/types";

interface CandidateRowProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
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
 * e.g. "https://behance.net/john" → "behance.net/john"
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

  return (
    <tr
      onClick={handleRowClick}
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* Name */}
      <td className="px-3 py-2.5 max-w-[160px]">
        <span className="font-medium text-sm text-gray-900 truncate block">
          {candidate.name}
        </span>
      </td>

      {/* Role — only shown in master view */}
      {showRoleColumn && (
        <td className="px-3 py-2.5 max-w-[140px]">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 truncate max-w-full">
            {roleName}
          </span>
        </td>
      )}

      {/* Email */}
      <td className="px-3 py-2.5 max-w-[180px]">
        <span className="text-sm text-gray-500 truncate block">
          {candidate.email ?? <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Portfolio Link */}
      <td className="px-3 py-2.5 max-w-[160px]">
        {candidate.portfolioUrl ? (
          <a
            href={candidate.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
            title={candidate.portfolioUrl}
          >
            {stripProtocol(candidate.portfolioUrl)}
          </a>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* Phone/WhatsApp */}
      <td className="px-3 py-2.5">
        <span className="text-sm text-gray-500">
          {candidate.phone ?? <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Instagram */}
      <td className="px-3 py-2.5">
        <span className="text-sm text-gray-500">
          {instagramHandle ?? <span className="text-gray-300">—</span>}
        </span>
      </td>

      {/* Status Badge */}
      <td className="px-3 py-2.5">
        <StatusBadge candidateId={candidate.id} status={candidate.status} />
      </td>

      {/* Tier Badge */}
      <td className="px-3 py-2.5">
        <TierBadge candidateId={candidate.id} tier={candidate.tier} />
      </td>

      {/* Date Added */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className="text-sm text-gray-400"
          title={new Date(candidate.createdAt).toLocaleString()}
        >
          {formatDate(candidate.createdAt)}
        </span>
      </td>
    </tr>
  );
}
