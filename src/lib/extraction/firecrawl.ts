/**
 * Firecrawl scraping wrapper — converts portfolio URLs to markdown.
 * Returns a structured ScrapeResult union type; never throws.
 *
 * Uses FirecrawlAppV1 (legacy API) which has the scrapeUrl method
 * compatible with our use case.
 */

import { FirecrawlAppV1 } from "@mendable/firecrawl-js";

export type ScrapeResult =
  | { success: true; markdown: string; url: string }
  | { success: false; error: string; url: string };

const TIMEOUT_MS = 30_000;

/** Platforms that Firecrawl cannot scrape */
const UNSUPPORTED_PATTERNS = [
  /instagram\.com/i,
  /tiktok\.com/i,
  /youtube\.com\/@/i,
  /youtu\.be\//i,
];

function isUnsupportedPlatform(url: string): boolean {
  return UNSUPPORTED_PATTERNS.some((re) => re.test(url));
}

/**
 * Smart markdown truncation: keep the first 3000 chars (intro/bio) and
 * last 2000 chars (footer often has contact info) from the scraped page.
 * This avoids losing critical contact info found at the bottom of long pages.
 */
function truncateMarkdown(markdown: string): string {
  const MAX_TOTAL = 5_000;
  if (markdown.length <= MAX_TOTAL) return markdown;

  const head = markdown.slice(0, 3_000);
  const tail = markdown.slice(-2_000);
  return `${head}\n\n[...content truncated...]\n\n${tail}`;
}

/**
 * Scrape a portfolio URL and return clean markdown.
 * Handles unsupported platforms and network errors gracefully.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Fast-path: detect platforms that can't be scraped
  if (isUnsupportedPlatform(url)) {
    return {
      success: false,
      error:
        "This platform cannot be scraped automatically. Please enter details manually.",
      url,
    };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Firecrawl API key is not configured.",
      url,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const firecrawl = new FirecrawlAppV1({ apiKey });

    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
    });

    clearTimeout(timeoutId);

    if (!result.success) {
      const errorMsg: string =
        (result as { error?: string }).error ?? "Scrape failed";

      // Detect unsupported platform errors from Firecrawl itself
      if (
        errorMsg.toLowerCase().includes("no longer supported") ||
        errorMsg.toLowerCase().includes("not supported")
      ) {
        return {
          success: false,
          error:
            "This platform cannot be scraped automatically. Please enter details manually.",
          url,
        };
      }

      return { success: false, error: errorMsg, url };
    }

    const markdown = result.markdown ?? "";
    if (!markdown.trim()) {
      return {
        success: false,
        error: "No content found at this URL.",
        url,
      };
    }

    return {
      success: true,
      markdown: truncateMarkdown(markdown),
      url,
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: `Scrape timed out after ${TIMEOUT_MS / 1000}s. The site may be too slow or blocking scrapers.`,
        url,
      };
    }

    const message = err instanceof Error ? err.message : "Unknown scrape error";
    return { success: false, error: message, url };
  }
}
