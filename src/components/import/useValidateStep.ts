import { useState, useEffect } from "react";
import { toast } from "sonner";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { validateRows } from "@/lib/import/validateRows";
import { detectDuplicates } from "@/lib/actions/import";
import { createRoleFromData } from "@/lib/actions/roles";
import { validateImportWithAI } from "@/lib/ai/importValidator";
import type { ImportSuggestion } from "@/lib/ai/importValidator";
import type {
  RawRow,
  ColumnMapping,
  ValidatedRow,
  RoleMapping,
} from "@/lib/import/types";
import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duplicate info returned from the server action */
export interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  roleName: string;
  matchedOn: "email" | "phone";
}

/** Per-row user decision */
export type RowDecision = "import" | "merge" | "skip";

/** Row enriched with duplicate detection result and user decision */
export interface EnrichedRow {
  validated: ValidatedRow;
  duplicate: DuplicateMatch | null;
  decision: RowDecision;
  /** Resolved role ID for this row (from roleMapping or single targetRoleId) */
  resolvedRoleId: string | null;
  /** Display name for the resolved role */
  resolvedRoleName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
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
// Suggestion helpers (exported for use by components)
// ---------------------------------------------------------------------------

export function getSuggestionsForRow(
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

export function suggestionKey(s: ImportSuggestion): string {
  return `${s.rowIndex}-${s.field}-${s.issue}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseValidateStepParams {
  rows: RawRow[];
  mapping: ColumnMapping;
  targetRoleId: string;
  roleMapping: RoleMapping | null;
  roles: Role[];
}

export function useValidateStep({
  rows,
  mapping,
  targetRoleId,
  roleMapping,
  roles,
}: UseValidateStepParams) {
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
        const normalized = normalizeRows(rows, mapping);
        const validated = validateRows(normalized);

        let roleLookup: Record<
          string,
          { roleId: string | null; roleName: string | null; skipped: boolean }
        > = {};
        if (hasRoleMapping && roleMapping) {
          roleLookup = await resolveRoleMappingToIds(roleMapping, roles);
        }

        if (cancelled) return;

        const emails = validated
          .map((r) => r.email)
          .filter((e): e is string => e !== null && e.trim() !== "");
        const phones = validated
          .map((r) => r.phone)
          .filter((p): p is string => p !== null && p.trim() !== "");

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
            { description: "Review the highlighted rows below" },
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

  // ---------------------------------------------------------------------------
  // Summary counts
  // ---------------------------------------------------------------------------

  const allSelected =
    enrichedRows.length > 0 && selectedRows.size === enrichedRows.length;

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
  const skippedCount = enrichedRows.filter(
    (r) => r.decision === "skip",
  ).length;
  const toImportCount = enrichedRows.filter(
    (r) =>
      (r.decision === "import" || r.decision === "merge") && r.resolvedRoleId,
  ).length;
  const activeSuggestionCount = aiSuggestions.filter(
    (s) => !dismissedSuggestions.has(suggestionKey(s)),
  ).length;

  return {
    // State
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

    // Row handlers
    handleDecisionChange,
    handleToggleInclude,

    // AI handlers
    handleApplyFix,
    handleDismissSuggestion,

    // Selection handlers
    handleToggleSelect,
    handleSelectAll,
    handleDeleteSelected,
    handleSkipSelected,
    allSelected,

    // Counts
    readyCount,
    dupCount,
    invalidCount,
    roleSkippedCount,
    skippedCount,
    toImportCount,
    activeSuggestionCount,
  };
}
