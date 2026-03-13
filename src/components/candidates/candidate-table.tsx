"use client";

import { useState } from "react";
import { CandidateRow } from "@/components/candidates/candidate-row";
import { CandidateAddRow } from "@/components/candidates/candidate-add-row";
import type { Candidate } from "@/types";

interface CandidateTableProps {
  candidates: Candidate[];
  total: number;
  roleId: string;
  currentPage: number;
  totalPages: number;
}

export function CandidateTable({
  candidates,
  total,
  roleId,
  currentPage,
  totalPages,
}: CandidateTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [showAddRow, setShowAddRow] = useState(false);

  const handleRowSelect = (candidate: Candidate) => {
    // Auto-dismiss add row when opening a candidate
    if (showAddRow) {
      setShowAddRow(false);
    }
    setSelectedCandidate(candidate);
  };

  const handleAddRowCancel = () => {
    setShowAddRow(false);
  };

  const handleAddClick = () => {
    // Dismiss any selected candidate when opening add row
    setSelectedCandidate(null);
    setShowAddRow(true);
  };

  const isEmpty = candidates.length === 0 && !showAddRow;

  return (
    <div className="flex flex-col gap-3">
      {/* Table header row with action button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-700">{candidates.length}</span>{" "}
          of <span className="font-medium text-gray-700">{total}</span>{" "}
          {total === 1 ? "candidate" : "candidates"}
        </p>
        <button
          onClick={handleAddClick}
          disabled={showAddRow}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          + Add Candidate
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Name
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Email
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Portfolio
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Phone
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Instagram
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tier
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Added
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Inline add row — shown at top when active */}
            {showAddRow && (
              <CandidateAddRow roleId={roleId} onCancel={handleAddRowCancel} />
            )}

            {/* Candidate rows */}
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                onSelect={handleRowSelect}
              />
            ))}

            {/* Empty state */}
            {isEmpty && (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg
                      className="h-10 w-10 text-gray-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-500">
                      No candidates yet
                    </p>
                    <p className="text-xs text-gray-400">
                      Click &ldquo;+ Add Candidate&rdquo; to add the first one.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination indicator — drawer integration comes in Plan 03 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Selected candidate drawer placeholder — integrated in Plan 03 */}
      {selectedCandidate && (
        <div className="sr-only" aria-live="polite">
          Selected: {selectedCandidate.name}
        </div>
      )}
    </div>
  );
}
