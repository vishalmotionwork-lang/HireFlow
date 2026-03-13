// NOTE: This file must only be imported from client components.
// SheetJS uses browser APIs (ArrayBuffer, FileReader) not available server-side.
import * as XLSX from 'xlsx';

import type { ParseResult, RawRow } from './types';

/**
 * Parse an Excel file (.xlsx or .xls) into a ParseResult.
 *
 * Uses the first sheet only. Returns the first row as headers and all
 * subsequent non-empty rows as data. Empty rows (all cells undefined or
 * empty string) are filtered out.
 *
 * Must be called from a client component — SheetJS requires browser APIs.
 */
export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    file
      .arrayBuffer()
      .then((buffer) => {
        try {
          const workbook = XLSX.read(buffer);
          const sheetName = workbook.SheetNames[0];

          if (!sheetName) {
            reject(new Error('Excel file contains no sheets'));
            return;
          }

          const worksheet = workbook.Sheets[sheetName];

          // header: 1 returns an array of arrays; empty cells become undefined
          const data = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
            header: 1,
          });

          if (data.length === 0) {
            resolve({ headers: [], rows: [] });
            return;
          }

          const [headerRow, ...dataRows] = data as unknown[][];

          const headers = (headerRow as unknown[]).map((h) =>
            String(h ?? '').trim(),
          );

          // Filter out completely empty rows (all cells undefined or empty string)
          const rows: RawRow[] = dataRows.filter((row) =>
            row.some(
              (cell) => cell !== undefined && String(cell).trim() !== '',
            ),
          );

          resolve({ headers, rows });
        } catch (err) {
          reject(new Error('Failed to parse Excel file'));
        }
      })
      .catch(() => {
        reject(new Error('Failed to read file contents'));
      });
  });
}
