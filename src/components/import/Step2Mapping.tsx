"use client";

import { useState, useMemo } from "react";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { detectMapping } from "@/lib/import/columnHeuristics";
import { ROLE_EMOJI_ICONS } from "@/lib/constants";
import type {
  RawRow,
  ColumnMapping,
  CandidateField,
  RoleMapping,
  RoleMappingEntry,
} from "@/lib/import/types";
import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_PREVIEW_COUNT = 5;

const FIELD_LABELS: Record<Exclude<CandidateField, "ignore">, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  instagram: "Instagram",
  portfolioUrl: "Portfolio URL",
  linkedinUrl: "LinkedIn URL",
  location: "Location",
  experience: "Experience",
  resumeUrl: "Resume/CV Link",
  role: "Role",
};

const FIELD_OPTIONS: { value: CandidateField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "instagram", label: "Instagram" },
  { value: "portfolioUrl", label: "Portfolio URL" },
  { value: "linkedinUrl", label: "LinkedIn URL" },
  { value: "location", label: "Location" },
  { value: "experience", label: "Experience" },
  { value: "resumeUrl", label: "Resume/CV Link" },
  { value: "role", label: "Role" },
  { value: "ignore", label: "Ignore" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFieldForColumn(
  mapping: ColumnMapping,
  colIndex: number,
): CandidateField {
  const entries = Object.entries(mapping) as [
    Exclude<CandidateField, "ignore">,
    number,
  ][];
  const entry = entries.find(([, idx]) => idx === colIndex);
  return entry ? entry[0] : "ignore";
}

function updateMapping(
  prev: ColumnMapping,
  colIndex: number,
  field: CandidateField,
): ColumnMapping {
  const cleaned = Object.fromEntries(
    (
      Object.entries(prev) as [Exclude<CandidateField, "ignore">, number][]
    ).filter(([, idx]) => idx !== colIndex),
  ) as ColumnMapping;

  if (field === "ignore") {
    return cleaned;
  }

  const withoutTargetField = Object.fromEntries(
    (
      Object.entries(cleaned) as [Exclude<CandidateField, "ignore">, number][]
    ).filter(([f]) => f !== field),
  ) as ColumnMapping;

  return { ...withoutTargetField, [field]: colIndex };
}

function extractUniqueRoles(rows: RawRow[], colIndex: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const row of rows) {
    const val = row[colIndex];
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str === "") continue;
    const key = str.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(str);
    }
  }

  return result;
}

