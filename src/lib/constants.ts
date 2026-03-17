import type { CandidateStatus, Tier } from "@/types";

/**
 * @deprecated Use getAuthUser() from @/lib/auth instead.
 * Kept as fallback for server actions when auth context is unavailable.
 */
export const MOCK_USER = {
  name: "Vishal",
  avatar: null as string | null,
};

// Emoji icons for the role icon picker
export const ROLE_EMOJI_ICONS = [
  "🎬", // Video Editor
  "✍️", // Writer/Scriptwriter
  "🎨", // Designer
  "🤖", // AI/Tech
  "📱", // Social Media
  "📝", // Content
  "🎯", // Strategy
  "🎥", // Director
  "📊", // Manager
  "💼", // Business
  "💰", // Sales
  "📸", // Photography
  "🎵", // Music
  "🎙️", // Podcast/Voice
  "💻", // Developer
  "🔍", // Research
  "📣", // Marketing
  "🎪", // Creative
  "🧠", // Innovation
  "⚡", // Operations
] as const;

export type RoleEmojiIcon = (typeof ROLE_EMOJI_ICONS)[number];

// Legacy: keep LUCIDE_ROLE_ICONS for backward compatibility
export const LUCIDE_ROLE_ICONS = ROLE_EMOJI_ICONS;
export type LucideRoleIcon = RoleEmojiIcon;

// Display labels for each candidate status
export const STATUS_LABELS: Record<CandidateStatus, string> = {
  left_to_review: "To Review",
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
  intern: "Intern",
  junior: "Junior",
  senior: "Senior",
};

// Pastel/muted Tailwind color classes for each tier
export const TIER_COLORS: Record<Tier, string> = {
  untiered: "bg-gray-100 text-gray-600",
  intern: "bg-emerald-50 text-emerald-700",
  junior: "bg-sky-50 text-sky-700",
  senior: "bg-indigo-50 text-indigo-700",
};

// Rejection reason quick-select chips
export const REJECTION_REASONS = [
  "Quality below bar",
  "Wrong niche",
  "Assignment failed",
  "Not responsive",
  "Overqualified",
  "Other",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

// Mock team members for @mention support in comments.
// TODO: Replace with Clerk user list when auth is added.
export const TEAM_MEMBERS = [
  { id: "vishal", name: "Vishal" },
  { id: "zeel", name: "Zeel" },
  { id: "zaid", name: "Zaid" },
  { id: "kunal", name: "Kunal" },
] as const;

export type TeamMember = (typeof TEAM_MEMBERS)[number];

// Import source labels
export const IMPORT_SOURCES = {
  manual: "Manual",
  excel: "Excel",
  csv: "CSV",
  paste: "Paste",
  url: "URL",
} as const;

export type ImportSource = keyof typeof IMPORT_SOURCES;
