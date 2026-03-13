"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { detectMapping } from "@/lib/import/columnHeuristics";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { validateRows } from "@/lib/import/validateRows";
import { importCandidates } from "@/lib/actions/import";
import type { ImportRow } from "@/lib/actions/import";
import type { SheetData } from "@/lib/import/parseExcelMultiSheet";
import type { Role } from "@/types";
import type { ImportResult } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SheetRoleMapping {
  sheetName: string;
  roleId: string | null;
  rowCount: number;
  headers: string[];
}

interface SheetImportResult {
  sheetName: string;
  roleName: string;
  result: ImportResult | { error: string };
}

type ImportPhase = "mapping" | "importing" | "done";

// ---------------------------------------------------------------------------
// Fuzzy match sheet name to role name
// ---------------------------------------------------------------------------

function fuzzyMatchRole(sheetName: string, roles: Role[]): string | null {
  const normalized = sheetName.toLowerCase().trim();

  // Exact match first
  const exact = roles.find((r) => r.name.toLowerCase().trim() === normalized);
  if (exact) return exact.id;

  // Contains match (sheet name contains role name or vice versa)
  const contains = roles.find(
    (r) =>
      normalized.includes(r.name.toLowerCase().trim()) ||
      r.name.toLowerCase().trim().includes(normalized),
  );
  if (contains) return contains.id;

  // Word overlap match
  const sheetWords = new Set(normalized.split(/\s+/));
  let bestMatch: { role: Role; overlap: number } | null = null;

  for (const role of roles) {
    const roleWords = role.name.toLowerCase().trim().split(/\s+/);
    const overlap = roleWords.filter((w) => sheetWords.has(w)).length;
    if (overlap > 0 && (!bestMatch || overlap > bestMatch.overlap)) {
      bestMatch = { role, overlap };
    }
  }

  return bestMatch ? bestMatch.role.id : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StepMultiRoleImportProps {
  sheets: SheetData[];
  roles: Role[];
  onComplete: () => void;
  onBack: () => void;
}

export function StepMultiRoleImport({
  sheets,
  roles,
  onComplete,
  onBack,
}: StepMultiRoleImportProps) {
  const [phase, setPhase] = useState<ImportPhase>("mapping");
  const [results, setResults] = useState<SheetImportResult[]>([]);
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Initialize sheet-to-role mappings with fuzzy matching
  const [mappings, setMappings] = useState<SheetRoleMapping[]>(() =>
    sheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      roleId: fuzzyMatchRole(sheet.sheetName, roles),
      rowCount: sheet.rows.length,
      headers: sheet.headers,
    })),
  );

  const totalCandidates = useMemo(
    () => mappings.reduce((sum, m) => sum + m.rowCount, 0),
    [mappings],
  );

  const mappedCount = useMemo(
    () => mappings.filter((m) => m.roleId !== null).length,
    [mappings],
  );

  const handleRoleChange = (sheetName: string, roleId: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.sheetName === sheetName ? { ...m, roleId: roleId || null } : m,
      ),
    );
  };

  const handleImportAll = async () => {
    const sheetsToImport = mappings.filter((m) => m.roleId !== null);
    if (sheetsToImport.length === 0) {
      toast.error("Please map at least one sheet to a role.");
      return;
    }

    setPhase("importing");
    setProgress(0);

    const importResults: SheetImportResult[] = [];

    for (let i = 0; i < sheetsToImport.length; i++) {
      const mapping = sheetsToImport[i];
      const sheet = sheets.find((s) => s.sheetName === mapping.sheetName);
      const role = roles.find((r) => r.id === mapping.roleId);

      if (!sheet || !role || !mapping.roleId) continue;

      setCurrentSheet(mapping.sheetName);

      try {
        // Auto-detect column mapping from headers
        const columnMapping = detectMapping(sheet.headers);

        // Normalize rows using detected mapping
        const normalized = normalizeRows(sheet.rows, columnMapping);

        // Validate
        const validated = validateRows(normalized);

        // Build import rows (import all valid, skip invalid)
        const importRows: ImportRow[] = validated.map((row) => ({
          name: row.name ?? "Unknown",
          email: row.email ?? null,
          phone: row.phone ?? null,
          instagram: row.instagram ?? null,
          portfolioUrl: row.portfolioUrl ?? null,
          decision: row.isValid ? "import" : "skip",
        }));

        const result = await importCandidates(
          importRows,
          mapping.roleId,
          "excel",
        );

        importResults.push({
          sheetName: mapping.sheetName,
          roleName: role.name,
          result,
        });
      } catch (err) {
        importResults.push({
          sheetName: mapping.sheetName,
          roleName: role.name,
          result: {
            error: err instanceof Error ? err.message : "Unknown import error",
          },
        });
      }

      setProgress(((i + 1) / sheetsToImport.length) * 100);
    }

    setResults(importResults);
    setCurrentSheet(null);
    setPhase("done");
  };

  // ---------------------------------------------------------------------------
  // Render: Mapping phase
  // ---------------------------------------------------------------------------

  if (phase === "mapping") {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Multi-Role Import
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {sheets.length} sheets detected with {totalCandidates} total
            candidates. Map each sheet to a role.
          </p>
        </div>

        {/* Sheet-to-role mapping table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Sheet Name
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">
                  Rows
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <ArrowRight size={12} className="inline mr-1" />
                  Assign to Role
                </th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => {
                const isMatched = mapping.roleId !== null;
                return (
                  <tr
                    key={mapping.sheetName}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {mapping.sheetName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {mapping.rowCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping.roleId ?? ""}
                        onChange={(e) =>
                          handleRoleChange(mapping.sheetName, e.target.value)
                        }
                        className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 ${
                          isMatched
                            ? "border-green-200 bg-green-50/50 text-gray-900"
                            : "border-gray-200 bg-white text-gray-500"
                        }`}
                      >
                        <option value="">Skip this sheet</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isMatched ? (
                        <CheckCircle
                          size={16}
                          className="text-green-500 mx-auto"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500">
          {mappedCount} of {sheets.length} sheets mapped.
          {mappedCount < sheets.length &&
            ` ${sheets.length - mappedCount} will be skipped.`}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleImportAll}
            disabled={mappedCount === 0}
            className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import {mappedCount} Role{mappedCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Importing phase
  // ---------------------------------------------------------------------------

  if (phase === "importing") {
    return (
      <div className="space-y-5 py-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              Importing candidates…
            </p>
            {currentSheet && (
              <p className="text-xs text-gray-500 mt-1">
                Processing: {currentSheet}
              </p>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              {Math.round(progress)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Done phase
  // ---------------------------------------------------------------------------

  const totalImported = results.reduce((sum, r) => {
    if ("error" in r.result) return sum;
    return sum + r.result.importedCount;
  }, 0);

  const totalSkipped = results.reduce((sum, r) => {
    if ("error" in r.result) return sum + 0;
    return sum + r.result.skippedCount;
  }, 0);

  const failedSheets = results.filter((r) => "error" in r.result);

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div
        className={`rounded-lg border p-5 ${
          failedSheets.length === 0
            ? "border-green-200 bg-green-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p
          className={`text-sm font-semibold mb-2 ${
            failedSheets.length === 0 ? "text-green-800" : "text-amber-800"
          }`}
        >
          {failedSheets.length === 0
            ? "Import Complete!"
            : "Import completed with errors"}
        </p>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>
            <span className="font-medium">{totalImported}</span> candidates
            imported across {results.length - failedSheets.length} roles
          </li>
          {totalSkipped > 0 && (
            <li>
              <span className="font-medium">{totalSkipped}</span> rows skipped
              (invalid or duplicate)
            </li>
          )}
          {failedSheets.length > 0 && (
            <li className="text-red-600">
              {failedSheets.length} sheet
              {failedSheets.length !== 1 ? "s" : ""} failed
            </li>
          )}
        </ul>
      </div>

      {/* Per-sheet results */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                Sheet
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                Role
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                Imported
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                Skipped
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const res = r.result;
              if ("error" in res) {
                return (
                  <tr
                    key={r.sheetName}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {r.sheetName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{r.roleName}</td>
                    <td className="px-4 py-2.5 text-center">—</td>
                    <td className="px-4 py-2.5 text-center">—</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle size={12} />
                        Error
                      </span>
                    </td>
                  </tr>
                );
              }
              return (
                <tr
                  key={r.sheetName}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {r.sheetName}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{r.roleName}</td>
                  <td className="px-4 py-2.5 text-center">
                    {res.importedCount}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {res.skippedCount}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <CheckCircle size={14} className="text-green-500 mx-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error details */}
      {failedSheets.length > 0 && (
        <div className="space-y-2">
          {failedSheets.map((r) => (
            <div
              key={r.sheetName}
              className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700"
            >
              <span className="font-medium">{r.sheetName}:</span>{" "}
              {"error" in r.result ? r.result.error : "Unknown error"}
            </div>
          ))}
        </div>
      )}

      {/* Done button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onComplete}
          className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
