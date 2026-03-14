"use server";

import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import type { ParseResult, RawRow } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// URL validation helpers
// ---------------------------------------------------------------------------

const GOOGLE_SHEETS_REGEX =
  /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

type SpreadsheetUrlKind = "google_sheets" | "direct_csv" | "direct_xlsx" | "unsupported";

interface UrlInfo {
  kind: SpreadsheetUrlKind;
  fetchUrl: string;
  /** Google Sheet ID (only for google_sheets kind) */
  sheetId?: string;
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
    const headers = (headerRow as unknown[]).map((h) =>
      String(h ?? "").trim(),
    );
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
            ? String(row[emailIdx] ?? "").trim().toLowerCase()
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
        error: "Request timed out after 15 seconds. Please check the URL and try again.",
      };
    }
    return {
      success: false,
      error: "Could not fetch the file. Please check the URL and your network connection.",
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
        return { success: false, error: "The CSV file appears to be empty or has no data rows." };
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
      return { success: false, error: "The spreadsheet appears to be empty or has no data rows." };
    }

    return { success: true, data, source: "excel" };
  } catch {
    return {
      success: false,
      error: "Failed to parse the spreadsheet. The file may be corrupted or in an unsupported format.",
    };
  }
}
