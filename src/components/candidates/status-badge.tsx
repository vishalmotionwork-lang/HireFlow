"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RejectionModal } from "@/components/candidates/rejection-modal";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { changeStatus } from "@/lib/actions/candidates";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus } from "@/types";

interface StatusBadgeProps {
  candidateId: string;
  status: CandidateStatus;
  candidateName?: string;
}

export function StatusBadge({ candidateId, status, candidateName }: StatusBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleSelect = (newStatus: CandidateStatus) => {
    if (newStatus === status) return;

    // Intercept rejection — show modal instead of direct save
    if (newStatus === "rejected") {
      setShowRejectionModal(true);
      return;
    }

    startTransition(async () => {
      await changeStatus(candidateId, status, newStatus);
    });
  };

  const handleReject = (reason: string, message: string) => {
    setShowRejectionModal(false);
    startTransition(async () => {
      await changeStatus(candidateId, status, "rejected", { reason, message });
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer focus:outline-none"
          aria-label={`Status: ${STATUS_LABELS[status]}. Click to change.`}
        >
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${STATUS_COLORS[status]} ${isPending ? "opacity-50" : ""}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="min-w-[180px]"
        >
          {CANDIDATE_STATUSES.map((s) => {
            const [bgClass] = STATUS_COLORS[s].split(" ");
            return (
              <DropdownMenuItem
                key={s}
                onClick={() => handleSelect(s)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${bgClass}`}
                  aria-hidden="true"
                />
                <span className={s === status ? "font-semibold" : ""}>
                  {STATUS_LABELS[s]}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {showRejectionModal && (
        <RejectionModal
          candidateId={candidateId}
          candidateName={candidateName ?? "this candidate"}
          onConfirm={handleReject}
          onCancel={() => setShowRejectionModal(false)}
        />
      )}
    </>
  );
}
