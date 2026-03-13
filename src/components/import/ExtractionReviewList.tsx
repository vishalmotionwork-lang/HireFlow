"use client";

import {
  getConfidenceLabel,
  getConfidenceColor,
} from "@/lib/ai/confidence";
import type { ExtractionDraft } from "@/types";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: "Ready",
      className: "bg-blue-50 text-blue-700",
    },
    failed: {
      label: "Failed",
      className: "bg-red-50 text-red-700",
    },
    applied: {
      label: "Applied",
      className: "bg-green-50 text-green-700",
    },
    reviewed: {
      label: "Skipped",
      className: "bg-gray-100 text-gray-500",
    },
    processing: {
      label: "Processing",
      className: "bg-amber-50 text-amber-700",
    },
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-500",
    },
  };

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ExtractionReviewList
// ---------------------------------------------------------------------------

export interface ExtractionReviewListProps {
  drafts: ExtractionDraft[];
  onSelectDraft: (draftId: string) => void;
  selectedDraftId: string | null;
}

export function ExtractionReviewList({
  drafts,
  onSelectDraft,
  selectedDraftId,
}: ExtractionReviewListProps) {
  const reviewable = drafts.filter(
    (d) => d.status === "completed" || d.status === "applied" || d.status === "reviewed",
  );
  const reviewed = drafts.filter(
    (d) => d.status === "applied" || d.status === "reviewed",
  );

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">
          {reviewed.length} of {reviewable.length} reviewed
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {drafts.length} total URL{drafts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Draft list */}
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {drafts.map((draft) => {
          const confidence =
            draft.overallConfidence !== null && draft.overallConfidence !== undefined
              ? draft.overallConfidence / 100
              : null;
          const isSelectable = draft.status === "completed";
          const isDone =
            draft.status === "applied" || draft.status === "reviewed";
          const isSelected = draft.id === selectedDraftId;
          const urlDisplay = draft.sourceUrl
            ? draft.sourceUrl.replace(/^https?:\/\//, "").slice(0, 48)
            : "Unknown URL";

          return (
            <li
              key={draft.id}
              onClick={() => isSelectable && onSelectDraft(draft.id)}
              className={[
                "flex flex-col gap-1.5 px-4 py-3 transition-colors",
                isSelectable
                  ? "cursor-pointer hover:bg-blue-50"
                  : "cursor-default",
                isSelected ? "bg-blue-50 border-l-2 border-blue-500 pl-3.5" : "",
                isDone ? "opacity-60" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* URL */}
              <p
                className="text-xs font-mono text-gray-700 truncate"
                title={draft.sourceUrl ?? ""}
              >
                {urlDisplay}
              </p>

              {/* Status + confidence */}
              <div className="flex items-center gap-2">
                <StatusBadge status={draft.status} />
                {confidence !== null && draft.status !== "failed" && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getConfidenceColor(confidence)}`}
                  >
                    {getConfidenceLabel(confidence)}
                  </span>
                )}
              </div>

              {/* Error message for failed drafts */}
              {draft.status === "failed" && draft.error && (
                <p className="text-xs text-red-500 truncate" title={draft.error}>
                  {draft.error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
