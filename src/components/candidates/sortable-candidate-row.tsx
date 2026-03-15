"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { CandidateRow } from "@/components/candidates/candidate-row";
import type { Candidate } from "@/types";

interface SortableCandidateRowProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
  isChecked?: boolean;
  onCheckboxToggle?: (candidateId: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isMobile: boolean;
  onMoveUp?: (candidateId: string) => void;
  onMoveDown?: (candidateId: string) => void;
}

/**
 * Desktop drag handle -- 6-dot grip icon for dnd-kit sortable.
 */
function DragHandle({
  listeners,
  attributes,
}: {
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}) {
  return (
    <button
      className="flex items-center justify-center w-5 h-5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors touch-none"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={14} />
    </button>
  );
}

/**
 * Mobile reorder controls -- up/down arrow buttons.
 */
function MobileReorderControls({
  candidateId,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  candidateId: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp?: (candidateId: string) => void;
  onMoveDown?: (candidateId: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        disabled={isFirst}
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp?.(candidateId);
        }}
        className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-0.5"
        aria-label="Move up"
      >
        <ChevronUp size={12} />
      </button>
      <button
        disabled={isLast}
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown?.(candidateId);
        }}
        className="text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-0.5"
        aria-label="Move down"
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

export function SortableCandidateRow({
  candidate,
  onSelect,
  showRoleColumn = false,
  rolesMap = {},
  isChecked = false,
  onCheckboxToggle,
  isFirst,
  isLast,
  isMobile,
  onMoveUp,
  onMoveDown,
}: SortableCandidateRowProps) {
  // On mobile, skip dnd-kit sortable entirely
  if (isMobile) {
    return (
      <CandidateRow
        candidate={candidate}
        onSelect={onSelect}
        showRoleColumn={showRoleColumn}
        rolesMap={rolesMap}
        isChecked={isChecked}
        onCheckboxToggle={onCheckboxToggle}
        dragHandle={
          <MobileReorderControls
            candidateId={candidate.id}
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        }
      />
    );
  }

  return (
    <DesktopSortableRow
      candidate={candidate}
      onSelect={onSelect}
      showRoleColumn={showRoleColumn}
      rolesMap={rolesMap}
      isChecked={isChecked}
      onCheckboxToggle={onCheckboxToggle}
    />
  );
}

/**
 * Desktop-only sortable row that uses dnd-kit hooks.
 * Separated to ensure useSortable is only called inside SortableContext.
 */
function DesktopSortableRow({
  candidate,
  onSelect,
  showRoleColumn,
  rolesMap,
  isChecked,
  onCheckboxToggle,
}: {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
  isChecked?: boolean;
  onCheckboxToggle?: (candidateId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td colSpan={100} className="p-0">
        {/* Drop indicator: blue line when dragging over */}
        <table className="w-full text-left border-collapse">
          <tbody>
            <CandidateRow
              candidate={candidate}
              onSelect={onSelect}
              showRoleColumn={showRoleColumn}
              rolesMap={rolesMap}
              isChecked={isChecked}
              onCheckboxToggle={onCheckboxToggle}
              dragHandle={
                <DragHandle
                  listeners={listeners as unknown as Record<string, unknown>}
                  attributes={attributes as unknown as Record<string, unknown>}
                />
              }
            />
          </tbody>
        </table>
      </td>
    </tr>
  );
}
