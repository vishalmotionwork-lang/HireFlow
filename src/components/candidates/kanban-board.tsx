"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/candidates/kanban-column";
import { KanbanCardOverlay } from "@/components/candidates/kanban-card";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import { changeStatus } from "@/lib/actions/candidates";
import type { Candidate, CandidateStatus } from "@/types";

/**
 * Kanban column definitions in display order.
 * The rejected column aggregates `rejected` and `not_good` statuses.
 */
const KANBAN_COLUMNS: ReadonlyArray<{
  id: CandidateStatus;
  label: string;
  colorDot: string;
  statuses: readonly CandidateStatus[];
  collapsed?: boolean;
}> = [
  {
    id: "left_to_review",
    label: "Left to Review",
    colorDot: "bg-blue-400",
    statuses: ["left_to_review"],
  },
  {
    id: "under_review",
    label: "Under Review",
    colorDot: "bg-blue-500",
    statuses: ["under_review"],
  },
  {
    id: "shortlisted",
    label: "Shortlisted",
    colorDot: "bg-green-500",
    statuses: ["shortlisted"],
  },
  {
    id: "assignment_pending",
    label: "Assignment Pending",
    colorDot: "bg-purple-400",
    statuses: ["assignment_pending"],
  },
  {
    id: "assignment_sent",
    label: "Assignment Sent",
    colorDot: "bg-purple-500",
    statuses: ["assignment_sent"],
  },
  {
    id: "hired",
    label: "Hired",
    colorDot: "bg-emerald-500",
    statuses: ["hired"],
  },
  {
    id: "rejected",
    label: "Rejected",
    colorDot: "bg-red-400",
    statuses: ["rejected", "not_good", "assignment_failed"],
    collapsed: true,
  },
] as const;

interface KanbanBoardProps {
  candidates: Candidate[];
}

export function KanbanBoard({ candidates }: KanbanBoardProps) {
  const searchParams = useSearchParams();
  const candidateFromUrl = searchParams.get("candidate");

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    candidateFromUrl,
  );
  const [activeDragCandidate, setActiveDragCandidate] =
    useState<Candidate | null>(null);

  // Optimistic local state for instant column moves
  const [localCandidates, setLocalCandidates] =
    useState<Candidate[]>(candidates);

  // Sync with server data when candidates prop changes
  useEffect(() => {
    setLocalCandidates(candidates);
  }, [candidates]);

  // Open drawer when ?candidate= param changes
  useEffect(() => {
    if (candidateFromUrl) {
      setSelectedCandidateId(candidateFromUrl);
    }
  }, [candidateFromUrl]);

  // Group candidates into columns
  const columnData = useMemo(() => {
    const statusMap = new Map<string, Candidate[]>();

    // Initialize all columns
    for (const col of KANBAN_COLUMNS) {
      statusMap.set(col.id, []);
    }

    // Distribute candidates
    for (const candidate of localCandidates) {
      const column = KANBAN_COLUMNS.find((col) =>
        col.statuses.includes(candidate.status as CandidateStatus),
      );
      if (column) {
        const existing = statusMap.get(column.id) ?? [];
        statusMap.set(column.id, [...existing, candidate]);
      }
    }

    return statusMap;
  }, [localCandidates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const candidate = localCandidates.find((c) => c.id === event.active.id);
      setActiveDragCandidate(candidate ?? null);
    },
    [localCandidates],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragCandidate(null);

      const { active, over } = event;
      if (!over) return;

      const candidateId = active.id as string;
      const candidate = localCandidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      // Determine target column from the over ID
      // over.id could be a column ID or a card ID within a column
      let targetColumnId: string | null = null;

      // Check if over.id is a column
      const isColumn = KANBAN_COLUMNS.some((col) => col.id === over.id);
      if (isColumn) {
        targetColumnId = over.id as string;
      } else {
        // over.id is a card — find which column it belongs to
        const overCandidate = localCandidates.find((c) => c.id === over.id);
        if (overCandidate) {
          const col = KANBAN_COLUMNS.find((col) =>
            col.statuses.includes(overCandidate.status as CandidateStatus),
          );
          targetColumnId = col?.id ?? null;
        }
      }

      if (!targetColumnId) return;

      // Find target column definition
      const targetColumn = KANBAN_COLUMNS.find(
        (col) => col.id === targetColumnId,
      );
      if (!targetColumn) return;

      // Use the primary status (first in the statuses array) as the target
      const targetStatus = targetColumn.statuses[0];
      const fromStatus = candidate.status as CandidateStatus;

      // Skip if same status
      if (fromStatus === targetStatus) return;

      // Optimistic update — move candidate to new column immediately
      setLocalCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, status: targetStatus } : c,
        ),
      );

      // Fire server action
      const result = await changeStatus(candidateId, fromStatus, targetStatus);
      if ("error" in result) {
        // Revert on failure
        setLocalCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, status: fromStatus } : c,
          ),
        );
      }
    },
    [localCandidates],
  );

  const handleSelectCandidate = useCallback((candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              colorDot={column.colorDot}
              candidates={columnData.get(column.id) ?? []}
              onSelectCandidate={handleSelectCandidate}
              isCollapsed={column.collapsed}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragCandidate ? (
            <KanbanCardOverlay candidate={activeDragCandidate} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Candidate profile drawer */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
}
