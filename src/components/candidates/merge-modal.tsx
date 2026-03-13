"use client";

import { useState, useTransition, useEffect } from "react";
import { X, GitMerge } from "lucide-react";
import { fetchCandidateProfile } from "@/lib/actions/candidates";
import type { Candidate } from "@/types";

interface MergeModalProps {
  sourceCandidate: Candidate;
  targetCandidateId: string;
  onClose: () => void;
  onMerged: () => void;
}

function FieldRow({
  label,
  sourceValue,
  targetValue,
}: {
  label: string;
  sourceValue: string | null;
  targetValue: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm py-1">
      <span className="text-xs text-gray-400 self-center">{label}</span>
      <span className="text-gray-600 truncate">{sourceValue ?? "—"}</span>
      <span className="text-gray-600 truncate font-medium">
        {targetValue ?? sourceValue ?? "—"}
      </span>
    </div>
  );
}

export function MergeModal({
  sourceCandidate,
  targetCandidateId,
  onClose,
  onMerged,
}: MergeModalProps) {
  const [targetCandidate, setTargetCandidate] = useState<Candidate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const result = await fetchCandidateProfile(targetCandidateId);
      if (result) {
        setTargetCandidate(result.candidate);
      }
    });
  }, [targetCandidateId]);

  const handleMerge = () => {
    setIsMerging(true);
    startTransition(async () => {
      const { mergeCandidates } = await import("@/lib/actions/candidates");
      const result = await mergeCandidates(sourceCandidate.id, targetCandidateId);
      if ("success" in result) {
        onMerged();
        onClose();
      }
      setIsMerging(false);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <GitMerge size={16} className="text-blue-500" />
            Merge Candidates
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isPending || !targetCandidate ? (
          <div className="py-8 text-center animate-pulse">
            <div className="h-4 w-32 mx-auto rounded bg-gray-200" />
          </div>
        ) : (
          <>
            {/* Side-by-side comparison */}
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <span className="text-xs text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  Source (will be removed)
                </span>
                <span className="text-xs font-semibold text-blue-600 uppercase">
                  Target (kept)
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                <FieldRow
                  label="Name"
                  sourceValue={sourceCandidate.name}
                  targetValue={targetCandidate.name}
                />
                <FieldRow
                  label="Email"
                  sourceValue={sourceCandidate.email}
                  targetValue={targetCandidate.email}
                />
                <FieldRow
                  label="Phone"
                  sourceValue={sourceCandidate.phone}
                  targetValue={targetCandidate.phone}
                />
                <FieldRow
                  label="Instagram"
                  sourceValue={sourceCandidate.instagram}
                  targetValue={targetCandidate.instagram}
                />
                <FieldRow
                  label="Portfolio"
                  sourceValue={sourceCandidate.portfolioUrl}
                  targetValue={targetCandidate.portfolioUrl}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Merge will combine contact info (prefer non-null target), move
              comments and events to the target, and soft-delete the source.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Keep Separate
              </button>
              <button
                onClick={handleMerge}
                disabled={isMerging}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isMerging ? "Merging..." : "Merge"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
