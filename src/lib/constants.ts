import type { CandidateStatus, Tier } from "@/types";

// Mock user for Phase 1 (auth deferred)
export const MOCK_USER = {
  name: "Vishal",
  avatar: null as string | null,
};

// Lucide icon names for the role icon picker (~20 creative-role-relevant icons)
export const LUCIDE_ROLE_ICONS = [
  "Film",
  "PenLine",
  "Palette",
  "Cpu",
  "Camera",
  "Music",
  "Mic",
  "Video",
  "Brush",
  "Scissors",
  "Code",
  "BookOpen",
  "Image",
  "Sparkles",
  "Megaphone",
  "PenTool",
  "Monitor",
  "Clapperboard",
  "Pencil",
  "Briefcase",
] as const;

export type LucideRoleIcon = (typeof LUCIDE_ROLE_ICONS)[number];

// Display labels for each candidate status
export const STATUS_LABELS: Record<CandidateStatus, string> = {
  left_to_review: "Left to Review",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  not_good: "Not Good",
  maybe: "Maybe",
  assignment_pending: "Assignment Pending",
  assignment_sent: "Assignment Sent",
  assignment_followup: "Assignment Follow-up",
  assignment_passed: "Assignment Passed",
  assignment_failed: "Assignment Failed",
  hired: "Hired",
  rejected: "Rejected",
};

// Pastel/muted Tailwind color classes for each status (bg + text, light background friendly)
export const STATUS_COLORS: Record<CandidateStatus, string> = {
  left_to_review: "bg-blue-50 text-blue-700",
  under_review: "bg-blue-100 text-blue-800",
  shortlisted: "bg-green-100 text-green-700",
  not_good: "bg-red-50 text-red-600",
  maybe: "bg-amber-50 text-amber-700",
  assignment_pending: "bg-purple-50 text-purple-700",
  assignment_sent: "bg-purple-100 text-purple-700",
  assignment_followup: "bg-purple-100 text-purple-800",
  assignment_passed: "bg-green-100 text-green-800",
  assignment_failed: "bg-red-100 text-red-700",
  hired: "bg-green-100 text-green-800",
  rejected: "bg-red-50 text-red-700",
};

// Display labels for tiers
export const TIER_LABELS: Record<Tier, string> = {
  untiered: "Untiered",
  junior: "Junior",
  senior: "Senior",
  both: "Junior + Senior",
};

// Pastel/muted Tailwind color classes for each tier
export const TIER_COLORS: Record<Tier, string> = {
  untiered: "bg-gray-100 text-gray-600",
  junior: "bg-sky-50 text-sky-700",
  senior: "bg-indigo-50 text-indigo-700",
  both: "bg-violet-50 text-violet-700",
};
