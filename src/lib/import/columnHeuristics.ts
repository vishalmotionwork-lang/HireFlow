import type { CandidateField, ColumnMapping } from "./types";

/**
 * Keyword lists for each candidate field.
 * Normalized header strings are checked with `includes(keyword)`.
 * First match wins per field.
 */
const FIELD_KEYWORDS: Record<
  Exclude<CandidateField, "ignore" | "role">,
  string[]
> = {
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
  linkedinUrl: ["linkedin", "linked in", "linkedin url", "linkedin profile"],
  location: ["location", "city", "country", "address", "state", "region"],
  experience: [
    "experience",
    "years",
    "years of experience",
    "work experience",
    "exp",
  ],
  resumeUrl: ["resume", "cv", "resume link", "cv link", "resume url", "cv url"],
};

/** Keywords that identify a role/position column */
export const ROLE_KEYWORDS = [
  "role",
  "position",
  "applied for",
  "applying for",
  "interested in",
  "which role",
  "what role",
  "which position",
  "what position",
  "job",
  "vacancy",
  "department",
  "designation",
  "job title",
  "role you",
  "position you",
];

/**
 * Headers to always ignore — timestamps, file uploads, free-text responses,
 * role/position columns (handled separately), salary, etc.
 * Note: linkedin, location, experience, resume/cv are now mapped fields.
 */
const IGNORE_KEYWORDS = [
  "timestamp",
  "submitted",
  "date",
  "upload",
  "file",
  "statement",
  "why are you",
  "cover letter",
  "brief",
  "compensation",
  "ctc",
  "salary",
  "expected",
  "notice period",
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

    // Check for role column first
    if (
      mapping.role === undefined &&
      !assignedIndices.has(index) &&
      ROLE_KEYWORDS.some((kw) => normalized.includes(kw))
    ) {
      mapping.role = index;
      assignedIndices.add(index);
      continue;
    }

    const entries = Object.entries(FIELD_KEYWORDS) as [
      Exclude<CandidateField, "ignore" | "role">,
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
