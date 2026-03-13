/**
 * Extraction orchestrator — coordinates regex parsing, platform detection,
 * AI extraction, and confidence scoring into a single pipeline.
 */

import {
  parseContacts,
  classifyUrl,
  isSocialUrl,
  type ParsedContacts,
} from "./textParser";
import { detectPlatform, type Platform } from "./platform";
import { extractProfileData, type ExtractionResult } from "./openai";
import {
  computeConfidence,
  getOverallConfidence,
  type ConfidenceScore,
} from "./confidence";

export interface ExtractionInput {
  rawText: string;
  sourceUrl?: string;
  candidateId?: string;
}

export interface ExtractionOutput {
  /** Merged extraction result */
  data: ExtractionResult;
  /** Per-field confidence scores */
  fieldConfidence: ConfidenceScore[];
  /** Overall confidence 0-1 */
  overallConfidence: number;
  /** Detected source platform */
  platform: Platform;
  /** Whether AI was used (false = regex-only fallback) */
  usedAi: boolean;
  /** Error message if AI failed but regex succeeded */
  error?: string;
}

/**
 * Run the full extraction pipeline:
 * 1. Regex parse (fast, always runs)
 * 2. Platform detection
 * 3. AI extraction (OpenAI) — falls back to regex-only if it fails
 * 4. Merge regex + AI results (regex wins on contact fields when both found)
 * 5. Confidence scoring
 */
export async function runExtraction(
  input: ExtractionInput,
): Promise<ExtractionOutput> {
  const { rawText, sourceUrl } = input;

  // Step 1: Regex parse
  const regexResult = parseContacts(rawText);

  // Step 2: Platform detection
  const platform = detectPlatform(sourceUrl, rawText);

  // Step 3: AI extraction (with fallback)
  let aiResult: ExtractionResult | null = null;
  let usedAi = false;
  let error: string | undefined;

  try {
    aiResult = await extractProfileData(rawText, sourceUrl);
    usedAi = true;
  } catch (err) {
    error = err instanceof Error ? err.message : "AI extraction failed";
  }

  // Step 4: Merge results
  const merged = mergeResults(aiResult, regexResult, sourceUrl);

  // Step 5: Confidence scoring
  const fieldConfidence = computeConfidence(merged, regexResult, platform);
  const overallConfidence = getOverallConfidence(fieldConfidence);

  return {
    data: merged,
    fieldConfidence,
    overallConfidence,
    platform,
    usedAi,
    error,
  };
}

/**
 * Merge AI + regex results. Regex wins on contact fields when found
 * (higher reliability), AI fills everything else.
 */
function mergeResults(
  ai: ExtractionResult | null,
  regex: ParsedContacts,
  sourceUrl?: string,
): ExtractionResult {
  const base: ExtractionResult = {
    name: ai?.name ?? null,
    email: regex.emails[0] ?? ai?.email ?? null,
    phone: regex.phones[0] ?? ai?.phone ?? null,
    instagram: regex.instagrams[0] ?? ai?.instagram ?? null,
    portfolioLinks: ai?.portfolioLinks ?? [],
    socialHandles: ai?.socialHandles ?? [],
    bio: ai?.bio ?? null,
    location: ai?.location ?? null,
    followerCount: ai?.followerCount ?? null,
    contentNiche: ai?.contentNiche ?? null,
    confidence: ai?.confidence ?? {},
  };

  // Add regex-discovered URLs to portfolioLinks if not already present
  for (const url of regex.urls) {
    const alreadyExists =
      base.portfolioLinks.some(
        (l) => l.url.toLowerCase() === url.toLowerCase(),
      ) ||
      base.socialHandles.some(
        (h) => h.url?.toLowerCase() === url.toLowerCase(),
      );

    if (!alreadyExists) {
      const type = classifyUrl(url);
      if (isSocialUrl(url)) {
        base.socialHandles.push({ platform: type, handle: "", url });
      } else {
        base.portfolioLinks.push({ url, sourceType: type, label: type });
      }
    }
  }

  // Add regex-discovered instagrams to socialHandles if not present
  for (const handle of regex.instagrams) {
    const exists = base.socialHandles.some(
      (h) =>
        h.platform === "instagram" &&
        h.handle.toLowerCase() === handle.toLowerCase(),
    );
    if (!exists) {
      base.socialHandles.push({
        platform: "instagram",
        handle,
        url: `https://instagram.com/${handle}`,
      });
    }
  }

  // If sourceUrl was provided but not in any list, add it
  if (sourceUrl) {
    const urlLower = sourceUrl.toLowerCase();
    const exists =
      base.portfolioLinks.some((l) => l.url.toLowerCase() === urlLower) ||
      base.socialHandles.some((h) => h.url?.toLowerCase() === urlLower);

    if (!exists) {
      const type = classifyUrl(sourceUrl);
      if (isSocialUrl(sourceUrl)) {
        base.socialHandles.push({ platform: type, handle: "", url: sourceUrl });
      } else {
        base.portfolioLinks.push({
          url: sourceUrl,
          sourceType: type,
          label: type,
        });
      }
    }
  }

  return base;
}

/**
 * Quick regex-only extraction (no AI call). Used for previews or when API is unavailable.
 */
export function runRegexOnly(
  rawText: string,
  sourceUrl?: string,
): ExtractionOutput {
  const regexResult = parseContacts(rawText);
  const platform = detectPlatform(sourceUrl, rawText);

  const data: ExtractionResult = {
    name: null,
    email: regexResult.emails[0] ?? null,
    phone: regexResult.phones[0] ?? null,
    instagram: regexResult.instagrams[0] ?? null,
    portfolioLinks: regexResult.urls
      .filter((u) => !isSocialUrl(u))
      .map((url) => ({
        url,
        sourceType: classifyUrl(url),
        label: classifyUrl(url),
      })),
    socialHandles: regexResult.urls
      .filter((u) => isSocialUrl(u))
      .map((url) => ({
        platform: classifyUrl(url),
        handle: "",
        url,
      })),
    bio: null,
    location: null,
    followerCount: null,
    contentNiche: null,
    confidence: {},
  };

  const fieldConfidence = computeConfidence(data, regexResult, platform);
  const overallConfidence = getOverallConfidence(fieldConfidence);

  return {
    data,
    fieldConfidence,
    overallConfidence,
    platform,
    usedAi: false,
  };
}
