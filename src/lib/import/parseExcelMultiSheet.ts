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

/**
 * Detect if an Excel file has multiple data sheets with DIFFERENT headers
 * (multi-role format where each sheet = one role).
 *
 * Returns false when:
 * - Only 0-1 data sheets exist
 * - All sheets share identical headers (Google Forms / duplicated data)
 * - Sheet names suggest form responses ("Form responses", "Duplicate", etc.)
 */
export function isMultiSheetExcel(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);
          const SKIP_NAMES = ["summary"];
          const FORM_PATTERNS = [
            /^form\s*responses?/i,
            /^duplicate/i,
            /^sheet\d+$/i,
          ];

          const sheetHeaders: string[][] = [];
          let formLikeSheets = 0;

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

            if (FORM_PATTERNS.some((p) => p.test(sheetName))) {
              formLikeSheets++;
            }
          }

          // Need 2+ data sheets to be multi-role
          if (sheetHeaders.length < 2) {
            resolve(false);
            return;
          }

          // If all sheets have identical headers, it's a form response (not multi-role)
          const firstKey = sheetHeaders[0].join("|");
          const allSameHeaders = sheetHeaders.every(
            (h) => h.join("|") === firstKey,
          );
          if (allSameHeaders) {
            resolve(false);
            return;
          }

          // If most sheets look like form responses, not multi-role
          if (formLikeSheets >= sheetHeaders.length - 1) {
            resolve(false);
            return;
          }

          resolve(true);
        } catch {
          resolve(false);
        }
      })
      .catch(() => resolve(false));
  });
}
