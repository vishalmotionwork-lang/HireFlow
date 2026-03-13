"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
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
import type { CandidateStatus, Candidate } from "@/types";

interface BulkActionBarProps {
  selectedCandidates: Candidate[];
  onClear: () => void;
  onDone: () => void;
}

export function BulkActionBar({
  selectedCandidates,
  onClear,
  onDone,
}: BulkActionBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  if (selectedCandidates.length === 0) return null;

  const handleBulkStatus = (newStatus: CandidateStatus) => {
    if (newStatus === "rejected") {
      setShowRejectionModal(true);
      return;
    }

    startTransition(async () => {
      await Promise.all(
        selectedCandidates.map((c) =>
          changeStatus(c.id, c.status, newStatus),
        ),
      );
      onDone();
    });
  };

  const handleBulkReject = (reason: string, message: string) => {
    setShowRejectionModal(false);
    startTransition(async () => {
      await Promise.all(
        selectedCandidates.map((c) =>
          changeStatus(c.id, c.status, "rejected", { reason, message }),
        ),
      );
      onDone();
    });
  };

  return (
    <>
      <div className="sticky bottom-0 z-20 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 shadow-sm">
        <span className="text-sm font-medium text-blue-700">
          {selectedCandidates.length} selected
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Updating..." : "Change Status"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[180px]">
            {CANDIDATE_STATUSES.map((s) => {
              const [bgClass] = STATUS_COLORS[s].split(" ");
              return (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleBulkStatus(s)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${bgClass}`}
                    aria-hidden="true"
                  />
                  {STATUS_LABELS[s]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={onClear}
          className="ml-auto rounded p-1 text-blue-400 hover:text-blue-600 transition-colors"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>

      {showRejectionModal && (
        <RejectionModal
          candidateId="bulk"
          candidateName={`${selectedCandidates.length} candidates`}
          onConfirm={handleBulkReject}
          onCancel={() => setShowRejectionModal(false)}
        />
      )}
    </>
  );
}
