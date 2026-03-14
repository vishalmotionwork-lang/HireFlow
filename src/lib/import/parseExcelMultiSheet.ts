/**
 * Multi-sheet Excel parser for importing candidates across multiple roles.
 * Each sheet is treated as a separate role's candidates.
 */
import * as XLSX from "xlsx";
import type { RawRow } from "./types";

export interface SheetData {
  /** Sheet name from the Excel file (often the role name) */
  sheetName: string;
  /** Column headers from the first row */
  headers: string[];
  /** Data rows (excluding header) */
  rows: RawRow[];
}

export interface MultiSheetResult {
  sheets: SheetData[];
}

/**
 * Parse a multi-sheet Excel file. Returns all sheets that contain data rows.
 * Skips sheets named "Summary" or sheets with no data.
 */
export function parseExcelMultiSheet(file: File): Promise<MultiSheetResult> {
  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);
          const sheets: SheetData[] = [];

          for (const sheetName of workbook.SheetNames) {
            // Skip summary/overview sheets
            if (sheetName.toLowerCase() === "summary") continue;

            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;

            const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
              header: 1,
            });

            if (data.length < 2) continue; // need header + at least 1 row

            const [headerRow, ...dataRows] = data as unknown[][];

            const headers = (headerRow as unknown[]).map((h) =>
              String(h ?? "").trim(),
            );

            // Filter empty rows
            const rows: RawRow[] = dataRows.filter((row) =>
              row.some(
                (cell) => cell !== undefined && String(cell).trim() !== "",
              ),
            );

            if (rows.length === 0) continue;

            sheets.push({ sheetName, headers, rows });
          }

          resolve({ sheets });
        } catch {
          reject(new Error("Failed to parse Excel file"));
        }
      })
      .catch(() => {
        reject(new Error("Failed to read file contents"));
      });
  });
}

/** Sheet name patterns that indicate generic/form-like sheets (NOT role names) */
const GENERIC_SHEET_PATTERNS = [
  /^form\s*responses?/i,
  /^duplicate/i,
  /^sheet\d+$/i,
  /^data$/i,
  /^copy\s*of/i,
  /^raw$/i,
];

function isGenericSheetName(name: string): boolean {
  return GENERIC_SHEET_PATTERNS.some((p) => p.test(name.trim()));
}

/**
 * Detect if an Excel file has multiple data sheets that represent
 * different roles (multi-role format where each sheet = one role).
 *
 * Returns true when:
 * - 2+ data sheets exist AND
 * - Either headers differ across sheets, OR
 * - Headers are identical but sheet names look like role names (not generic)
 *
 * Returns false when:
 * - Only 0-1 data sheets exist
 * - All sheets are generic (Sheet1, Sheet2, Form Responses, etc.)
 */
export function isMultiSheetExcel(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);
          const SKIP_NAMES = ["summary"];

          const sheetHeaders: string[][] = [];
          const sheetNames: string[] = [];

          for (const sheetName of workbook.SheetNames) {
            if (SKIP_NAMES.includes(sheetName.toLowerCase())) continue;
            const ws = workbook.Sheets[sheetName];
            if (!ws) continue;

            const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
              header: 1,
            });
            if (data.length < 2) continue;

            const headers = (data[0] as unknown[]).map((h) =>
              String(h ?? "")
                .trim()
                .toLowerCase(),
            );
            sheetHeaders.push(headers);
            sheetNames.push(sheetName);
          }

          // Need 2+ data sheets
          if (sheetHeaders.length < 2) {
            resolve(false);
            return;
          }

          // Check if headers differ across sheets
          const firstKey = sheetHeaders[0].join("|");
          const allSameHeaders = sheetHeaders.every(
            (h) => h.join("|") === firstKey,
          );

          if (!allSameHeaders) {
            // Different headers = definitely multi-role
            resolve(true);
            return;
          }

          // Same headers — check if sheet names look like role names
          // If most sheet names are descriptive (not generic), treat as multi-role
          const genericCount = sheetNames.filter(isGenericSheetName).length;
          const descriptiveCount = sheetNames.length - genericCount;

          // If at least 2 sheets have descriptive names, it's multi-role
          if (descriptiveCount >= 2) {
            resolve(true);
            return;
          }

          // All generic sheet names with same headers = not multi-role
          resolve(false);
        } catch {
          resolve(false);
        }
      })
      .catch(() => resolve(false));
  });
}
