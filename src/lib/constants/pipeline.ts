import type { CandidateStatus } from "@/types";

export const ARCHIVED_STATUSES: readonly CandidateStatus[] = [
  "not_good",
  "rejected",
  "assignment_failed",
] as const;

export const STALE_REVIEW_DAYS = 7;
