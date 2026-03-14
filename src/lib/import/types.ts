// Types for the spreadsheet import pipeline

/** A single row as an array of cell values from the parser */
export type RawRow = unknown[];

/** Output of any parser (Excel or CSV) */
export type ParseResult = {
  headers: string[];
  rows: RawRow[];
};

/** Candidate fields that can be mapped from spreadsheet columns */
export type CandidateField =
  | "name"
  | "email"
  | "phone"
  | "instagram"
  | "portfolioUrl"
  | "linkedinUrl"
  | "location"
  | "experience"
  | "resumeUrl"
  | "role"
  | "ignore";

/**
 * Maps each candidate field to the column index in the spreadsheet.
 * Partial — unmapped fields are undefined.
 * Does not include 'ignore' since we don't store the index for ignored columns.
 */
export type ColumnMapping = Partial<
  Record<Exclude<CandidateField, "ignore">, number>
>;

/** A normalized candidate row after column mapping is applied */
export type NormalizedRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  experience: string | null;
  resumeUrl: string | null;
  /** Raw role value from sheet (null when no role column is mapped) */
  role: string | null;
  /** Original row index (0-based, offset from data start) for error reporting */
  _rowIndex: number;
};

/** Per-unique-role-value decision made in Step 2 when a role column is mapped */
export type RoleMappingEntry = {
  action: "map" | "add" | "skip";
  /** Existing role ID to map to (when action='map') */
  targetRoleId?: string;
  /** New role name (when action='add') */
  newRoleName?: string;
  /** New role icon (when action='add') */
  newRoleIcon?: string;
};

/** Maps raw role values (lowercase) to user decisions */
export type RoleMapping = Record<string, RoleMappingEntry>;

/** A single field-level validation error */
export type RowError = {
  field: string;
  message: string;
};

/** A normalized row enriched with validation results */
export type ValidatedRow = NormalizedRow & {
  errors: RowError[];
  isValid: boolean;
};

/** Reference to an existing candidate that may be a duplicate */
export type DuplicateMatch = {
  id: string;
  name: string;
  roleId: string;
};

/** Duplicate detection result for a single incoming row */
export type DuplicateInfo = {
  matchType: "email" | "phone";
  existing: DuplicateMatch;
};

/** Per-row decision when a duplicate is detected */
export type ImportRowDecision = "import" | "merge" | "skip";

/** Summary returned after a completed import batch */
export type ImportResult = {
  batchId: string;
  importedCount: number;
  skippedCount: number;
  mergedCount: number;
  duplicatesFound: number;
  totalRows: number;
};
