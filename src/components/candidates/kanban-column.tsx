"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanCard } from "@/components/candidates/kanban-card";
import type { Candidate } from "@/types";

interface KanbanColumnProps {
  id: string;
  label: string;
  colorDot: string;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  isCollapsed?: boolean;
}

export function KanbanColumn({
  id,
  label,
  colorDot,
  candidates,
  onSelectCandidate,
  isCollapsed = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const candidateIds = candidates.map((c) => c.id);

  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex w-[200px] shrink-0 flex-col rounded-lg bg-gray-50 border border-gray-200",
          isOver && "ring-2 ring-blue-300 bg-blue-50/30",
        )}
      >
        <SortableContext
          items={candidateIds}
          strategy={verticalListSortingStrategy}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
            <span className={cn("h-2 w-2 rounded-full", colorDot)} />
            <span className="text-xs font-semibold text-gray-600 truncate">
              {label}
            </span>
            <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">
              {candidates.length}
            </span>
          </div>

          {/* Collapsed body — show count only */}
          <div className="flex-1 px-3 py-3">
            {candidates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center">None</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectCandidate(c)}
                    className="text-left rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 truncate hover:bg-gray-50 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-lg bg-gray-50 border border-gray-200",
        isOver && "ring-2 ring-blue-300 bg-blue-50/30",
      )}
    >
      <SortableContext
        items={candidateIds}
        strategy={verticalListSortingStrategy}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
          <span className={cn("h-2 w-2 rounded-full", colorDot)} />
          <span className="text-xs font-semibold text-gray-600 truncate">
            {label}
          </span>
          <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">
            {candidates.length}
          </span>
        </div>

        {/* Cards area — scrollable */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-220px)]">
          {candidates.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <p className="text-xs text-gray-400">No candidates</p>
            </div>
          )}
          {candidates.map((candidate) => (
            <KanbanCard
              key={candidate.id}
              candidate={candidate}
              onSelect={onSelectCandidate}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
