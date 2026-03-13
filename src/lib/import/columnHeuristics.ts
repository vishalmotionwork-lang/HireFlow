import type { CandidateField, ColumnMapping } from "./types";

/**
 * Keyword lists for each candidate field.
 * Normalized header strings are checked with `includes(keyword)`.
 * First match wins per field.
 */
const FIELD_KEYWORDS: Record<Exclude<CandidateField, "ignore">, string[]> = {
  name: ["full name", "name", "candidate", "applicant", "person"],
  email: ["email", "e-mail", "mail address"],
  phone: ["phone", "mobile", "whatsapp", "contact number", "ph no"],
  instagram: ["instagram", "ig handle", "insta"],
  portfolioUrl: [
    "portfolio",
    "professional portfolio",
    "website",
    "behance",
    "dribbble",
    "youtube",
  ],
};

/**
 * Headers to always ignore — timestamps, file uploads, free-text responses,
 * role/position columns (handled separately), location, experience, salary, etc.
 */
const IGNORE_KEYWORDS = [
  "timestamp",
  "submitted",
  "date",
  "resume",
  "cv",
  "upload",
  "file",
  "statement",
  "why are you",
  "cover letter",
  "brief",
  "role",
  "position",
  "applied for",
  "job",
  "vacancy",
  "location",
  "city",
  "country",
  "experience",
  "years",
  "compensation",
  "ctc",
  "salary",
  "expected",
  "notice period",
  "linkedin",
];

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

    // Skip columns that match ignore patterns (timestamps, uploads, etc.)
    if (IGNORE_KEYWORDS.some((kw) => normalized.includes(kw))) {
      continue;
    }

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
