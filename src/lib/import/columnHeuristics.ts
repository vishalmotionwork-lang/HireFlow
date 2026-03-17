import type { CandidateField, ColumnMapping } from "./types";

/**
 * Keyword lists for each candidate field.
 * Normalized header strings are checked with `includes(keyword)`.
 * First match wins per field.
 */
const FIELD_KEYWORDS: Record<
  Exclude<CandidateField, "ignore" | "role" | "saveToProfile">,
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
  resumeUrl: [
    "resume",
    "cv",
    "resume link",
    "cv link",
    "resume url",
    "cv url",
    "upload your resume",
    "upload your cv",
  ],
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
  "serial number",
  "s.no",
  "sr no",
  "id",
];

export interface DetectMappingResult {
  mapping: ColumnMapping;
  /** Column indices that should be saved as custom profile fields (header → index) */
  saveToProfileIndices: { index: number; header: string }[];
}

/**
 * Auto-detect column mapping from spreadsheet headers using keyword heuristics.
 *
 * Known fields get mapped to dedicated columns.
 * Timestamps/IDs get ignored.
 * Everything else gets flagged as "Save to Profile" — captured in customFields.
 */
export function detectMapping(headers: string[]): DetectMappingResult {
  const mapping: ColumnMapping = {};
  const assignedIndices = new Set<number>();
  const ignoredIndices = new Set<number>();

  // First pass: mark ignored columns
  for (let index = 0; index < headers.length; index++) {
    const normalized = headers[index].toLowerCase().trim();
    if (IGNORE_KEYWORDS.some((kw) => normalized.includes(kw))) {
      ignoredIndices.add(index);
    }
  }

  // Second pass: map known fields + role
  for (let index = 0; index < headers.length; index++) {
    if (ignoredIndices.has(index)) continue;

    const normalized = headers[index].toLowerCase().trim();

    // Check for role column
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
      Exclude<CandidateField, "ignore" | "role" | "saveToProfile">,
      string[],
    ][];

    for (const [field, keywords] of entries) {
      if (mapping[field] !== undefined) continue;
      if (assignedIndices.has(index)) continue;

      if (keywords.some((kw) => normalized.includes(kw))) {
        mapping[field] = index;
        assignedIndices.add(index);
        break;
      }
    }
  }

  // Third pass: everything unassigned and not ignored → save to profile
  const saveToProfileIndices: { index: number; header: string }[] = [];
  for (let index = 0; index < headers.length; index++) {
    if (!assignedIndices.has(index) && !ignoredIndices.has(index)) {
      saveToProfileIndices.push({ index, header: headers[index] });
    }
  }

  return { mapping, saveToProfileIndices };
}
