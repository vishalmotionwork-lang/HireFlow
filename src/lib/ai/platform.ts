/**
 * Platform detector — identifies the source platform from a URL or text content.
 * Used to apply platform-specific extraction strategies and confidence adjustments.
 */

export type Platform =
  | "instagram"
  | "youtube"
  | "behance"
  | "dribbble"
  | "linkedin"
  | "twitter"
  | "tiktok"
  | "vimeo"
  | "artstation"
  | "github"
  | "website"
  | "unknown";

interface PlatformPattern {
  platform: Platform;
  urlPatterns: RegExp[];
  textSignals: string[];
}

const PLATFORM_PATTERNS: readonly PlatformPattern[] = [
  {
    platform: "instagram",
    urlPatterns: [/instagram\.com/i, /instagr\.am/i],
    textSignals: ["followers", "following", "posts", "reels", "instagram"],
  },
  {
    platform: "youtube",
    urlPatterns: [/youtube\.com/i, /youtu\.be/i],
    textSignals: ["subscribers", "views", "youtube", "channel"],
  },
  {
    platform: "behance",
    urlPatterns: [/behance\.net/i],
    textSignals: ["behance", "project views", "appreciations"],
  },
  {
    platform: "dribbble",
    urlPatterns: [/dribbble\.com/i],
    textSignals: ["dribbble", "shots", "rebounds"],
  },
  {
    platform: "linkedin",
    urlPatterns: [/linkedin\.com/i],
    textSignals: ["linkedin", "connections", "experience"],
  },
  {
    platform: "twitter",
    urlPatterns: [/twitter\.com/i, /x\.com/i],
    textSignals: ["tweets", "followers", "x.com"],
  },
  {
    platform: "tiktok",
    urlPatterns: [/tiktok\.com/i],
    textSignals: ["tiktok", "likes", "followers"],
  },
  {
    platform: "vimeo",
    urlPatterns: [/vimeo\.com/i],
    textSignals: ["vimeo"],
  },
  {
    platform: "artstation",
    urlPatterns: [/artstation\.com/i],
    textSignals: ["artstation"],
  },
  {
    platform: "github",
    urlPatterns: [/github\.com/i],
    textSignals: ["repositories", "contributions", "github"],
  },
] as const;

export function detectPlatform(url?: string, text?: string): Platform {
  // URL-based detection (most reliable)
  if (url) {
    for (const pattern of PLATFORM_PATTERNS) {
      if (pattern.urlPatterns.some((re) => re.test(url))) {
        return pattern.platform;
      }
    }
  }

  // Text signal-based detection (fallback)
  if (text) {
    const lower = text.toLowerCase();
    let bestMatch: Platform = "unknown";
    let bestScore = 0;

    for (const pattern of PLATFORM_PATTERNS) {
      const score = pattern.textSignals.filter((s) =>
        lower.includes(s),
      ).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern.platform;
      }
    }

    if (bestScore >= 2) return bestMatch;
  }

  // If URL exists but didn't match known platforms
  if (url) return "website";

  return "unknown";
}

export function getPlatformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    behance: "Behance",
    dribbble: "Dribbble",
    linkedin: "LinkedIn",
    twitter: "X / Twitter",
    tiktok: "TikTok",
    vimeo: "Vimeo",
    artstation: "ArtStation",
    github: "GitHub",
    website: "Website",
    unknown: "Unknown",
  };
  return labels[platform];
}
