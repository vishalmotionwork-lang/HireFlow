"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { validateRows } from "@/lib/import/validateRows";
import { detectDuplicates, importCandidates } from "@/lib/actions/import";
import type { ImportRow } from "@/lib/actions/import";
import type { RawRow, ColumnMapping, ValidatedRow } from "@/lib/import/types";
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
}

// ---------------------------------------------------------------------------
// Helper: build initial decision for a row
// ---------------------------------------------------------------------------

function defaultDecision(
  isValid: boolean,
  hasDuplicate: boolean
): RowDecision {
  if (!isValid) return "skip";
  if (hasDuplicate) return "import"; // user must choose
  return "import";
}

// ---------------------------------------------------------------------------
// Step3Validate
// ---------------------------------------------------------------------------

interface Step3ValidateProps {
  rows: RawRow[];
  headers: string[];
  mapping: ColumnMapping;
  targetRoleId: string;
  roles: Role[];
  source: "excel" | "csv" | "paste";
  onImportComplete: (result: ImportResult) => void;
  onBack: () => void;
}

export function Step3Validate({
  rows,
  mapping,
  targetRoleId,
  roles,
  source,
  onImportComplete,
  onBack,
}: Step3ValidateProps) {
  const [enrichedRows, setEnrichedRows] = useState<EnrichedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // On mount: normalize → validate → detectDuplicates
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      setIsLoading(true);
      setLoadError(null);

      try {
        // 1. Normalize raw rows using the mapping
        const normalized = normalizeRows(rows, mapping);

        // 2. Validate each normalized row
        const validated = validateRows(normalized);

        // 3. Collect non-null emails and phones for duplicate check
        const emails = validated
          .map((r) => r.email)
          .filter((e): e is string => e !== null && e.trim() !== "");
        const phones = validated
          .map((r) => r.phone)
          .filter((p): p is string => p !== null && p.trim() !== "");

        // 4. Detect duplicates via server action
        const dupMap = await detectDuplicates(emails, phones);

        if (cancelled) return;

        // 5. Cross-reference each row with the duplicate map
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

          return {
            validated: row,
            duplicate,
            decision: defaultDecision(row.isValid, duplicate !== null),
          };
        });

        setEnrichedRows(enriched);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to validate rows";
        setLoadError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [rows, mapping]);

  // ---------------------------------------------------------------------------
  // Row decision handlers (immutable updates)
  // ---------------------------------------------------------------------------

  function handleDecisionChange(rowIndex: number, decision: RowDecision) {
    setEnrichedRows((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, decision } : r))
    );
  }

  function handleToggleInclude(rowIndex: number) {
    setEnrichedRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        return { ...r, decision: r.decision === "skip" ? "import" : "skip" };
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Summary counts
  // ---------------------------------------------------------------------------

  const readyCount = enrichedRows.filter(
    (r) => r.validated.isValid && !r.duplicate && r.decision === "import"
  ).length;
  const dupCount = enrichedRows.filter((r) => r.duplicate !== null).length;
  const invalidCount = enrichedRows.filter((r) => !r.validated.isValid).length;
  const skippedCount = enrichedRows.filter((r) => r.decision === "skip").length;
  const toImportCount = enrichedRows.filter(
    (r) => r.decision === "import" || r.decision === "merge"
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
          if (r.decision === "skip") {
            return {
              name: r.validated.name ?? "unknown",
              email: r.validated.email,
              phone: r.validated.phone,
              instagram: r.validated.instagram,
              portfolioUrl: r.validated.portfolioUrl,
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
              decision: "merge",
              mergeTargetId: r.duplicate.candidateId,
            };
          }

          return {
            name: r.validated.name ?? "",
            email: r.validated.email,
            phone: r.validated.phone,
            instagram: r.validated.instagram,
            portfolioUrl: r.validated.portfolioUrl,
            decision: "import",
          };
        });

      const result = await importCandidates(importRows, targetRoleId, source);

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
        <p className="text-sm text-gray-500">Validating rows and checking for duplicates...</p>
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
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Portfolio</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {enrichedRows.map((row, i) => {
              const { validated, duplicate, decision } = row;
              const isInvalid = !validated.isValid;
              const hasDuplicate = duplicate !== null;
              const firstError = validated.errors[0];

              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 last:border-0 transition-colors ${
                    isInvalid
                      ? "bg-red-50/40"
                      : hasDuplicate
                        ? "bg-amber-50/40"
                        : "bg-white"
                  } ${decision === "skip" && !isInvalid ? "opacity-50" : ""}`}
                >
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
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {validated.phone ?? (
                      <span className="text-gray-300">—</span>
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
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
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
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2">
                    {isInvalid ? (
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
            invalid{" "}
            <span className="text-gray-400">(will be skipped)</span>
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
