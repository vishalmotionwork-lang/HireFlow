"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { ImportSuggestion } from "@/lib/ai/importValidator";
import { AiSuggestionPanel } from "@/components/import/AiSuggestionPanel";
import type { EnrichedRow, RowDecision } from "@/components/import/useValidateStep";

interface ValidateTableRowProps {
  row: EnrichedRow;
  index: number;
  hasRoleMapping: boolean;
  isSelected: boolean;
  isImporting: boolean;
  rowSuggestions: ImportSuggestion[];
  onToggleSelect: (rowIndex: number) => void;
  onDecisionChange: (rowIndex: number, decision: RowDecision) => void;
  onToggleInclude: (rowIndex: number) => void;
  onApplyFix: (suggestion: ImportSuggestion) => void;
  onDismissSuggestion: (suggestion: ImportSuggestion) => void;
}

export function ValidateTableRow({
  row,
  index,
  hasRoleMapping,
  isSelected,
  isImporting,
  rowSuggestions,
  onToggleSelect,
  onDecisionChange,
  onToggleInclude,
  onApplyFix,
  onDismissSuggestion,
}: ValidateTableRowProps) {
  const {
    validated,
    duplicate,
    decision,
    resolvedRoleId,
    resolvedRoleName,
  } = row;
  const isInvalid = !validated.isValid;
  const hasDuplicate = duplicate !== null;
  const isRoleSkipped =
    !resolvedRoleId && validated.isValid && hasRoleMapping;
  const firstError = validated.errors[0];
  const hasAiSuggestions = rowSuggestions.length > 0;

  return (
    <tr
      className={`border-b border-gray-100 last:border-0 transition-colors ${
        isInvalid || isRoleSkipped
          ? "bg-red-50/40"
          : hasDuplicate
            ? "bg-amber-50/40"
            : hasAiSuggestions
              ? "bg-purple-50/30"
              : "bg-white"
      } ${decision === "skip" && !isInvalid && !isRoleSkipped ? "opacity-50" : ""}`}
    >
      {/* Checkbox */}
      <td className="w-8 px-2 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(index)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select row ${validated._rowIndex + 1}`}
        />
      </td>

      {/* Row number */}
      <td className="px-3 py-2 text-xs text-gray-400">
        {validated._rowIndex + 1}
      </td>

      {/* Name */}
      <td className="px-3 py-2 text-xs font-medium text-gray-900 max-w-[140px] truncate">
        {validated.name ?? (
          <span className="italic text-red-400">missing</span>
        )}
      </td>

      {/* Email */}
      <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate">
        {validated.email ?? (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>

      {/* Phone */}
      <td className="px-3 py-2 text-xs text-gray-600">
        {validated.phone ?? (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>

      {/* Portfolio */}
      <td className="px-3 py-2 text-xs text-gray-600 max-w-[140px] truncate">
        {validated.portfolioUrl ? (
          <a
            href={validated.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {validated.portfolioUrl}
          </a>
        ) : (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>

      {/* Role (only when role mapping is active) */}
      {hasRoleMapping && (
        <td className="px-3 py-2 text-xs text-gray-600">
          {isRoleSkipped ? (
            <span className="italic text-gray-400">skipped</span>
          ) : (
            <span className="font-medium">
              {resolvedRoleName ?? (
                <span className="text-gray-300">&mdash;</span>
              )}
            </span>
          )}
        </td>
      )}

      {/* Status */}
      <td className="px-3 py-2">
        <div className="space-y-1.5">
          {isInvalid ? (
            <div className="flex items-start gap-1.5">
              <XCircle
                size={13}
                className="mt-0.5 shrink-0 text-red-500"
              />
              <span className="text-xs text-red-600">
                {firstError?.message ?? "Invalid"}
              </span>
            </div>
          ) : isRoleSkipped ? (
            <div className="flex items-start gap-1.5">
              <XCircle
                size={13}
                className="mt-0.5 shrink-0 text-gray-400"
              />
              <span className="text-xs text-gray-500">
                Role skipped
              </span>
            </div>
          ) : hasDuplicate ? (
            <div className="flex items-start gap-1.5">
              <AlertTriangle
                size={13}
                className="mt-0.5 shrink-0 text-amber-500"
              />
              <span className="text-xs text-amber-700">
                May already exist as{" "}
                <span className="font-semibold">
                  {duplicate.candidateName}
                </span>{" "}
                in {duplicate.roleName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-500" />
              <span className="text-xs text-green-700">Ready</span>
            </div>
          )}

          {/* AI suggestions inline */}
          <AiSuggestionPanel
            suggestions={rowSuggestions}
            isImporting={isImporting}
            onApplyFix={onApplyFix}
            onDismiss={onDismissSuggestion}
          />
        </div>
      </td>

      {/* Action */}
      <td className="px-3 py-2">
        {isInvalid || isRoleSkipped ? (
          <span className="text-xs italic text-gray-400">Skip</span>
        ) : hasDuplicate ? (
          <select
            value={decision}
            onChange={(e) =>
              onDecisionChange(index, e.target.value as RowDecision)
            }
            disabled={isImporting}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:opacity-50"
          >
            <option value="import">Import as new</option>
            <option value="merge">
              Merge with {duplicate.candidateName}
            </option>
            <option value="skip">Skip</option>
          </select>
        ) : (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={decision === "import"}
              onChange={() => onToggleInclude(index)}
              disabled={isImporting}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 disabled:opacity-50"
            />
            <span className="text-xs text-gray-600">Include</span>
          </label>
        )}
      </td>
    </tr>
  );
}
