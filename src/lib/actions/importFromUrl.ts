"use server";

import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import type { ParseResult, RawRow } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// URL validation helpers
// ---------------------------------------------------------------------------

const GOOGLE_SHEETS_REGEX =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

type SpreadsheetUrlKind =
  | "google_sheets"
  | "direct_csv"
  | "direct_xlsx"
  | "unsupported";

interface UrlInfo {
  kind: SpreadsheetUrlKind;
  fetchUrl: string;
  /** Google Sheet ID (only for google_sheets kind) */
  sheetId?: string;
}

// ---------------------------------------------------------------------------
// SSRF protection — block private/internal IPs and restrict to allowed hosts
// ---------------------------------------------------------------------------

/** Check if a hostname resolves to a private/internal IP range */
function isPrivateOrInternalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Block obvious internal hostnames
  const blocked = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "metadata.google.internal",
    "169.254.169.254",
  ];
  if (blocked.includes(lower)) return true;

  // Block .local, .internal, .localhost TLDs
  if (
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    return true;
  }

  // Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, 127.x, 0.x)
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
  );
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    if (a === 0) return true;
  }

  return false;
}

/**
 * Validate that a URL is safe to fetch (not SSRF).
 * Only allows: docs.google.com and URLs ending in .csv/.xlsx/.xls.
 * Returns an error message string if invalid, null if safe.
 */
function validateUrlSafety(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid URL format.";
  }

  // Only allow http(s)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Only HTTP and HTTPS URLs are supported.";
  }

  // Block private/internal hostnames
  if (isPrivateOrInternalHostname(parsed.hostname)) {
    return "URLs pointing to private or internal addresses are not allowed.";
  }

  // Google Sheets is always allowed
  if (parsed.hostname === "docs.google.com") {
    return null;
  }

  // For non-Google hosts, only allow direct .csv/.xlsx/.xls file URLs
  const pathLower = parsed.pathname.toLowerCase();
  if (
    pathLower.endsWith(".csv") ||
    pathLower.endsWith(".xlsx") ||
    pathLower.endsWith(".xls")
  ) {
    return null;
  }

  return "Only Google Sheets links and direct .csv/.xlsx/.xls file URLs are supported.";
}

