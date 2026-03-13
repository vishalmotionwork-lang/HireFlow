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
  | 'name'
  | 'email'
  | 'phone'
  | 'instagram'
  | 'portfolioUrl'
  | 'ignore';

/**
 * Maps each candidate field to the column index in the spreadsheet.
 * Partial — unmapped fields are undefined.
 * Does not include 'ignore' since we don't store the index for ignored columns.
 */
export type ColumnMapping = Partial<Record<Exclude<CandidateField, 'ignore'>, number>>;

/** A normalized candidate row after column mapping is applied */
export type NormalizedRow = {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  /** Original row index (0-based, offset from data start) for error reporting */
  _rowIndex: number;
};

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
  matchType: 'email' | 'phone';
  existing: DuplicateMatch;
};

/** Per-row decision when a duplicate is detected */
export type ImportRowDecision = 'import' | 'merge' | 'skip';

/** Summary returned after a completed import batch */
export type ImportResult = {
  batchId: string;
  importedCount: number;
  skippedCount: number;
  mergedCount: number;
  duplicatesFound: number;
  totalRows: number;
};
