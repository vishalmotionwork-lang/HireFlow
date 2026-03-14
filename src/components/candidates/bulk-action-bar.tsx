"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RejectionModal } from "@/components/candidates/rejection-modal";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { changeStatus, deleteCandidates } from "@/lib/actions/candidates";
import { CANDIDATE_STATUSES } from "@/types";
import type { CandidateStatus, Candidate } from "@/types";

/**
 * If the URL has an active status filter that would exclude the new status,
 * clear it so candidates remain visible after the bulk status change.
 */
function clearStatusFilterIfNeeded(
  newStatus: CandidateStatus,
  searchParams: URLSearchParams,
  pathname: string,
  router: ReturnType<typeof useRouter>,
) {
  const rawStatus = searchParams.get("status");
  if (!rawStatus) return;

  const activeStatuses = rawStatus.split(",").filter(Boolean);
  if (activeStatuses.length === 0) return;

  if (activeStatuses.includes(newStatus)) return;

  const params = new URLSearchParams(searchParams.toString());
  params.delete("status");
  params.delete("page");
  router.replace(`${pathname}?${params.toString()}`);
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (selectedCandidates.length === 0) return null;

  const handleBulkStatus = (newStatus: CandidateStatus) => {
    if (newStatus === "rejected") {
      setShowRejectionModal(true);
      return;
    }

    startTransition(async () => {
      await Promise.all(
        selectedCandidates.map((c) => changeStatus(c.id, c.status, newStatus)),
      );
      clearStatusFilterIfNeeded(newStatus, searchParams, pathname, router);
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
      clearStatusFilterIfNeeded("rejected", searchParams, pathname, router);
      onDone();
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      await deleteCandidates(selectedCandidates.map((c) => c.id));
      setConfirmDelete(false);
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

        {/* Delete button */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 font-medium">
              Delete {selectedCandidates.length}?
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}

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
