import type { CandidateField, ColumnMapping } from "./types";

/**
 * Keyword lists for each candidate field.
 * Normalized header strings are checked with `includes(keyword)`.
 * First match wins per field.
 */
const FIELD_KEYWORDS: Record<Exclude<CandidateField, "ignore">, string[]> = {
  name: ["name", "full name", "candidate", "applicant", "person"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "mobile", "whatsapp", "contact", "number", "ph", "wa"],
  instagram: ["instagram", "ig", "insta", "handle"],
  portfolioUrl: [
    "portfolio",
    "link",
    "url",
    "website",
    "work",
    "behance",
    "dribbble",
    "youtube",
  ],
};

/**
 * Auto-detect column mapping from spreadsheet headers using keyword heuristics.
 *
 * Each header is normalized to lowercase and checked against keyword lists.
 * First matching header per field wins — columns are never double-assigned.
 * Returns a partial mapping — unmapped fields are absent from the result.
 */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const assignedIndices = new Set<number>();

  for (let index = 0; index < headers.length; index++) {
    const header = headers[index];
    const normalized = header.toLowerCase().trim();

    const entries = Object.entries(FIELD_KEYWORDS) as [
      Exclude<CandidateField, "ignore">,
      string[],
    ][];
    for (const [field, keywords] of entries) {
      // Skip if this field already has a column assigned
      if (mapping[field] !== undefined) continue;
      // Skip if this column index is already assigned to another field
      if (assignedIndices.has(index)) continue;

      if (keywords.some((kw) => normalized.includes(kw))) {
        mapping[field] = index;
        assignedIndices.add(index);
        break;
      }
    }
  }

  return mapping;
}