function findMatchingRole(rawValue: string, roles: Role[]): Role | null {
  const lower = rawValue.toLowerCase();
  return (
    roles.find((r) => r.name.toLowerCase() === lower) ??
    roles.find(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        lower.includes(r.name.toLowerCase()),
    ) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Step2Mapping component
// ---------------------------------------------------------------------------

interface Step2MappingProps {
  headers: string[];
  rows: RawRow[];
  roles: Role[];
  aiMapping?: Record<number, string> | null;
  onConfirm: (
    mapping: ColumnMapping,
    targetRoleId: string,
    roleMapping?: RoleMapping,
  ) => void;
  onBack: () => void;
}

export function Step2Mapping({
  headers,
  rows,
  roles,
  aiMapping = null,
  onConfirm,
  onBack,
}: Step2MappingProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    // Use AI mapping if available, otherwise fall back to heuristics
    if (aiMapping && Object.keys(aiMapping).length > 0) {
      const converted: ColumnMapping = {};
      const validFields = [
        "name",
        "email",
        "phone",
        "instagram",
        "portfolioUrl",
        "linkedinUrl",
        "location",
        "experience",
        "resumeUrl",
        "role",
      ];
      for (const [idx, field] of Object.entries(aiMapping)) {
        if (validFields.includes(field)) {
          const key = field as Exclude<CandidateField, "ignore">;
          converted[key] = parseInt(idx, 10);
        }
      }
      return converted;
    }
    return detectMapping(headers);
  });
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roles[0]?.id ?? "",
  );
  const [roleMapping, setRoleMapping] = useState<RoleMapping>({});
  const [showIgnored, setShowIgnored] = useState(false);
  const [previewCount, setPreviewCount] = useState(INITIAL_PREVIEW_COUNT);

  const isNameMapped = mapping.name !== undefined;
  const isRoleMapped = mapping.role !== undefined;

  // Separate mapped vs ignored columns
  const mappedColumns = useMemo(() => {
    return headers
      .map((header, index) => ({
        header,
        index,
        field: getFieldForColumn(mapping, index),
      }))
      .filter((col) => col.field !== "ignore");
  }, [headers, mapping]);

  const ignoredColumns = useMemo(() => {
    return headers
      .map((header, index) => ({
        header,
        index,
        field: getFieldForColumn(mapping, index),
      }))
      .filter((col) => col.field === "ignore");
  }, [headers, mapping]);

  // Preview rows
  const previewRows = rows.slice(0, previewCount);
  const hasMoreRows = rows.length > previewCount;

  // Role detection
  const uniqueRoles = useMemo(() => {
    if (mapping.role === undefined) return [];
    return extractUniqueRoles(rows, mapping.role);
  }, [rows, mapping.role]);

  useMemo(() => {
    if (uniqueRoles.length === 0) {
      setRoleMapping({});
      return;
    }
    const initial: RoleMapping = {};
    for (const rawValue of uniqueRoles) {
      const key = rawValue.toLowerCase();
      const match = findMatchingRole(rawValue, roles);
      if (match) {
        initial[key] = { action: "map", targetRoleId: match.id };
      } else {
        initial[key] = {
          action: "add",
          newRoleName: rawValue,
          newRoleIcon: "Briefcase",
        };
      }
    }
    setRoleMapping(initial);
  }, [uniqueRoles, roles]);

  const handleFieldChange = (colIndex: number, field: CandidateField) => {
    setMapping((prev) => updateMapping(prev, colIndex, field));
  };

  const handleRoleMappingChange = (key: string, entry: RoleMappingEntry) => {
    setRoleMapping((prev) => ({ ...prev, [key]: entry }));
  };

  const handleConfirm = () => {
    if (!isNameMapped) return;
    if (isRoleMapped) {
      const allValid = uniqueRoles.every((rv) => {
        const entry = roleMapping[rv.toLowerCase()];
        if (!entry) return false;
        if (entry.action === "map") return !!entry.targetRoleId;
        if (entry.action === "add")
          return !!entry.newRoleName && !!entry.newRoleIcon;
        return true;
      });
      if (!allValid) return;
      onConfirm(mapping, "", roleMapping);
    } else {
      if (!selectedRoleId) return;
      onConfirm(mapping, selectedRoleId);
    }
  };

  const canConfirm = isNameMapped && (isRoleMapped || !!selectedRoleId);

  return (
    <div className="space-y-5">
      {/* Single role selector — only when no role column is mapped */}
      {!isRoleMapped && (
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
      )}

      {/* Column mapping — vertical card layout (no horizontal scroll) */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Column Mapping</h3>
        <p className="text-xs text-gray-400">
          Map each column to a candidate field. Unmapped columns will be
          ignored.
        </p>

        {/* Mapped columns as cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {headers.map((header, colIndex) => {
            const currentField = getFieldForColumn(mapping, colIndex);
            const isMapped = currentField !== "ignore";
            const sampleValues = rows
              .slice(0, 3)
              .map((r) => {
                const v = r[colIndex];
                return v !== undefined && v !== null ? String(v) : "";
              })
              .filter(Boolean);

            return (
              <div
                key={colIndex}
                className={`rounded-lg border p-3 transition-colors ${
                  isMapped
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-gray-200 bg-gray-50/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className="text-xs font-medium text-gray-700 truncate flex-1"
                    title={header}
                  >
                    {header || `Column ${colIndex + 1}`}
                  </span>
                  <select
                    value={currentField}
                    onChange={(e) =>
                      handleFieldChange(
                        colIndex,
                        e.target.value as CandidateField,
                      )
                    }
                    className={`rounded border px-2 py-1 text-xs font-medium focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 ${
                      isMapped
                        ? "border-blue-300 bg-white text-blue-700"
                        : "border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Sample values preview */}
                <div className="text-xs text-gray-400 truncate">
                  {sampleValues.length > 0 ? (
                    sampleValues.join(" · ")
                  ) : (
                    <span className="italic">no data</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data preview table — only mapped columns */}
      {mappedColumns.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Data Preview
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({mappedColumns.length} mapped columns)
            </span>
          </h3>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {mappedColumns.map((col) => (
                    <th
                      key={col.index}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {FIELD_LABELS[
                        col.field as Exclude<CandidateField, "ignore">
                      ] ?? col.header}
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
                    {mappedColumns.map((col) => {
                      const cellValue = row[col.index];
                      const displayValue =
                        cellValue !== undefined && cellValue !== null
                          ? String(cellValue)
                          : "";
                      return (
                        <td
                          key={col.index}
                          className="px-3 py-2 text-xs text-gray-600 truncate max-w-[200px]"
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
              </tbody>
            </table>
          </div>

          {/* Expand / collapse rows */}
          <div className="flex items-center gap-3">
            {hasMoreRows && (
              <button
                onClick={() => setPreviewCount(rows.length)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ChevronDown size={14} />
                Show all {rows.length} rows
              </button>
            )}
            {previewCount > INITIAL_PREVIEW_COUNT && (
              <button
                onClick={() => setPreviewCount(INITIAL_PREVIEW_COUNT)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronUp size={14} />
                Collapse to {INITIAL_PREVIEW_COUNT} rows
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {rows.length} {rows.length === 1 ? "row" : "rows"} total
            </span>
          </div>
        </div>
      )}

      {/* Role mapping section */}
      {isRoleMapped && uniqueRoles.length > 0 && (
        <RoleMappingSection
          uniqueRoles={uniqueRoles}
          roleMapping={roleMapping}
          existingRoles={roles}
          onChange={handleRoleMappingChange}
        />
      )}

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
            <span className="font-semibold">Name column is required.</span>{" "}
            Please map at least one column to &ldquo;Name&rdquo; to continue.
          </p>
        </div>
      )}

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
          disabled={!canConfirm}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Validate
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleMappingSection
// ---------------------------------------------------------------------------

function RoleMappingSection({
  uniqueRoles,
  roleMapping,
  existingRoles,
  onChange,
}: {
  uniqueRoles: string[];
  roleMapping: RoleMapping;
  existingRoles: Role[];
  onChange: (key: string, entry: RoleMappingEntry) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-700">Role Mapping</h3>
        <p className="text-xs text-gray-400">
          We found {uniqueRoles.length} unique role
          {uniqueRoles.length !== 1 ? "s" : ""} in your data. Map each to an
          existing role, add as new, or skip those rows.
        </p>
      </div>
      <div className="space-y-2">
        {uniqueRoles.map((rawValue) => {
          const key = rawValue.toLowerCase();
          const entry = roleMapping[key] ?? { action: "skip" };
          return (
            <RoleMappingRow
              key={key}
              rawValue={rawValue}
              entry={entry}
              existingRoles={existingRoles}
              onChange={(updated) => onChange(key, updated)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleMappingRow
// ---------------------------------------------------------------------------

function RoleMappingRow({
  rawValue,
  entry,
  existingRoles,
  onChange,
}: {
  rawValue: string;
  entry: RoleMappingEntry;
  existingRoles: Role[];
  onChange: (entry: RoleMappingEntry) => void;
}) {
  const isAutoMatched = entry.action === "map" && !!entry.targetRoleId;
  const matchedRole = isAutoMatched
    ? existingRoles.find((r) => r.id === entry.targetRoleId)
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate block">
            &ldquo;{rawValue}&rdquo;
          </span>
        </div>
        {isAutoMatched && matchedRole && (
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle size={13} className="text-green-500" />
            <span>Matched to {matchedRole.name}</span>
          </div>
        )}
        <select
          value={entry.action}
          onChange={(e) => {
            const action = e.target.value as RoleMappingEntry["action"];
            if (action === "map") {
              onChange({
                action: "map",
                targetRoleId: existingRoles[0]?.id ?? "",
              });
            } else if (action === "add") {
              onChange({
                action: "add",
                newRoleName: rawValue,
                newRoleIcon: "Briefcase",
              });
            } else {
              onChange({ action: "skip" });
            }
          }}
          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
        >
          <option value="map">Map to existing</option>
          <option value="add">Add as new role</option>
          <option value="skip">Skip these rows</option>
        </select>
      </div>
      {entry.action === "map" && (
        <div className="pl-2">
          <select
            value={entry.targetRoleId ?? ""}
            onChange={(e) =>
              onChange({ ...entry, targetRoleId: e.target.value })
            }
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
          >
            {existingRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {entry.action === "add" && (
        <div className="pl-2 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-12 shrink-0">Name</label>
            <input
              type="text"
              value={entry.newRoleName ?? ""}
              onChange={(e) =>
                onChange({ ...entry, newRoleName: e.target.value })
              }
              className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 flex-1"
              placeholder="Role name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Icon</label>
            <InlineIconPicker
              value={entry.newRoleIcon ?? "Briefcase"}
              onChange={(icon) => onChange({ ...entry, newRoleIcon: icon })}
            />
          </div>
        </div>
      )}
      {entry.action === "skip" && (
        <p className="pl-2 text-xs text-gray-400 italic">
          Rows with this role value will not be imported.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineIconPicker
// ---------------------------------------------------------------------------

function InlineIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {ROLE_EMOJI_ICONS.map((emoji) => {
        const isSelected = value === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`flex items-center justify-center rounded border p-1.5 text-base transition-all ${
              isSelected
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300 scale-110"
                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
