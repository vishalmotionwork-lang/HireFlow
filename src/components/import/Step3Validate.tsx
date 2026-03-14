"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  X,
  Trash2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { validateRows } from "@/lib/import/validateRows";
import { detectDuplicates, importCandidates } from "@/lib/actions/import";
import { createRoleFromData } from "@/lib/actions/roles";
import { validateImportWithAI } from "@/lib/ai/importValidator";
import type { ImportSuggestion } from "@/lib/ai/importValidator";
import type { ImportRow } from "@/lib/actions/import";
import type {
  RawRow,
  ColumnMapping,
  ValidatedRow,
  RoleMapping,
} from "@/lib/import/types";
import type { Role } from "@/types";
import type { ImportResult } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duplicate info returned from the server action */
interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  roleName: string;
  matchedOn: "email" | "phone";
}

/** Per-row user decision */
type RowDecision = "import" | "merge" | "skip";

/** Row enriched with duplicate detection result and user decision */
interface EnrichedRow {
  validated: ValidatedRow;
  duplicate: DuplicateMatch | null;
  decision: RowDecision;
  /** Resolved role ID for this row (from roleMapping or single targetRoleId) */
  resolvedRoleId: string | null;
  /** Display name for the resolved role */
  resolvedRoleName: string | null;
}

// ---------------------------------------------------------------------------
// Helper: build initial decision for a row
// ---------------------------------------------------------------------------

function defaultDecision(
  isValid: boolean,
  hasDuplicate: boolean,
  isRoleSkipped: boolean = false,
): RowDecision {
  if (!isValid || isRoleSkipped) return "skip";
  if (hasDuplicate) return "import"; // user must choose
  return "import";
}

/**
 * Resolve role mapping entries to actual role IDs.
 * Creates new roles for "add" entries and returns a lookup from raw value (lowercase) to roleId.
 */
async function resolveRoleMappingToIds(
  roleMapping: RoleMapping,
  existingRoles: Role[],
): Promise<
  Record<
    string,
    { roleId: string | null; roleName: string | null; skipped: boolean }
  >
