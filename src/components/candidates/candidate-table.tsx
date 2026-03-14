"use client";

import { useState, useCallback } from "react";
import { CandidateRow } from "@/components/candidates/candidate-row";
import { CandidateAddRow } from "@/components/candidates/candidate-add-row";
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import { BulkActionBar } from "@/components/candidates/bulk-action-bar";
import type { Candidate } from "@/types";

interface CandidateTableProps {
  candidates: Candidate[];
  total: number;
  roleId: string;
  currentPage: number;
  totalPages: number;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
}

export function CandidateTable({
  candidates,
  total,
  roleId,
  currentPage,
  totalPages,
  showRoleColumn = false,
  rolesMap = {},
}: CandidateTableProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [showAddRow, setShowAddRow] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleRowSelect = (candidate: Candidate) => {
    if (showAddRow) {
      setShowAddRow(false);
    }
    setSelectedCandidateId(candidate.id);
  };

  const handleAddRowCancel = () => {
    setShowAddRow(false);
  };

  const handleAddClick = () => {
    setSelectedCandidateId(null);
    setShowAddDialog(true);
  };

  const handleCheckboxToggle = useCallback((candidateId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  }, [candidates, selectedIds.size]);

  const selectedCandidates = candidates.filter((c) => selectedIds.has(c.id));
  const allSelected =
    candidates.length > 0 && selectedIds.size === candidates.length;

  const isEmpty = candidates.length === 0 && !showAddRow;
  const colCount = (showRoleColumn ? 9 : 8) + 1; // +1 for checkbox

  return (
    <div className="flex flex-col gap-3">
      {/* Action button */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleAddClick}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + Add Candidate
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all candidates"
                />
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Name
              </th>
              {showRoleColumn && (
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Role
                </th>
              )}
              <th className="hidden lg:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Email
              </th>
              <th className="hidden xl:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Portfolio
              </th>
              <th className="hidden xl:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Phone
              </th>
              <th className="hidden lg:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Instagram
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="hidden sm:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tier
              </th>
              <th className="hidden md:table-cell px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
                showRoleColumn={showRoleColumn}
                rolesMap={rolesMap}
                isChecked={selectedIds.has(candidate.id)}
                onCheckboxToggle={handleCheckboxToggle}
              />
            ))}

            {/* Empty state */}
            {isEmpty && (
              <tr>
                <td colSpan={colCount} className="px-6 py-16 text-center">
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

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCandidates={selectedCandidates}
        onClear={() => setSelectedIds(new Set())}
        onDone={() => setSelectedIds(new Set())}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Candidate profile drawer */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />

      {/* Add candidate dialog */}
      <AddCandidateDialog
        roleId={roleId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}
