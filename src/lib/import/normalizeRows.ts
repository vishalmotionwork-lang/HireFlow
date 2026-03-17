import type { ColumnMapping, NormalizedRow, RawRow } from "./types";
import type { DetectMappingResult } from "./columnHeuristics";

/**
 * Normalize an Indian or international phone number to a canonical form.
 *
 * Rules:
 * - Strip all non-digit characters
 * - 10 digits → keep as-is (standard Indian format)
 * - 12 digits starting with 91 → strip country code, keep last 10
 * - 13 digits starting with 091 → strip leading 0 + country code, keep last 10
 * - 7+ digits → keep as-is (international number)
 * - Anything shorter → null (not a valid phone number)
 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 13 && digits.startsWith("091")) {
    return digits.slice(3);
  }

  if (digits.length >= 7) {
    // Keep as-is for international numbers outside Indian patterns
    return digits;
  }

  return null;
}

/**
 * Apply column mapping to raw spreadsheet rows, producing normalized rows.
 *
 * - Phone numbers are normalized (strips +91 prefix, handles Indian formats)
 * - Emails are lowercased
 * - All string values are trimmed
 * - Empty strings become null
 * - Unmapped fields default to null
 */
export function normalizeRows(
  rows: RawRow[],
  mapping: ColumnMapping,
  saveToProfileIndices?: DetectMappingResult["saveToProfileIndices"],
): NormalizedRow[] {
  return rows.map((row, idx) => {
    const get = (colIndex: number | undefined): string | null => {
      if (colIndex === undefined || colIndex === null) return null;
      const value = String(row[colIndex] ?? "").trim();
      return value === "" ? null : value;
    };

    const rawPhone = mapping.phone !== undefined ? get(mapping.phone) : null;

    // Build custom fields from "Save to Profile" columns
    const customFields: Record<string, string> = {};
    if (saveToProfileIndices) {
      for (const { index, header } of saveToProfileIndices) {
        const value = String(row[index] ?? "").trim();
        if (value) {
          customFields[header] = value;
        }
      }
    }

    return {
      name: get(mapping.name),
      email:
        mapping.email !== undefined
          ? (get(mapping.email)?.toLowerCase() ?? null)
          : null,
      phone: rawPhone !== null ? normalizePhone(rawPhone) : null,
      instagram: get(mapping.instagram),
      portfolioUrl: get(mapping.portfolioUrl),
      linkedinUrl: get(mapping.linkedinUrl),
      location: get(mapping.location),
      experience: get(mapping.experience),
      resumeUrl: get(mapping.resumeUrl),
      customFields,
      role: get(mapping.role),
      _rowIndex: idx,
    };
  });
}
