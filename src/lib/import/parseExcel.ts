// NOTE: This file must only be imported from client components.
// SheetJS uses browser APIs (ArrayBuffer, FileReader) not available server-side.
import * as XLSX from "xlsx";

import type { ParseResult, RawRow } from "./types";

/**
 * Parse an Excel file (.xlsx or .xls) into a ParseResult.
 *
 * Uses the first sheet only. Returns the first row as headers and all
 * subsequent non-empty rows as data. Empty rows (all cells undefined or
 * empty string) are filtered out.
 *
 * Must be called from a client component — SheetJS requires browser APIs.
 */
/**
 * Parse an Excel file. If multiple sheets share identical headers (e.g. Google
 * Forms "Form responses 1" + "Duplicate"), their rows are merged automatically.
 * Otherwise only the first sheet is used.
 */
export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);

          if (workbook.SheetNames.length === 0) {
            reject(new Error("Excel file contains no sheets"));
            return;
          }

          // Parse all sheets
          const SKIP = ["summary"];
          const parsed: { headers: string[]; rows: RawRow[] }[] = [];

          for (const sheetName of workbook.SheetNames) {
            if (SKIP.includes(sheetName.toLowerCase())) continue;
            const ws = workbook.Sheets[sheetName];
            if (!ws) continue;

            const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
              header: 1,
            });
            if (data.length < 2) continue;

            const [headerRow, ...dataRows] = data as unknown[][];
            const headers = (headerRow as unknown[]).map((h) =>
              String(h ?? "").trim(),
            );
            const rows: RawRow[] = dataRows.filter((row) =>
              row.some(
                (cell) => cell !== undefined && String(cell).trim() !== "",
              ),
            );

            if (rows.length > 0) {
              parsed.push({ headers, rows });
            }
          }

          if (parsed.length === 0) {
            resolve({ headers: [], rows: [] });
            return;
          }

          // Check if all sheets share the same headers — merge if so
          const firstKey = parsed[0].headers.join("|").toLowerCase();
          const allSame = parsed.every(
            (p) => p.headers.join("|").toLowerCase() === firstKey,
          );

          if (allSame && parsed.length > 1) {
            // Merge rows from all sheets, deduplicate by email/name combo
            const seen = new Set<string>();
            const mergedRows: RawRow[] = [];
            // Find email column index for dedup
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

            resolve({ headers: parsed[0].headers, rows: mergedRows });
          } else {
            // Use first sheet only
            resolve({ headers: parsed[0].headers, rows: parsed[0].rows });
          }
        } catch (err) {
          reject(new Error("Failed to parse Excel file"));
        }
      })
      .catch(() => {
        reject(new Error("Failed to read file contents"));
      });
  });
}
