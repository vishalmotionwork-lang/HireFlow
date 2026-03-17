import type { NormalizedRow, RowError, ValidatedRow } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

/**
 * Validate a list of normalized rows.
 *
 * Philosophy: NEVER skip a lead. Every candidate with a name gets imported.
 * Issues like invalid URLs or missing emails are flagged as warnings
 * (stored in errors array) but isValid stays TRUE so the row imports.
 *
 * Only truly broken rows (no name) are marked invalid.
 */
export function validateRows(rows: NormalizedRow[]): ValidatedRow[] {
  return rows.map((row) => {
    const warnings: RowError[] = [];

    // Name is the only hard requirement
    if (!row.name || row.name.trim() === "") {
      return {
        ...row,
        errors: [{ field: "name", message: "Name is required" }],
        isValid: false,
      };
    }

    // Email — warn if present but malformed
    if (row.email && !EMAIL_RE.test(row.email)) {
      warnings.push({ field: "email", message: "Email format looks invalid — will need manual review" });
    }

    // Portfolio URL — warn if present but not a proper URL
    if (row.portfolioUrl) {
      const val = row.portfolioUrl.toLowerCase().trim();
      if (val === "na" || val === "n/a" || val === "none" || val === "-") {
        // Clear junk values
        row = { ...row, portfolioUrl: null };
        warnings.push({ field: "portfolioUrl", message: "No portfolio provided" });
      } else if (!URL_RE.test(row.portfolioUrl)) {
        warnings.push({ field: "portfolioUrl", message: "Portfolio URL needs review" });
      }
    } else {
      warnings.push({ field: "portfolioUrl", message: "No portfolio — needs manual review" });
    }

    // LinkedIn URL — warn if present but not a proper URL
    if (row.linkedinUrl) {
      const val = row.linkedinUrl.toLowerCase().trim();
      if (val === "na" || val === "n/a" || val === "none" || val === "-") {
        row = { ...row, linkedinUrl: null };
      } else if (!URL_RE.test(row.linkedinUrl)) {
        warnings.push({ field: "linkedinUrl", message: "LinkedIn URL needs review" });
      }
    }

    // Resume URL — same treatment
    if (row.resumeUrl) {
      const val = row.resumeUrl.toLowerCase().trim();
      if (val === "na" || val === "n/a" || val === "none" || val === "-") {
        row = { ...row, resumeUrl: null };
      }
    }

    // Always valid (imports the candidate), warnings are for review flags
    return { ...row, errors: warnings, isValid: true };
  });
}