function classifyUrl(raw: string): UrlInfo {
  const url = raw.trim();

  // Google Sheets
  const gMatch = url.match(GOOGLE_SHEETS_REGEX);
  if (gMatch) {
    const sheetId = gMatch[1];
    // Extract gid if present in the original URL
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : "";
    return {
      kind: "google_sheets",
      fetchUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`,
      sheetId,
    };
  }

  // Direct file URLs
  const lower = url.toLowerCase();
  if (lower.endsWith(".csv")) {
    return { kind: "direct_csv", fetchUrl: url };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return { kind: "direct_xlsx", fetchUrl: url };
  }

  return { kind: "unsupported", fetchUrl: url };
}

// ---------------------------------------------------------------------------
// Excel buffer parser (server-safe, no File/FileReader needed)
// ---------------------------------------------------------------------------

function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer);

  if (workbook.SheetNames.length === 0) {
    return { headers: [], rows: [] };
  }

  const SKIP = ["summary"];
  const parsed: { headers: string[]; rows: RawRow[] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (SKIP.includes(sheetName.toLowerCase())) continue;
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    if (data.length < 2) continue;

    const [headerRow, ...dataRows] = data as unknown[][];
    const headers = (headerRow as unknown[]).map((h) => String(h ?? "").trim());
    const rows: RawRow[] = dataRows.filter((row) =>
      row.some((cell) => cell !== undefined && String(cell).trim() !== ""),
    );

    if (rows.length > 0) {
      parsed.push({ headers, rows });
    }
  }

  if (parsed.length === 0) {
    return { headers: [], rows: [] };
  }

  // Merge sheets with identical headers (like Google Forms duplicates)
  const firstKey = parsed[0].headers.join("|").toLowerCase();
  const allSame = parsed.every(
    (p) => p.headers.join("|").toLowerCase() === firstKey,
  );

  if (allSame && parsed.length > 1) {
    const seen = new Set<string>();
    const mergedRows: RawRow[] = [];
    const emailIdx = parsed[0].headers.findIndex((h) =>
      h.toLowerCase().includes("email"),
    );

    for (const sheet of parsed) {
      for (const row of sheet.rows) {
        const key =
          emailIdx >= 0
            ? String(row[emailIdx] ?? "")
                .trim()
                .toLowerCase()
            : "";
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        mergedRows.push(row);
      }
    }

    return { headers: parsed[0].headers, rows: mergedRows };
  }

  return { headers: parsed[0].headers, rows: parsed[0].rows };
}

// ---------------------------------------------------------------------------
// CSV text parser (server-safe)
// ---------------------------------------------------------------------------

function parseCsvText(text: string): ParseResult {
  const cleaned = text.replace(/^\ufeff/, "");

  const result = Papa.parse<unknown[]>(cleaned, {
    header: false,
    skipEmptyLines: true,
    delimiter: "",
  });

  if (result.data.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = result.data as unknown[][];
  const headers = (headerRow as unknown[]).map((h) => String(h ?? "").trim());

  return { headers, rows: dataRows };
}

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

type ImportFromUrlResult =
  | { success: true; data: ParseResult; source: "excel" | "csv" }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Main server action
// ---------------------------------------------------------------------------

export async function importFromUrl(url: string): Promise<ImportFromUrlResult> {
  // 1. Validate URL format
  if (!url || !url.trim()) {
    return { success: false, error: "Please enter a URL." };
  }

  const trimmed = url.trim();

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return { success: false, error: "URL must start with http:// or https://" };
  }

  // SSRF protection — block private IPs, internal hosts, and unsupported domains
  const safetyError = validateUrlSafety(trimmed);
  if (safetyError) {
    return { success: false, error: safetyError };
  }

  const info = classifyUrl(trimmed);

  if (info.kind === "unsupported") {
    return {
      success: false,
      error:
        "Unsupported URL format. Supported: Google Sheets links, or direct .csv / .xlsx file URLs.",
    };
  }

  // 2. Fetch the file
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    response = await fetch(info.fetchUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Some servers require a user-agent
        "User-Agent": "HireFlow/1.0",
      },
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        success: false,
        error:
          "Request timed out after 15 seconds. Please check the URL and try again.",
      };
    }
    return {
      success: false,
      error:
        "Could not fetch the file. Please check the URL and your network connection.",
    };
  }

  if (!response.ok) {
    if (info.kind === "google_sheets") {
      return {
        success: false,
        error:
          "Could not access this Google Sheet. Make sure it is public: Share > Anyone with the link > Viewer.",
      };
    }
    return {
      success: false,
      error: `Failed to fetch file (HTTP ${response.status}). Please check the URL.`,
    };
  }

  // 3. Check content type to detect HTML error pages (private Google Sheets)
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/html")) {
    if (info.kind === "google_sheets") {
      return {
        success: false,
        error:
          "This sheet is not public. Please make it public first: Share > Anyone with the link > Viewer.",
      };
    }
    return {
      success: false,
      error: "The URL returned an HTML page instead of a spreadsheet file.",
    };
  }

  // 4. Parse the response
  try {
    if (info.kind === "direct_csv") {
      const text = await response.text();
      const data = parseCsvText(text);

      if (data.headers.length === 0 || data.rows.length === 0) {
        return {
          success: false,
          error: "The CSV file appears to be empty or has no data rows.",
        };
      }

      return { success: true, data, source: "csv" };
    }

    // Excel (Google Sheets export or direct xlsx/xls URL)
    const buffer = await response.arrayBuffer();

    // Extra safety: check if the buffer starts with HTML doctype
    const firstBytes = new Uint8Array(buffer.slice(0, 50));
    const prefix = new TextDecoder().decode(firstBytes).trim().toLowerCase();
    if (prefix.startsWith("<!doctype") || prefix.startsWith("<html")) {
      if (info.kind === "google_sheets") {
        return {
          success: false,
          error:
            "This sheet is not public. Please make it public first: Share > Anyone with the link > Viewer.",
        };
      }
      return {
        success: false,
        error: "The URL returned an HTML page instead of a spreadsheet file.",
      };
    }

    const data = parseExcelBuffer(buffer);

    if (data.headers.length === 0 || data.rows.length === 0) {
      return {
        success: false,
        error: "The spreadsheet appears to be empty or has no data rows.",
      };
    }

    return { success: true, data, source: "excel" };
  } catch {
    return {
      success: false,
      error:
        "Failed to parse the spreadsheet. The file may be corrupted or in an unsupported format.",
    };
  }
}
