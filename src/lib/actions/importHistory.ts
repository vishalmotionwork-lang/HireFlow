"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { importBatches, roles } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DuplicateSheetMatch {
  batchId: string;
  sourceName: string | null;
  importedCount: number;
  createdAt: Date;
}

export interface ImportHistoryEntry {
  id: string;
  source: string;
  sourceName: string | null;
  sourceUrl: string | null;
  roleName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  createdBy: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// checkDuplicateSheet — check if a file/URL was already imported
// ---------------------------------------------------------------------------

export async function checkDuplicateSheet(
  sourceHash: string,
): Promise<DuplicateSheetMatch | null> {
  if (!sourceHash) return null;

  const [match] = await db
    .select({
      batchId: importBatches.id,
      sourceName: importBatches.sourceName,
      importedCount: importBatches.importedCount,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.sourceHash, sourceHash))
    .orderBy(desc(importBatches.createdAt))
    .limit(1);

  return match ?? null;
}

// ---------------------------------------------------------------------------
// getImportHistory — list past imports sorted by most recent
// ---------------------------------------------------------------------------

export async function getImportHistory(
  limit = 50,
): Promise<ImportHistoryEntry[]> {
  const rows = await db
    .select({
      id: importBatches.id,
      source: importBatches.source,
      sourceName: importBatches.sourceName,
      sourceUrl: importBatches.sourceUrl,
      roleName: roles.name,
      totalRows: importBatches.totalRows,
      importedCount: importBatches.importedCount,
      skippedCount: importBatches.skippedCount,
      createdBy: importBatches.createdBy,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .innerJoin(roles, eq(importBatches.roleId, roles.id))
    .orderBy(desc(importBatches.createdAt))
    .limit(limit);

  return rows;
}
