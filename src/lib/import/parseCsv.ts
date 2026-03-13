import * as Papa from "papaparse";

import type { ParseResult, RawRow } from "./types";

/**
 * Parse a CSV string (e.g. pasted from clipboard) into a ParseResult.
 *
 * Strips BOM (\ufeff) before parsing to handle UTF-8-BOM exports from Excel.
 * Auto-detects delimiter. Skips empty lines.
 */
export function parseCsvString(input: string): ParseResult {
  // Strip BOM if present — Excel UTF-8 exports prepend \ufeff
  const cleaned = input.replace(/^\ufeff/, "");

  const result = Papa.parse<unknown[]>(cleaned, {
    header: false, // Return arrays for consistency with parseExcelFile
    skipEmptyLines: true,
    delimiter: "", // Auto-detect delimiter
  });

  if (result.data.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = result.data as unknown[][];

  const headers = (headerRow as unknown[]).map((h) => String(h ?? "").trim());
  const rows: RawRow[] = dataRows;

  return { headers, rows };
}

/**
 * Parse a CSV File object (from file upload) into a ParseResult.
 *
 * Uses PapaParse's file mode with a Promise wrapper.
 * Skips empty lines. Auto-detects delimiter.
 */
export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      delimiter: "",
      complete: (result) => {
        if (result.data.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const [headerRow, ...dataRows] = result.data as unknown[][];

        const headers = (headerRow as unknown[]).map((h) =>
          String(h ?? "").trim(),
        );
        const rows: RawRow[] = dataRows;

        resolve({ headers, rows });
      },
      error: (err) => {
        reject(new Error(err.message));
      },
    });
  });
}
