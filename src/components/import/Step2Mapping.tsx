"use client";

import { useState, useEffect } from "react";
import { detectMapping } from "@/lib/import/columnHeuristics";
import type { RawRow, ColumnMapping, CandidateField } from "@/lib/import/types";
import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREVIEW_ROW_COUNT = 5;

/** Role-related keywords that suggest a column contains role information */
const ROLE_COLUMN_KEYWORDS = ["role", "position", "applied for", "job", "vacancy"];

const FIELD_LABELS: Record<Exclude<CandidateField, "ignore">, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  instagram: "Instagram",
  portfolioUrl: "Portfolio URL",
};

const FIELD_OPTIONS: { value: CandidateField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "instagram", label: "Instagram" },
  { value: "portfolioUrl", label: "Portfolio URL" },
  { value: "ignore", label: "Ignore" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given the current column mapping, return the CandidateField assigned to a
 * specific column index, or "ignore" if the column is not mapped.
 */
function getFieldForColumn(
  mapping: ColumnMapping,
  colIndex: number
): CandidateField {
  const entries = Object.entries(mapping) as [
    Exclude<CandidateField, "ignore">,
    number,
  ][];
  const entry = entries.find(([, idx]) => idx === colIndex);
  return entry ? entry[0] : "ignore";
}

/**
 * Update the mapping immutably:
 * - Assigns colIndex to the selected field
 * - Removes colIndex from any previously assigned field
 * - If field is "ignore", just removes the column from all assignments
 */
function updateMapping(
  prev: ColumnMapping,
  colIndex: number,
  field: CandidateField
): ColumnMapping {
  // Start by removing this colIndex from any existing assignment
  const cleaned = Object.fromEntries(
    (
      Object.entries(prev) as [Exclude<CandidateField, "ignore">, number][]
    ).filter(([, idx]) => idx !== colIndex)
  ) as ColumnMapping;

  if (field === "ignore") {
    return cleaned;
  }

  // Also remove the target field's previous column assignment (one field = one column)
  const withoutTargetField = Object.fromEntries(
    (Object.entries(cleaned) as [Exclude<CandidateField, "ignore">, number][]).filter(
      ([f]) => f !== field
    )
  ) as ColumnMapping;

  return { ...withoutTargetField, [field]: colIndex };
}

// ---------------------------------------------------------------------------
// Role keyword detection
// ---------------------------------------------------------------------------

function hasRoleColumn(headers: string[]): boolean {
  return headers.some((h) =>
    ROLE_COLUMN_KEYWORDS.some((kw) => h.toLowerCase().includes(kw))
  );
}

// ---------------------------------------------------------------------------
// Step2Mapping component
// ---------------------------------------------------------------------------

interface Step2MappingProps {
  headers: string[];
  rows: RawRow[];
  roles: Role[];
  onConfirm: (mapping: ColumnMapping, targetRoleId: string) => void;
  onBack: () => void;
}

export function Step2Mapping({
  headers,
  rows,
  roles,
  onConfirm,
  onBack,
}: Step2MappingProps) {
  // Auto-detect mapping on mount
  const [mapping, setMapping] = useState<ColumnMapping>(() =>
    detectMapping(headers)
  );

  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id ?? ""
  );

  // Preview: first 5 rows
  const previewRows = rows.slice(0, PREVIEW_ROW_COUNT);
  const showsRoleColumnNote = hasRoleColumn(headers);
  const isNameMapped = mapping.name !== undefined;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFieldChange = (colIndex: number, field: CandidateField) => {
    setMapping((prev) => updateMapping(prev, colIndex, field));
  };

  const handleConfirm = () => {
    if (!isNameMapped || !selectedRoleId) return;
    onConfirm(mapping, selectedRoleId);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="role-select"
            className="block text-sm font-medium text-gray-700"
          >
            Target Role
          </label>
          <p className="text-xs text-gray-400">
            All imported candidates will be added to this role.
          </p>
        </div>
        <select
          id="role-select"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Role column note */}
      {showsRoleColumnNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700">
            A &ldquo;role&rdquo; or &ldquo;position&rdquo; column was detected in your file.
            Assigning candidates to multiple roles from a single import is not yet supported
            — all rows will be assigned to the selected role above.
          </p>
        </div>
      )}

      {/* Column mapping */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Column Mapping</h3>
        <p className="text-xs text-gray-400">
          Map each column to a candidate field. Unmapped columns will be ignored.
        </p>

        {/* Mapping dropdowns + preview table combined */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              {/* Mapping row */}
              <tr className="border-b border-gray-200 bg-gray-50">
                {headers.map((header, colIndex) => (
                  <th
                    key={colIndex}
                    className="px-3 py-2 text-left font-normal"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600 truncate max-w-[140px]">
                        {header || `Column ${colIndex + 1}`}
                      </div>
                      <select
                        value={getFieldForColumn(mapping, colIndex)}
                        onChange={(e) =>
                          handleFieldChange(colIndex, e.target.value as CandidateField)
                        }
                        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-gray-100 last:border-0 ${
                    rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  {headers.map((_, colIndex) => {
                    const cellValue = row[colIndex];
                    const displayValue =
                      cellValue !== undefined && cellValue !== null
                        ? String(cellValue)
                        : "";
                    return (
                      <td
                        key={colIndex}
                        className="px-3 py-2 text-xs text-gray-600 truncate max-w-[160px]"
                        title={displayValue}
                      >
                        {displayValue || (
                          <span className="text-gray-300 italic">empty</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length > PREVIEW_ROW_COUNT && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-3 py-2 text-center text-xs text-gray-400 bg-gray-50/50"
                  >
                    + {rows.length - PREVIEW_ROW_COUNT} more rows not shown
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Name required warning */}
      {!isNameMapped && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Name column is required.</span> Please map at
            least one column to &ldquo;Name&rdquo; to continue.
          </p>
        </div>
      )}

      {/* Row count summary */}
      <p className="text-xs text-gray-400">
        {rows.length} {rows.length === 1 ? "row" : "rows"} will be imported.
        Showing preview of first {Math.min(PREVIEW_ROW_COUNT, rows.length)}.
      </p>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isNameMapped || !selectedRoleId}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Validate
        </button>
      </div>
    </div>
  );
}
