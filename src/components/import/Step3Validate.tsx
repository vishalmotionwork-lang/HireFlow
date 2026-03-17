"use client";

import { Loader2, Sparkles, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { importCandidates } from "@/lib/actions/import";
import type { ImportRow, ImportSourceInfo } from "@/lib/actions/import";
import {
  useValidateStep,
  getSuggestionsForRow,
} from "@/components/import/useValidateStep";
import { ValidateTableRow } from "@/components/import/ValidateTableRow";
import type { RawRow, ColumnMapping, RoleMapping } from "@/lib/import/types";
import type { Role } from "@/types";
import type { ImportResult } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// Step3Validate
// ---------------------------------------------------------------------------

interface Step3ValidateProps {
  rows: RawRow[];
  headers: string[];
  mapping: ColumnMapping;
  targetRoleId: string;
  roleMapping?: RoleMapping | null;
  roles: Role[];
  source: "excel" | "csv" | "paste";
  sourceInfo?: ImportSourceInfo;
  onImportComplete: (result: ImportResult) => void;
  onBack: () => void;
}

export function Step3Validate({
  rows,
  mapping,
  targetRoleId,
  roleMapping = null,
  roles,
  source,
  sourceInfo,
  onImportComplete,
  onBack,
}: Step3ValidateProps) {
  const {
    enrichedRows,
    isLoading,
    isImporting,
    setIsImporting,
    loadError,
    selectedRows,
    aiSuggestions,
    isAiChecking,
    dismissedSuggestions,
    appliedFixes,
    hasRoleMapping,
    handleDecisionChange,
    handleToggleInclude,
    handleApplyFix,
    handleDismissSuggestion,
    handleToggleSelect,
    handleSelectAll,
    handleDeleteSelected,
    handleSkipSelected,
    allSelected,
    readyCount,
    dupCount,
    invalidCount,
    roleSkippedCount,
    skippedCount,
    toImportCount,
    activeSuggestionCount,
  } = useValidateStep({
    rows,
    mapping,
    targetRoleId,
    roleMapping,
    roles,
  });

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  async function handleImport() {
    setIsImporting(true);

    try {
      const importRows: ImportRow[] = enrichedRows
        .filter(
          (r) =>
            r.decision !== "skip" && r.validated.isValid && r.resolvedRoleId,
        )
        .map((r): ImportRow => {
          if (r.decision === "merge" && r.duplicate) {
            return {
              name: r.validated.name ?? "",
              email: r.validated.email,
              phone: r.validated.phone,
              instagram: r.validated.instagram,
              portfolioUrl: r.validated.portfolioUrl,
              linkedinUrl: r.validated.linkedinUrl,
              location: r.validated.location,
              experience: r.validated.experience,
              resumeUrl: r.validated.resumeUrl,
              customFields: r.validated.customFields,
              reviewReasons: r.validated.errors.map((e) => e.message),
              decision: "merge",
              mergeTargetId: r.duplicate.candidateId,
              roleId: r.resolvedRoleId ?? undefined,
            };
          }

          return {
            name: r.validated.name ?? "",
            email: r.validated.email,
            phone: r.validated.phone,
            instagram: r.validated.instagram,
            portfolioUrl: r.validated.portfolioUrl,
            linkedinUrl: r.validated.linkedinUrl,
            location: r.validated.location,
            experience: r.validated.experience,
            resumeUrl: r.validated.resumeUrl,
            customFields: r.validated.customFields,
            reviewReasons: r.validated.errors.map((e) => e.message),
            decision: "import",
            roleId: r.resolvedRoleId ?? undefined,
          };
        });

      const batchRoleId =
        targetRoleId ||
        enrichedRows.find((r) => r.resolvedRoleId)?.resolvedRoleId ||
        "";

      const result = await importCandidates(
        importRows,
        batchRoleId,
        source,
        sourceInfo,
      );

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const importResult: ImportResult = {
        batchId: result.batchId,
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        mergedCount: result.mergedCount,
        duplicatesFound: result.duplicatesFound,
        totalRows: result.totalRows,
      };

      onImportComplete(importResult);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import failed. Please try again.";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">
          {hasRoleMapping
            ? "Creating roles, validating rows, and checking for duplicates..."
            : "Validating rows and checking for duplicates..."}
        </p>
        {isAiChecking && (
          <p className="flex items-center gap-1.5 text-xs text-purple-500">
            <Sparkles size={12} />
            AI checking data quality...
          </p>
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Validation failed</p>
        <p className="mt-1 text-xs text-red-500">{loadError}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render validation table
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* AI suggestions banner */}
      {activeSuggestionCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs text-purple-700">
          <Sparkles size={14} className="shrink-0 text-purple-500" />
          <span>
            AI found{" "}
            <span className="font-semibold">{activeSuggestionCount}</span> data
            quality {activeSuggestionCount === 1 ? "suggestion" : "suggestions"}
            . Review the highlighted rows below.
          </span>
          {appliedFixes.size > 0 && (
            <span className="ml-auto text-purple-500">
              {appliedFixes.size} fix{appliedFixes.size === 1 ? "" : "es"}{" "}
              applied
            </span>
          )}
        </div>
      )}

      {/* Selection action bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <span className="text-xs font-medium text-blue-700">
            {selectedRows.size} row{selectedRows.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSkipSelected}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <EyeOff size={12} />
              Skip selected
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Remove selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label="Select all rows"
                />
              </th>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Portfolio</th>
              {hasRoleMapping && <th className="px-3 py-2 text-left">Role</th>}
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row, i) => (
              <ValidateTableRow
                key={i}
                row={row}
                index={i}
                hasRoleMapping={hasRoleMapping}
                isSelected={selectedRows.has(i)}
                isImporting={isImporting}
                rowSuggestions={getSuggestionsForRow(
                  row.validated._rowIndex,
                  aiSuggestions,
                  dismissedSuggestions,
                )}
                onToggleSelect={handleToggleSelect}
                onDecisionChange={handleDecisionChange}
                onToggleInclude={handleToggleInclude}
                onApplyFix={handleApplyFix}
                onDismissSuggestion={handleDismissSuggestion}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <span>
          <span className="font-semibold text-green-600">{readyCount}</span>{" "}
          ready to import
        </span>
        {dupCount > 0 && (
          <span>
            <span className="font-semibold text-amber-600">{dupCount}</span>{" "}
            {dupCount === 1 ? "duplicate" : "duplicates"} found
          </span>
        )}
        {invalidCount > 0 && (
          <span>
            <span className="font-semibold text-red-500">{invalidCount}</span>{" "}
            invalid <span className="text-gray-400">(will be skipped)</span>
          </span>
        )}
        {roleSkippedCount > 0 && (
          <span>
            <span className="font-semibold text-gray-500">
              {roleSkippedCount}
            </span>{" "}
            role-skipped
          </span>
        )}
        {activeSuggestionCount > 0 && (
          <span>
            <span className="font-semibold text-purple-600">
              {activeSuggestionCount}
            </span>{" "}
            AI {activeSuggestionCount === 1 ? "suggestion" : "suggestions"}
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {skippedCount} will be skipped
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={isImporting}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>

        <button
          onClick={handleImport}
          disabled={isImporting || toImportCount === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Importing...
            </>
          ) : (
            `Import ${toImportCount} Candidate${toImportCount === 1 ? "" : "s"}`
          )}
        </button>
      </div>
    </div>
  );
}
