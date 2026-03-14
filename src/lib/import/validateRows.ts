import { z } from "zod";

import type { NormalizedRow, RowError, ValidatedRow } from "./types";

/**
 * Zod schema for validating a normalized candidate row.
 *
 * Rules:
 * - name: required, must be non-empty string (IMPT-07)
 * - email: optional but must be valid email format if present
 * - portfolioUrl: optional but must be valid URL if present
 * - phone: optional, no format constraint (already normalized upstream)
 * - instagram: optional, no format constraint
 */
const rowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").nullable().optional(),
  phone: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  portfolioUrl: z.string().url("Invalid portfolio URL").nullable().optional(),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").nullable().optional(),
  location: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  resumeUrl: z.string().url("Invalid resume URL").nullable().optional(),
});

/**
 * Validate a list of normalized rows using the row schema.
 *
 * Each row is returned with:
 * - errors: array of field-level errors (empty if valid)
 * - isValid: true only if there are no errors
 *
 * Rows with a missing or empty name are always flagged as invalid.
 */
export function validateRows(rows: NormalizedRow[]): ValidatedRow[] {
  return rows.map((row) => {
    const result = rowSchema.safeParse(row);

    if (result.success) {
      return { ...row, errors: [], isValid: true };
    }

    const errors: RowError[] = result.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return { ...row, errors, isValid: false };
  });
}