> {
  const result: Record<
    string,
    { roleId: string | null; roleName: string | null; skipped: boolean }
  > = {};

  for (const [key, entry] of Object.entries(roleMapping)) {
    if (entry.action === "skip") {
      result[key] = { roleId: null, roleName: null, skipped: true };
    } else if (entry.action === "map") {
      const role = existingRoles.find((r) => r.id === entry.targetRoleId);
      result[key] = {
        roleId: entry.targetRoleId ?? null,
        roleName: role?.name ?? "Unknown",
        skipped: false,
      };
    } else if (entry.action === "add") {
      const name = entry.newRoleName ?? key;
      const icon = entry.newRoleIcon ?? "Briefcase";
      const created = await createRoleFromData(name, icon);
      if (created) {
        result[key] = { roleId: created.id, roleName: name, skipped: false };
      } else {
        result[key] = { roleId: null, roleName: null, skipped: true };
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helper: get suggestions for a specific row index
// ---------------------------------------------------------------------------

function getSuggestionsForRow(
  rowIndex: number,
  suggestions: ImportSuggestion[],
  dismissed: ReadonlySet<string>,
): ImportSuggestion[] {
  return suggestions.filter(
    (s) =>
      s.rowIndex === rowIndex &&
      !dismissed.has(`${s.rowIndex}-${s.field}-${s.issue}`),
  );
}

function suggestionKey(s: ImportSuggestion): string {
  return `${s.rowIndex}-${s.field}-${s.issue}`;
}

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
  onImportComplete,
  onBack,
}: Step3ValidateProps) {
  const [enrichedRows, setEnrichedRows] = useState<EnrichedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // AI validation state
  const [aiSuggestions, setAiSuggestions] = useState<ImportSuggestion[]>([]);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());

  const hasRoleMapping =
    roleMapping !== null && Object.keys(roleMapping).length > 0;

  // ---------------------------------------------------------------------------
  // On mount: normalize -> validate -> detectDuplicates + AI validation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setIsLoading(true);
      setIsAiChecking(true);
      setLoadError(null);

      try {
        // 1. Normalize raw rows using the mapping
        const normalized = normalizeRows(rows, mapping);

        // 2. Validate each normalized row
        const validated = validateRows(normalized);

        // 3. Resolve role mapping if present (creates new roles as needed)
        let roleLookup: Record<
          string,
          { roleId: string | null; roleName: string | null; skipped: boolean }
        > = {};
        if (hasRoleMapping && roleMapping) {
          roleLookup = await resolveRoleMappingToIds(roleMapping, roles);
        }

        if (cancelled) return;

        // 4. Collect non-null emails and phones for duplicate check
        const emails = validated
          .map((r) => r.email)
          .filter((e): e is string => e !== null && e.trim() !== "");
        const phones = validated
          .map((r) => r.phone)
          .filter((p): p is string => p !== null && p.trim() !== "");

        // 5. Run duplicate detection AND AI validation in parallel
        const aiRows = validated.map((r) => ({
          rowIndex: r._rowIndex,
          name: r.name,
          email: r.email,
          phone: r.phone,
          instagram: r.instagram,
          portfolioUrl: r.portfolioUrl,
        }));

        const [dupMap, aiResults] = await Promise.all([
          detectDuplicates(emails, phones),
          validateImportWithAI(aiRows).catch(() => [] as ImportSuggestion[]),
        ]);

        if (cancelled) return;

        // 6. Cross-reference each row with the duplicate map + role resolution
        const enriched: EnrichedRow[] = validated.map((row) => {
          let duplicate: DuplicateMatch | null = null;

          if (row.email) {
            const emailKey = `email:${row.email.toLowerCase()}`;
            if (dupMap[emailKey]) {
              duplicate = dupMap[emailKey];
            }
          }

          if (!duplicate && row.phone) {
            const phoneKey = `phone:${row.phone}`;
            if (dupMap[phoneKey]) {
              duplicate = dupMap[phoneKey];
            }
          }

          // Resolve role for this row
          let resolvedRoleId: string | null = targetRoleId || null;
          let resolvedRoleName: string | null =
            roles.find((r) => r.id === targetRoleId)?.name ?? null;
          let isRoleSkipped = false;

          if (hasRoleMapping && row.role) {
            const key = row.role.toLowerCase();
            const resolved = roleLookup[key];
            if (resolved) {
              if (resolved.skipped) {
                isRoleSkipped = true;
                resolvedRoleId = null;
                resolvedRoleName = null;
              } else {
                resolvedRoleId = resolved.roleId;
                resolvedRoleName = resolved.roleName;
              }
            } else {
              isRoleSkipped = true;
              resolvedRoleId = null;
              resolvedRoleName = null;
            }
          }

          return {
            validated: row,
            duplicate,
            decision: defaultDecision(
              row.isValid,
              duplicate !== null,
              isRoleSkipped,
            ),
            resolvedRoleId,
            resolvedRoleName,
          };
        });

        setEnrichedRows(enriched);
        setAiSuggestions(aiResults);

        if (aiResults.length > 0) {
          toast.info(
            `AI found ${aiResults.length} suggestion${aiResults.length === 1 ? "" : "s"}`,
            {
              description: "Review the highlighted rows below",
            },
          );
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to validate rows";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsAiChecking(false);
        }
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [rows, mapping, targetRoleId, roleMapping, hasRoleMapping, roles]);

  // ---------------------------------------------------------------------------
  // Row decision handlers (immutable updates)
  // ---------------------------------------------------------------------------

  function handleDecisionChange(rowIndex: number, decision: RowDecision) {
    setEnrichedRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, decision } : r)),
    );
  }

  function handleToggleInclude(rowIndex: number) {
    setEnrichedRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        return { ...r, decision: r.decision === "skip" ? "import" : "skip" };
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // AI suggestion handlers (immutable updates)
  // ---------------------------------------------------------------------------

  function handleApplyFix(suggestion: ImportSuggestion) {
    if (!suggestion.fixedValue) return;

    const key = suggestionKey(suggestion);
    const field = suggestion.field as keyof ValidatedRow;

    setEnrichedRows((prev) =>
      prev.map((r) => {
        if (r.validated._rowIndex !== suggestion.rowIndex) return r;

        // Only apply to known string fields
        const updatableFields = [
          "name",
          "email",
          "phone",
          "instagram",
          "portfolioUrl",
          "linkedinUrl",
          "location",
          "experience",
          "resumeUrl",
        ] as const;
        if (
          !updatableFields.includes(field as (typeof updatableFields)[number])
        ) {
          return r;
        }

        return {
          ...r,
          validated: {
            ...r.validated,
            [field]: suggestion.fixedValue,
          },
        };
      }),
    );

    setAppliedFixes((prev) => new Set([...prev, key]));
    setDismissedSuggestions((prev) => new Set([...prev, key]));
    toast.success("Fix applied", { description: suggestion.suggestion });
  }

  function handleDismissSuggestion(suggestion: ImportSuggestion) {
    const key = suggestionKey(suggestion);
    setDismissedSuggestions((prev) => new Set([...prev, key]));
  }

  // ---------------------------------------------------------------------------
  // Row selection handlers (for bulk delete)
  // ---------------------------------------------------------------------------

  function handleToggleSelect(rowIndex: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedRows.size === enrichedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(enrichedRows.map((_, i) => i)));
    }
  }

  function handleDeleteSelected() {
    setEnrichedRows((prev) => prev.filter((_, i) => !selectedRows.has(i)));
    toast.success(
      `Removed ${selectedRows.size} row${selectedRows.size === 1 ? "" : "s"}`,
    );
    setSelectedRows(new Set());
  }

  function handleSkipSelected() {
    setEnrichedRows((prev) =>
      prev.map((r, i) =>
        selectedRows.has(i) ? { ...r, decision: "skip" as const } : r,
      ),
    );
    toast.success(
      `Skipped ${selectedRows.size} row${selectedRows.size === 1 ? "" : "s"}`,
    );
    setSelectedRows(new Set());
  }

  const allSelected =
    enrichedRows.length > 0 && selectedRows.size === enrichedRows.length;

  // ---------------------------------------------------------------------------
  // Summary counts
  // ---------------------------------------------------------------------------

  const readyCount = enrichedRows.filter(
    (r) =>
      r.validated.isValid &&
      !r.duplicate &&
      r.decision === "import" &&
      r.resolvedRoleId,
  ).length;
  const dupCount = enrichedRows.filter((r) => r.duplicate !== null).length;
  const invalidCount = enrichedRows.filter((r) => !r.validated.isValid).length;
  const roleSkippedCount = enrichedRows.filter(
    (r) => !r.resolvedRoleId && r.validated.isValid && hasRoleMapping,
  ).length;
  const skippedCount = enrichedRows.filter((r) => r.decision === "skip").length;
  const toImportCount = enrichedRows.filter(
    (r) =>
      (r.decision === "import" || r.decision === "merge") && r.resolvedRoleId,
  ).length;
  const activeSuggestionCount = aiSuggestions.filter(
    (s) => !dismissedSuggestions.has(suggestionKey(s)),
  ).length;

  // ---------------------------------------------------------------------------
  // Import handler
  // ---------------------------------------------------------------------------

  async function handleImport() {
    setIsImporting(true);

    try {
      const importRows: ImportRow[] = enrichedRows
        .filter((r) => r.decision !== "skip" || !r.validated.isValid)
        .map((r): ImportRow => {
          // Skip rows with no resolved role
          if (!r.resolvedRoleId) {
            return {
              name: r.validated.name ?? "unknown",
              email: r.validated.email,
              phone: r.validated.phone,
              instagram: r.validated.instagram,
              portfolioUrl: r.validated.portfolioUrl,
              linkedinUrl: r.validated.linkedinUrl,
              location: r.validated.location,
              experience: r.validated.experience,
              resumeUrl: r.validated.resumeUrl,
              decision: "skip",
            };
          }

          if (r.decision === "skip") {
            return {
              name: r.validated.name ?? "unknown",
              email: r.validated.email,
              phone: r.validated.phone,
              instagram: r.validated.instagram,
              portfolioUrl: r.validated.portfolioUrl,
              linkedinUrl: r.validated.linkedinUrl,
              location: r.validated.location,
              experience: r.validated.experience,
              resumeUrl: r.validated.resumeUrl,
              decision: "skip",
            };
          }

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
              decision: "merge",
              mergeTargetId: r.duplicate.candidateId,
              roleId: r.resolvedRoleId,
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
            decision: "import",
            roleId: r.resolvedRoleId,
          };
        });

      // Use first available roleId as the batch targetRoleId (for importBatch record)
      const batchRoleId =
        targetRoleId ||
        enrichedRows.find((r) => r.resolvedRoleId)?.resolvedRoleId ||
        "";

      const result = await importCandidates(importRows, batchRoleId, source);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      // Map server ImportResult to types.ts ImportResult shape
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
            {enrichedRows.map((row, i) => {
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
              const rowSuggestions = getSuggestionsForRow(
                validated._rowIndex,
                aiSuggestions,
                dismissedSuggestions,
              );
              const hasAiSuggestions = rowSuggestions.length > 0;

              return (
                <tr
                  key={i}
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
                      checked={selectedRows.has(i)}
                      onChange={() => handleToggleSelect(i)}
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
                      {rowSuggestions.map((s) => (
                        <div
                          key={suggestionKey(s)}
                          className="flex items-start gap-1.5 rounded border border-purple-200 bg-purple-50 px-2 py-1.5"
                        >
                          <Sparkles
                            size={11}
                            className="mt-0.5 shrink-0 text-purple-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-purple-700">
                              {s.suggestion}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              {s.fixedValue && (
                                <button
                                  onClick={() => handleApplyFix(s)}
                                  disabled={isImporting}
                                  className="rounded bg-purple-500 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                                >
                                  Apply fix
                                </button>
                              )}
                              <button
                                onClick={() => handleDismissSuggestion(s)}
                                disabled={isImporting}
                                className="flex items-center gap-0.5 rounded border border-purple-200 bg-white px-1.5 py-0.5 text-[10px] text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
                              >
                                <X size={9} />
                                Ignore
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                          handleDecisionChange(i, e.target.value as RowDecision)
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
                          onChange={() => handleToggleInclude(i)}
                          disabled={isImporting}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 disabled:opacity-50"
                        />
                        <span className="text-xs text-gray-600">Include</span>
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
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
