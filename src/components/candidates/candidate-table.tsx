"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CandidateRow } from "@/components/candidates/candidate-row";
import { SortableCandidateRow } from "@/components/candidates/sortable-candidate-row";
import { CandidateAddRow } from "@/components/candidates/candidate-add-row";
import { AddCandidateDialog } from "@/components/candidates/add-candidate-dialog";
import { CandidateModal } from "@/components/candidates/candidate-modal";
import { WhatsAppMessageModal } from "@/components/candidates/whatsapp-message-modal";
import { BulkActionBar } from "@/components/candidates/bulk-action-bar";
import { CvCreateCandidate } from "@/components/candidates/cv-create-candidate";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { reorderCandidates } from "@/lib/actions/candidates";
import type { Candidate } from "@/types";

interface CandidateTableProps {
  candidates: Candidate[];
  total: number;
  roleId: string;
  roleName?: string;
  currentPage: number;
  totalPages: number;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
}

export function CandidateTable({
  candidates: serverCandidates,
  total,
  roleId,
  roleName,
  currentPage,
  totalPages,
  showRoleColumn = false,
  rolesMap = {},
}: CandidateTableProps) {
  const searchParams = useSearchParams();
  const candidateFromUrl = searchParams.get("candidate");

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    candidateFromUrl,
  );
  const [showAddRow, setShowAddRow] = useState(false);

  // Open drawer when ?candidate= param changes (e.g. from notification link)
  useEffect(() => {
    if (candidateFromUrl) {
      setSelectedCandidateId(candidateFromUrl);
    }
  }, [candidateFromUrl]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [whatsappCandidate, setWhatsappCandidate] = useState<Candidate | null>(
    null,
  );
  const [cvUploadOpen, setCvUploadOpen] = useState(false);

  // Drag-and-drop: local optimistic ordering
  const [orderedCandidates, setOrderedCandidates] = useState(serverCandidates);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Sync with server data when it changes
  useEffect(() => {
    setOrderedCandidates(serverCandidates);
  }, [serverCandidates]);

  // Detect mobile for disabling drag
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const candidates = orderedCandidates;
  const candidateIds = useMemo(() => candidates.map((c) => c.id), [candidates]);

  // DnD sensors with activation constraint to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = candidates.findIndex((c) => c.id === active.id);
      const newIndex = candidates.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistic update
      const reordered = arrayMove(candidates, oldIndex, newIndex);
      setOrderedCandidates(reordered);

      // Persist to server
      const newOrderedIds = reordered.map((c) => c.id);
      await reorderCandidates(newOrderedIds);
    },
    [candidates],
  );

  // Mobile reorder: move up/down
  const handleMoveUp = useCallback(
    async (candidateId: string) => {
      const index = candidates.findIndex((c) => c.id === candidateId);
      if (index <= 0) return;
      const reordered = arrayMove(candidates, index, index - 1);
      setOrderedCandidates(reordered);
      await reorderCandidates(reordered.map((c) => c.id));
    },
    [candidates],
  );

  const handleMoveDown = useCallback(
    async (candidateId: string) => {
      const index = candidates.findIndex((c) => c.id === candidateId);
      if (index === -1 || index >= candidates.length - 1) return;
      const reordered = arrayMove(candidates, index, index + 1);
      setOrderedCandidates(reordered);
      await reorderCandidates(reordered.map((c) => c.id));
    },
    [candidates],
  );

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
  const colCount = showRoleColumn ? 8 : 7; // checkbox+drag, name, [role], email, phone, links, status, tier

  const activeDragCandidate = activeDragId
    ? (candidates.find((c) => c.id === activeDragId) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Action button */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Add Candidate
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleAddClick}>
              Add Manually
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCvUploadOpen(true)}>
              Upload CV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table
            className="w-full text-left border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "17%" }} />
              {showRoleColumn && <col style={{ width: "10%" }} />}
              <col
                className="hidden lg:table-column"
                style={{ width: "16%" }}
              />
              <col style={{ width: "13%" }} />
              <col
                className="hidden md:table-column"
                style={{ width: "17%" }}
              />
              <col style={{ width: "10%" }} />
              <col className="hidden sm:table-column" style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="pl-2 pr-1 py-1.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-3.5"
                    aria-label="Select all candidates"
                  />
                </th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                {showRoleColumn && (
                  <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Role
                  </th>
                )}
                <th className="hidden lg:table-cell px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Phone
                </th>
                <th className="hidden md:table-cell px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Portfolio
                </th>
                <th className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="hidden sm:table-cell px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Inline add row -- shown at top when active */}
              {showAddRow && (
                <CandidateAddRow
                  roleId={roleId}
                  onCancel={handleAddRowCancel}
                />
              )}

              {/* Candidate rows with sortable context */}
              {!isMobile ? (
                <SortableContext
                  items={candidateIds}
                  strategy={verticalListSortingStrategy}
                >
                  {candidates.map((candidate, index) => (
                    <SortableCandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      onSelect={handleRowSelect}
                      showRoleColumn={showRoleColumn}
                      rolesMap={rolesMap}
                      isChecked={selectedIds.has(candidate.id)}
                      onCheckboxToggle={handleCheckboxToggle}
                      isFirst={index === 0}
                      isLast={index === candidates.length - 1}
                      isMobile={false}
                      onWhatsAppClick={setWhatsappCandidate}
                    />
                  ))}
                </SortableContext>
              ) : (
                candidates.map((candidate, index) => (
                  <SortableCandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    onSelect={handleRowSelect}
                    showRoleColumn={showRoleColumn}
                    rolesMap={rolesMap}
                    isChecked={selectedIds.has(candidate.id)}
                    onCheckboxToggle={handleCheckboxToggle}
                    isFirst={index === 0}
                    isLast={index === candidates.length - 1}
                    isMobile={true}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onWhatsAppClick={setWhatsappCandidate}
                  />
                ))
              )}

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
                        Click &ldquo;+ Add Candidate&rdquo; to add the first
                        one.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Drag overlay -- shows elevated row preview */}
          <DragOverlay>
            {activeDragCandidate ? (
              <table className="w-full text-left border-collapse">
                <tbody>
                  <CandidateRow
                    candidate={activeDragCandidate}
                    onSelect={() => {}}
                    showRoleColumn={showRoleColumn}
                    rolesMap={rolesMap}
                    isChecked={selectedIds.has(activeDragCandidate.id)}
                    onCheckboxToggle={() => {}}
                    isDragOverlay
                  />
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
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

      {/* Candidate profile modal */}
      <CandidateModal
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />

      {/* Add candidate dialog */}
      <AddCandidateDialog
        roleId={roleId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* WhatsApp message modal -- triggered from row phone icon */}
      <WhatsAppMessageModal
        open={whatsappCandidate !== null}
        onClose={() => setWhatsappCandidate(null)}
        candidateName={whatsappCandidate?.name ?? ""}
        phone={whatsappCandidate?.phone ?? ""}
        roleName={null}
      />

      {/* CV upload dialog */}
      <CvCreateCandidate
        roleId={roleId}
        roleName={roleName}
        open={cvUploadOpen}
        onOpenChange={setCvUploadOpen}
      />
    </div>
  );
}
