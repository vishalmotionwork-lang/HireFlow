"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import type { Candidate, Tier } from "@/types";

interface KanbanCardProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  isDragOverlay?: boolean;
}

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncateEmail(email: string | null, maxLen = 24): string {
  if (!email) return "";
  if (email.length <= maxLen) return email;
  return `${email.slice(0, maxLen)}...`;
}

export function KanbanCard({
  candidate,
  onSelect,
  isDragOverlay = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id,
    data: { candidate },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tierLabel = TIER_LABELS[candidate.tier as Tier];
  const tierColor = TIER_COLORS[candidate.tier as Tier];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(candidate)}
      className={cn(
        "group cursor-grab rounded-lg border border-gray-200 bg-white p-3 transition-shadow",
        "hover:border-gray-300 hover:shadow-sm",
        "active:cursor-grabbing",
        isDragging && !isDragOverlay && "opacity-30",
        isDragOverlay && "shadow-lg ring-2 ring-blue-200 rotate-[1deg]",
      )}
    >
      {/* Name */}
      <p className="text-sm font-medium text-gray-900 truncate">
        {candidate.name}
      </p>

      {/* Email */}
      {candidate.email && (
        <p className="mt-0.5 text-xs text-gray-400 truncate">
          {truncateEmail(candidate.email)}
        </p>
      )}

      {/* Bottom row: tier + time */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {candidate.tier && candidate.tier !== "untiered" ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              tierColor,
            )}
          >
            {tierLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-gray-400 whitespace-nowrap">
          {formatTimeAgo(candidate.updatedAt ?? candidate.createdAt)}
        </span>
      </div>
    </div>
  );
}

/**
 * Lightweight version rendered inside the DragOverlay (no sortable hooks).
 */
export function KanbanCardOverlay({ candidate }: { candidate: Candidate }) {
  const tierLabel = TIER_LABELS[candidate.tier as Tier];
  const tierColor = TIER_COLORS[candidate.tier as Tier];

  return (
    <div className="w-[220px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg ring-2 ring-blue-200 rotate-[1deg]">
      <p className="text-sm font-medium text-gray-900 truncate">
        {candidate.name}
      </p>
      {candidate.email && (
        <p className="mt-0.5 text-xs text-gray-400 truncate">
          {truncateEmail(candidate.email)}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {candidate.tier && candidate.tier !== "untiered" ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              tierColor,
            )}
          >
            {tierLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-gray-400 whitespace-nowrap">
          {formatTimeAgo(candidate.updatedAt ?? candidate.createdAt)}
        </span>
      </div>
    </div>
  );
}
