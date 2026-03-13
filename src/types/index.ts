import {
  roles,
  candidates,
  candidateEvents,
  candidateComments,
  importBatches,
  extractionDrafts,
} from "@/db/schema";

// Inferred types from Drizzle schema
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

export type CandidateEvent = typeof candidateEvents.$inferSelect;
export type NewCandidateEvent = typeof candidateEvents.$inferInsert;

export type CandidateComment = typeof candidateComments.$inferSelect;
export type NewCandidateComment = typeof candidateComments.$inferInsert;

export type ImportBatch = typeof importBatches.$inferSelect;
export type NewImportBatch = typeof importBatches.$inferInsert;

export type ExtractionDraft = typeof extractionDrafts.$inferSelect;
export type NewExtractionDraft = typeof extractionDrafts.$inferInsert;

// Enum value arrays for reuse
export const CANDIDATE_STATUSES = [
  "left_to_review",
  "under_review",
  "shortlisted",
  "not_good",
  "maybe",
  "assignment_pending",
  "assignment_sent",
  "assignment_followup",
  "assignment_passed",
  "assignment_failed",
  "hired",
  "rejected",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const TIERS = ["untiered", "junior", "senior", "both"] as const;

export type Tier = (typeof TIERS)[number];
