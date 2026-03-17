/**
 * URL classification utility for the import pipeline.
 *
 * Routes raw URL strings to the correct database field and extracts
 * social-media handles where applicable.
 */

import type { NormalizedRow } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UrlClassification =
  | "instagram"
  | "linkedin"
  | "behance"
  | "youtube"
  | "drive"
  | "portfolio"
  | "unknown";

export interface ClassifiedUrl {
  url: string;
  classification: UrlClassification;
  /** Which DB field this URL should be stored in */
  targetField:
    | "instagram"
    | "linkedinUrl"
    | "portfolioUrl"
    | "resumeUrl"
    | null;
  /** Extracted handle for social platforms (e.g. "johndoe" from instagram.com/johndoe) */
  extractedHandle: string | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Domain rules
// ---------------------------------------------------------------------------

interface DomainRule {
  /** Test applied against the hostname (lowercase) */
  match: (host: string) => boolean;
  classification: UrlClassification;
  targetField: ClassifiedUrl["targetField"];
  confidence: number;
  /** Optional handle extractor – receives the full URL object */
  extractHandle?: (parsed: URL) => string | null;
}

/** Extract the first meaningful pathname segment (ignoring empty / query / hash). */
function firstPathSegment(parsed: URL): string | null {
  const segments = parsed.pathname
    .split("/")
    .filter((s) => s.length > 0 && s !== "p" && s !== "reel" && s !== "reels");
  return segments[0] ?? null;
}

const DOMAIN_RULES: readonly DomainRule[] = [
  {
    match: (h) => h === "instagram.com" || h === "www.instagram.com",
    classification: "instagram",
    targetField: "instagram",
    confidence: 1.0,
    extractHandle: (parsed) => firstPathSegment(parsed),
  },
  {
    match: (h) => h.endsWith("linkedin.com"),
    classification: "linkedin",
    targetField: "linkedinUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h === "drive.google.com" || h === "docs.google.com",
    classification: "drive",
    targetField: "resumeUrl",
    confidence: 0.9,
  },
  {
    match: (h) => h === "behance.net" || h === "www.behance.net",
    classification: "behance",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) =>
      h === "youtube.com" ||
      h === "www.youtube.com" ||
      h === "m.youtube.com" ||
      h === "youtu.be",
    classification: "youtube",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h === "dribbble.com" || h === "www.dribbble.com",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h === "artstation.com" || h === "www.artstation.com",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h === "github.com" || h === "www.github.com",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h === "vimeo.com" || h === "www.vimeo.com",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 1.0,
  },
  {
    match: (h) => h.endsWith("canva.com"),
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.8,
  },
  {
    match: (h) => h === "linktr.ee" || h === "www.linktr.ee",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.8,
  },
  {
    match: (h) => h.startsWith("framer.") || h.endsWith(".framer.app"),
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.8,
  },
  {
    match: (h) =>
      h === "wix.com" ||
      h === "www.wix.com" ||
      h.endsWith("wixsite.com"),
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.8,
  },
  {
    match: (h) => h === "carrd.co" || h === "www.carrd.co",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.8,
  },
  {
    match: (h) => h === "notion.so" || h === "www.notion.so",
    classification: "portfolio",
    targetField: "portfolioUrl",
    confidence: 0.7,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a raw string into a parseable URL (adds protocol when missing). */
function toUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

/**
 * Split a field value that might contain multiple URLs
 * (separated by newlines, commas, or whitespace).
 */
function splitUrls(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Detect whether a string looks like a bare Instagram handle rather than a URL.
 * Bare handles don't contain dots or slashes (unless it IS a URL).
 */
function looksLikeBareHandle(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  // Contains a dot → probably a URL (e.g. instagram.com/user)
  if (trimmed.includes(".")) return false;
  // Contains a slash → probably a partial URL
  if (trimmed.includes("/")) return false;
  // Starts with @ → definitely a handle
  if (trimmed.startsWith("@")) return true;
  // Simple alphanumeric/underscore string → treat as handle
  return /^[\w.]+$/.test(trimmed);
}

/** Strip leading @ from a handle if present. */
function stripAt(handle: string): string {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

// ---------------------------------------------------------------------------
// Core classifier
// ---------------------------------------------------------------------------

/** Classify a single URL string and determine its target DB field. */
export function classifyImportUrl(url: string): ClassifiedUrl {
  const parsed = toUrl(url);

  if (!parsed) {
    return {
      url,
      classification: "unknown",
      targetField: null,
      extractedHandle: null,
      confidence: 0,
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const hostWithWww = parsed.hostname.toLowerCase();

  for (const rule of DOMAIN_RULES) {
    if (rule.match(host) || rule.match(hostWithWww)) {
      const extractedHandle = rule.extractHandle
        ? rule.extractHandle(parsed)
        : null;

      return {
        url: parsed.href,
        classification: rule.classification,
        targetField: rule.targetField,
        extractedHandle,
        confidence: rule.confidence,
      };
    }
  }

  // Fallback: treat any other URL as a potential portfolio link
  return {
    url: parsed.href,
    classification: "portfolio",
    targetField: "portfolioUrl",
    extractedHandle: null,
    confidence: 0.5,
  };
}

// ---------------------------------------------------------------------------
// Row-level reclassification
// ---------------------------------------------------------------------------

/**
 * Fields that hold URL values and may need reclassification.
 * Maps each field to itself so we can iterate cleanly.
 */
const URL_FIELDS = [
  "portfolioUrl",
  "instagram",
  "linkedinUrl",
  "resumeUrl",
] as const;

type UrlField = (typeof URL_FIELDS)[number];

/**
 * Take an import row and return a NEW row with URLs routed to their
 * correct fields based on classification.
 *
 * Corrections applied:
 *  - portfolioUrl containing an IG link → instagram (handle extracted)
 *  - portfolioUrl containing a LinkedIn link → linkedinUrl
 *  - portfolioUrl containing a Drive/Docs link → resumeUrl
 *  - instagram field containing a full URL → handle extracted
 *  - Multiple URLs in one field → first URL stays, rest are reclassified
 */
export function classifyAndRouteUrls(row: NormalizedRow): NormalizedRow {
  // Start with a shallow copy (all fields are primitives / null, so this is safe)
  const result: Record<string, unknown> = { ...row };

  // Collect reclassified values keyed by target field.
  // Each target may accumulate multiple values; we join them later.
  const corrections: Partial<Record<UrlField, string[]>> = {};

  /** Append a value to a correction bucket. */
  function pushCorrection(field: UrlField, value: string): void {
    const bucket = corrections[field] ?? [];
    bucket.push(value);
    corrections[field] = bucket;
  }

  // --- Pass 1: classify URLs in portfolioUrl --------------------------------
  const portfolioRaw = row.portfolioUrl;
  if (portfolioRaw) {
    const urls = splitUrls(portfolioRaw);
    const keepInPortfolio: string[] = [];

    for (const raw of urls) {
      const classified = classifyImportUrl(raw);

      switch (classified.targetField) {
        case "instagram":
          pushCorrection(
            "instagram",
            classified.extractedHandle ?? classified.url,
          );
          break;
        case "linkedinUrl":
          pushCorrection("linkedinUrl", classified.url);
          break;
        case "resumeUrl":
          pushCorrection("resumeUrl", classified.url);
          break;
        case "portfolioUrl":
        default:
          keepInPortfolio.push(classified.url);
          break;
      }
    }

    result.portfolioUrl =
      keepInPortfolio.length > 0 ? keepInPortfolio[0] : null;
  }

  // --- Pass 2: normalise instagram field ------------------------------------
  const igRaw = row.instagram;
  if (igRaw) {
    const trimmed = igRaw.trim();

    if (looksLikeBareHandle(trimmed)) {
      // Already a handle — just strip @ if present
      result.instagram = stripAt(trimmed);
    } else {
      // Could be a full URL — classify it
      const urls = splitUrls(trimmed);
      const handles: string[] = [];

      for (const raw of urls) {
        const classified = classifyImportUrl(raw);
        if (
          classified.classification === "instagram" &&
          classified.extractedHandle
        ) {
          handles.push(classified.extractedHandle);
        } else if (looksLikeBareHandle(raw)) {
          handles.push(stripAt(raw));
        } else {
          // Non-IG URL sitting in the instagram field — leave as-is for now
          handles.push(raw);
        }
      }

      result.instagram = handles.length > 0 ? handles[0] : null;
    }
  }

  // --- Pass 3: apply accumulated corrections --------------------------------
  // Only overwrite a field if it was previously empty (don't clobber existing data)
  for (const field of URL_FIELDS) {
    const bucket = corrections[field];
    if (!bucket || bucket.length === 0) continue;

    const existing = result[field] as string | null;
    if (!existing) {
      result[field] = bucket[0] ?? null;
    }
    // If the field already has a value, we don't overwrite — the existing
    // value takes precedence and the reclassified URL is silently dropped.
  }

  return result as NormalizedRow;
}
