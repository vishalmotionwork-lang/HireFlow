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
 * Detect if an Excel file has multiple data sheets (multi-role format).
 * Returns true if there are 2+ sheets with data (excluding "Summary").
 */
export function isMultiSheetExcel(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);
          let dataSheetCount = 0;

          for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase() === "summary") continue;
            const ws = workbook.Sheets[sheetName];
            if (!ws) continue;

            const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
              header: 1,
            });
            if (data.length >= 2) dataSheetCount++;
            if (dataSheetCount >= 2) {
              resolve(true);
              return;
            }
          }

          resolve(false);
        } catch {
          resolve(false);
        }
      })
      .catch(() => resolve(false));
  });
}
