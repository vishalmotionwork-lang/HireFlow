"use client";

import { useState, useTransition, useEffect } from "react";
import { TriangleAlert, GitMerge, X } from "lucide-react";
import { MergeModal } from "@/components/candidates/merge-modal";
import type { Candidate } from "@/types";

interface DuplicateBannerProps {
  candidate: Candidate;
  onMerged: () => void;
}

interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  matchType: "email" | "phone" | "both";
}

export function DuplicateBanner({ candidate, onMerged }: DuplicateBannerProps) {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [showMerge, setShowMerge] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!candidate.isDuplicate) return;

    startTransition(async () => {
      const { checkDuplicatesAction } = await import(
        "@/lib/actions/candidates"
      );
      const result = await checkDuplicatesAction(candidate.id);
      if (result.length > 0) {
        setMatches(result);
      }
    });
  }, [candidate.id, candidate.isDuplicate]);

  if (!candidate.isDuplicate || dismissed || matches.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <TriangleAlert size={16} className="text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-700">
            Potential duplicate of{" "}
            <span className="font-semibold">{matches[0].candidateName}</span>
            {" "}({matches[0].matchType} match)
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMerge(true)}
            className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <GitMerge size={12} className="inline mr-1" />
            Merge
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-amber-400 hover:text-amber-600 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showMerge && (
        <MergeModal
          sourceCandidate={candidate}
          targetCandidateId={matches[0].candidateId}
          onClose={() => setShowMerge(false)}
          onMerged={onMerged}
        />
      )}
    </>
  );
}
