/**
 * URL scraping — converts portfolio URLs to text content.
 * Primary: Firecrawl API (best quality markdown)
 * Fallback: Direct fetch + HTML-to-text (faster, works everywhere)
 */

export type ScrapeResult =
  | { success: true; markdown: string; url: string }
  | { success: false; error: string; url: string };

const TIMEOUT_MS = 7_000;

/** Platforms that can't be scraped */
const UNSUPPORTED_PATTERNS = [
  /instagram\.com/i,
  /tiktok\.com/i,
  /youtube\.com\/@/i,
  /youtu\.be\//i,
];

function isUnsupportedPlatform(url: string): boolean {
  return UNSUPPORTED_PATTERNS.some((re) => re.test(url));
}

function truncateMarkdown(markdown: string): string {
  const MAX_TOTAL = 5_000;
  if (markdown.length <= MAX_TOTAL) return markdown;
  const head = markdown.slice(0, 3_000);
  const tail = markdown.slice(-2_000);
  return `${head}\n\n[...content truncated...]\n\n${tail}`;
}

/** Strip HTML tags and extract readable text */
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Direct fetch fallback — fetches HTML and extracts text.
 * Works on all hosting platforms, no external API needed.
 */
async function directFetch(url: string): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; HireFlowBot/1.0; +https://hireflow.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}`, url };
    }

    const html = await resp.text();
    const text = htmlToText(html);

    if (!text || text.length < 20) {
      return { success: false, error: "No readable content found", url };
    }

    return { success: true, markdown: truncateMarkdown(text), url };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "Request timed out", url };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Fetch failed",
      url,
    };
  }
}

/**
 * Scrape a portfolio URL. Tries Firecrawl first, falls back to direct fetch.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  if (isUnsupportedPlatform(url)) {
    return {
      success: false,
      error: "This platform cannot be scraped automatically. Please enter details manually.",
      url,
    };
  }

  // Try Firecrawl first (better quality)
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (apiKey) {
    try {
      const { FirecrawlAppV1 } = await import("@mendable/firecrawl-js");
      const firecrawl = new FirecrawlAppV1({ apiKey });

      const result = await Promise.race([
        firecrawl.scrapeUrl(url, { formats: ["markdown"] }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
      ]);

      if (result && result.success && result.markdown?.trim()) {
        return {
          success: true,
          markdown: truncateMarkdown(result.markdown),
          url,
        };
      }
      // Firecrawl failed or timed out — fall through to direct fetch
    } catch {
      // Firecrawl error — fall through to direct fetch
    }
  }

  // Fallback: direct HTML fetch
  return directFetch(url);
}
