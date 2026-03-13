/**
 * Regex-based contact info parser.
 * Runs BEFORE AI extraction as a fast first pass — results are merged with AI output.
 */

export interface ParsedContacts {
  emails: string[];
  phones: string[];
  instagrams: string[];
  urls: string[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// International phone: optional +, country code, 7-15 digits with optional separators
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

// Instagram handles: @username or instagram.com/username
const INSTA_HANDLE_RE = /(?:^|[\s(])@([a-zA-Z0-9._]{1,30})(?=[\s),.]|$)/g;
const INSTA_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/gi;

// Generic URLs
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

// Known portfolio/social domains
const PORTFOLIO_DOMAINS = [
  "behance.net",
  "dribbble.com",
  "artstation.com",
  "vimeo.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "github.com",
] as const;

function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim().toLowerCase()))];
}

function isLikelyPhone(match: string): boolean {
  // Filter out numbers that are too short (dates, IDs, etc.)
  const digitsOnly = match.replace(/\D/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

export function parseContacts(text: string): ParsedContacts {
  const emails = unique([...(text.match(EMAIL_RE) ?? [])]);

  const rawPhones = [...(text.match(PHONE_RE) ?? [])];
  const phones = unique(rawPhones.filter(isLikelyPhone));

  // Instagram: both @handles and URL-based
  const handleMatches = [...text.matchAll(INSTA_HANDLE_RE)].map((m) => m[1]);
  const urlMatches = [...text.matchAll(INSTA_URL_RE)].map((m) => m[1]);
  const instagrams = unique([...handleMatches, ...urlMatches]).filter(
    (h) => !["p", "reel", "stories", "explore", "accounts"].includes(h),
  );

  const rawUrls = [...(text.match(URL_RE) ?? [])];
  const urls = unique(rawUrls);

  return { emails, phones, instagrams, urls };
}

export function classifyUrl(url: string): string {
  const lower = url.toLowerCase();
  for (const domain of PORTFOLIO_DOMAINS) {
    if (lower.includes(domain)) {
      return domain.split(".")[0]; // 'behance', 'dribbble', etc.
    }
  }
  if (lower.includes("instagram.com")) return "instagram";
  return "website";
}

export function isPortfolioUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return PORTFOLIO_DOMAINS.some((d) => lower.includes(d));
}

export function isSocialUrl(url: string): boolean {
  const social = [
    "instagram.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "youtube.com",
    "youtu.be",
  ];
  const lower = url.toLowerCase();
  return social.some((d) => lower.includes(d));
}
