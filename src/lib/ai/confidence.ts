/**
 * Confidence scoring for extraction results.
 * Merges AI confidence with regex-verified fields and platform-specific adjustments.
 */

import type { Platform } from "./platform";
import type { ParsedContacts } from "./textParser";
import type { ExtractionResult } from "./openai";

export interface ConfidenceScore {
  field: string;
  value: number; // 0.0 - 1.0
  source: "ai" | "regex" | "both";
}

// Platform reliability multipliers — some platforms expose more structured data
const PLATFORM_MULTIPLIERS: Partial<Record<Platform, number>> = {
  linkedin: 1.1, // structured profile data
  behance: 1.05,
  instagram: 0.95, // often incomplete bios
  youtube: 1.0,
  website: 0.85, // highly variable
  unknown: 0.7,
};

export function computeConfidence(
  aiResult: ExtractionResult,
  regexResult: ParsedContacts,
  platform: Platform,
): ConfidenceScore[] {
  const multiplier = PLATFORM_MULTIPLIERS[platform] ?? 1.0;
  const scores: ConfidenceScore[] = [];

  // Email: regex match boosts confidence
  const emailAi = aiResult.confidence.email ?? 0;
  const emailRegex = regexResult.emails.length > 0;
  scores.push({
    field: "email",
    value: clamp(emailRegex ? Math.max(emailAi, 0.95) : emailAi * multiplier),
    source: emailRegex && emailAi > 0 ? "both" : emailRegex ? "regex" : "ai",
  });

  // Phone: regex match boosts confidence
  const phoneAi = aiResult.confidence.phone ?? 0;
  const phoneRegex = regexResult.phones.length > 0;
  scores.push({
    field: "phone",
    value: clamp(phoneRegex ? Math.max(phoneAi, 0.9) : phoneAi * multiplier),
    source: phoneRegex && phoneAi > 0 ? "both" : phoneRegex ? "regex" : "ai",
  });

  // Instagram: regex boosts
  const instaAi = aiResult.confidence.instagram ?? 0;
  const instaRegex = regexResult.instagrams.length > 0;
  scores.push({
    field: "instagram",
    value: clamp(
      instaRegex ? Math.max(instaAi, 0.95) : instaAi * multiplier,
    ),
    source: instaRegex && instaAi > 0 ? "both" : instaRegex ? "regex" : "ai",
  });

  // Name: AI-only, platform-adjusted
  const nameAi = aiResult.confidence.name ?? 0;
  scores.push({
    field: "name",
    value: clamp(nameAi * multiplier),
    source: "ai",
  });

  // Bio, location, niche: AI-only
  for (const field of ["bio", "location", "contentNiche"] as const) {
    const val = aiResult.confidence[field] ?? 0;
    scores.push({
      field,
      value: clamp(val * multiplier),
      source: "ai",
    });
  }

  // Follower count: AI-only, platform-adjusted
  const followerAi = aiResult.confidence.followerCount ?? 0;
  scores.push({
    field: "followerCount",
    value: clamp(followerAi * multiplier),
    source: "ai",
  });

  return scores;
}

export function getOverallConfidence(scores: ConfidenceScore[]): number {
  if (scores.length === 0) return 0;

  // Weighted average — contact fields matter more
  const weights: Record<string, number> = {
    name: 2.0,
    email: 1.5,
    phone: 1.0,
    instagram: 1.5,
    bio: 0.5,
    location: 0.5,
    contentNiche: 0.5,
    followerCount: 0.5,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const score of scores) {
    const w = weights[score.field] ?? 0.5;
    weightedSum += score.value * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? clamp(weightedSum / totalWeight) : 0;
}

export function getConfidenceLabel(value: number): string {
  if (value >= 0.85) return "High";
  if (value >= 0.6) return "Medium";
  if (value >= 0.3) return "Low";
  return "Very Low";
}

export function getConfidenceColor(value: number): string {
  if (value >= 0.85) return "text-green-600 bg-green-50";
  if (value >= 0.6) return "text-amber-600 bg-amber-50";
  if (value >= 0.3) return "text-orange-600 bg-orange-50";
  return "text-red-600 bg-red-50";
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
