"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  connectedSheets,
  candidates,
  candidateEvents,
  importBatches,
  roles,
} from "@/db/schema";
import { detectMapping } from "@/lib/import/columnHeuristics";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { cleanRows } from "@/lib/import/cleanRows";
import { parseServerCsv } from "@/lib/import/parseServerCsv";
import { createRoleFromData } from "@/lib/actions/roles";
import {
  extractSheetId,
  extractGid,
  fetchSheetCsv,
} from "@/lib/utils/sheet-helpers";
import type { SyncResult } from "@/lib/actions/sheets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a role name for fuzzy matching: lowercase, trim, collapse whitespace.
 */
function normalizeRoleName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(senior|junior|lead|sr\.?|jr\.?|intern)\s+/i, (m) =>
      m.toLowerCase(),
    );
}

/**
 * Find or create a role by name using fuzzy matching.
 * Returns the role ID. Uses a cache map to avoid repeated DB lookups within a sync.
 */
async function findOrCreateRole(
  roleName: string,
  roleCache: Map<string, string>,
): Promise<string> {
  const normalizedInput = normalizeRoleName(roleName);

  // Check cache first
  const cached = roleCache.get(normalizedInput);
  if (cached) return cached;

  // Fetch all active roles and try fuzzy match
  const allRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.isActive, true));

  for (const role of allRoles) {
    const normalizedExisting = normalizeRoleName(role.name);
    if (normalizedExisting === normalizedInput) {
      roleCache.set(normalizedInput, role.id);
      return role.id;
    }
  }

  // No match -- create a new role
  const created = await createRoleFromData(roleName.trim(), "Briefcase");
  if (!created) {
    throw new Error(`Failed to create role "${roleName}"`);
  }

  roleCache.set(normalizedInput, created.id);
  return created.id;
}

// ---------------------------------------------------------------------------
// Sync -- Core Logic
// ---------------------------------------------------------------------------

/**
 * Sync a single connected sheet: fetch CSV, detect new rows, import them.
 *
 * Flow:
 * 1. Fetch the sheet as CSV
 * 2. Parse headers + rows
 * 3. Compare row count with lastRowCount -- skip if no new data
 * 4. Extract only new rows (rows after lastRowCount)
 * 5. Auto-detect column mapping from headers
 * 6. Normalize + clean rows
 * 7. Dedup by email against existing candidates
 * 8. Insert new candidates + create import batch
 * 9. Update lastSyncAt and lastRowCount
 */
export async function syncConnectedSheet(
  sheetDbId: string,
): Promise<SyncResult> {
  // Fetch the sheet record
  const [sheet] = await db
    .select()
    .from(connectedSheets)
    .where(eq(connectedSheets.id, sheetDbId))
    .limit(1);

  if (!sheet) {
    return {
      sheetId: sheetDbId,
      sheetName: "Unknown",
      newRows: 0,
      importedCount: 0,
      skippedDuplicates: 0,
      error: "Connected sheet not found.",
    };
  }

  const result: SyncResult = {
    sheetId: sheet.id,
    sheetName: sheet.name,
    newRows: 0,
    importedCount: 0,
    skippedDuplicates: 0,
  };

  try {
    // 1. Fetch CSV
    const csvText = await fetchSheetCsv(sheet.sheetId, sheet.gid);

    // 2. Parse
    const { headers, rows: allDataRows } = parseServerCsv(csvText);

    if (headers.length === 0 || allDataRows.length === 0) {
      await db
        .update(connectedSheets)
        .set({ lastSyncAt: new Date(), lastError: null })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    const totalCurrentRows = allDataRows.length;

    // 3. Compare row count -- skip if no new rows
    if (totalCurrentRows <= sheet.lastRowCount) {
      await db
        .update(connectedSheets)
        .set({ lastSyncAt: new Date(), lastError: null })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    // 4. Extract only new rows
    const newDataRows = allDataRows.slice(sheet.lastRowCount);
    result.newRows = newDataRows.length;

    // 5. Auto-detect column mapping
    const { mapping } = detectMapping(headers);

    if (mapping.name === undefined) {
      const errorMsg =
        "Could not detect a name column in the sheet headers. Check sheet structure.";
      await db
        .update(connectedSheets)
        .set({ lastSyncAt: new Date(), lastError: errorMsg })
        .where(eq(connectedSheets.id, sheet.id));
      return { ...result, error: errorMsg };
    }

    // 6. Normalize + clean
    const normalized = normalizeRows(newDataRows, mapping);
    const withNames = normalized.filter((r) => r.name && r.name.trim() !== "");

    if (withNames.length === 0) {
      await db
        .update(connectedSheets)
        .set({
          lastSyncAt: new Date(),
          lastRowCount: totalCurrentRows,
          lastError: null,
        })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    const cleaned = cleanRows(withNames);

    // 7. Dedup by email
    const emails = cleaned
      .map((r) => r.email)
      .filter((e): e is string => e !== null && e !== "");

    const existingEmailSet = new Set<string>();

    if (emails.length > 0) {
      const existing = await db
        .select({ email: candidates.email })
        .from(candidates)
        .where(inArray(candidates.email, emails));

      for (const row of existing) {
        if (row.email) existingEmailSet.add(row.email.toLowerCase());
      }
    }

    const toImport = cleaned.filter((r) => {
      if (r.email && existingEmailSet.has(r.email.toLowerCase())) return false;
      return true;
    });

    result.skippedDuplicates = cleaned.length - toImport.length;

    if (toImport.length === 0) {
      await db
        .update(connectedSheets)
        .set({
          lastSyncAt: new Date(),
          lastRowCount: totalCurrentRows,
          lastError: null,
        })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    // 8. Resolve role IDs for each row
    const isAutoDetect = sheet.autoDetectRole;
    const roleColIdx = isAutoDetect
      ? (sheet.roleColumnIndex ?? mapping.role)
      : undefined;

    const roleCache = new Map<string, string>();

    if (!isAutoDetect && sheet.roleId) {
      roleCache.set("__fixed__", sheet.roleId);
    }

    const rowRoleIds: string[] = [];
    for (const row of toImport) {
      if (isAutoDetect && roleColIdx !== undefined) {
        const originalRow = newDataRows[row._rowIndex];
        const rawRoleValue = originalRow
          ? String(originalRow[roleColIdx] ?? "").trim()
          : "";

        if (rawRoleValue) {
          const resolvedRoleId = await findOrCreateRole(
            rawRoleValue,
            roleCache,
          );
          rowRoleIds.push(resolvedRoleId);
        } else {
          if (sheet.roleId) {
            rowRoleIds.push(sheet.roleId);
          } else {
            rowRoleIds.push("");
          }
        }
      } else {
        rowRoleIds.push(sheet.roleId ?? "");
      }
    }

    const importable = toImport.filter((_, i) => rowRoleIds[i] !== "");
    const importableRoleIds = rowRoleIds.filter((id) => id !== "");
    const skippedNoRole = toImport.length - importable.length;
    result.skippedDuplicates += skippedNoRole;

    if (importable.length === 0) {
      await db
        .update(connectedSheets)
        .set({
          lastSyncAt: new Date(),
          lastRowCount: totalCurrentRows,
          lastError: null,
        })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    // 9. Create import batch + insert candidates in a transaction
    const roleGroups = new Map<string, typeof importable>();
    for (let i = 0; i < importable.length; i++) {
      const rId = importableRoleIds[i];
      const group = roleGroups.get(rId) ?? [];
      group.push(importable[i]);
      roleGroups.set(rId, group);
    }

    await db.transaction(async (tx) => {
      let totalInserted = 0;

      for (const [roleId, groupRows] of roleGroups) {
        const [batch] = await tx
          .insert(importBatches)
          .values({
            roleId,
            source: "csv",
            totalRows: groupRows.length,
            importedCount: 0,
            skippedCount: 0,
            createdBy: "sheet-sync",
          })
          .returning({ id: importBatches.id });

        const insertValues = groupRows.map((row) => ({
          roleId,
          name: row.name!,
          email: row.email ?? null,
          phone: row.phone ?? null,
          instagram: row.instagram ?? null,
          portfolioUrl: row.portfolioUrl ?? null,
          linkedinUrl: row.linkedinUrl ?? null,
          location: row.location ?? null,
          experience: row.experience ?? null,
          resumeUrl: row.resumeUrl ?? null,
          isDuplicate: false,
          source: "csv" as const,
          importBatchId: batch.id,
          createdBy: "sheet-sync",
        }));

        const inserted = await tx
          .insert(candidates)
          .values(insertValues)
          .returning({ id: candidates.id });

        if (inserted.length > 0) {
          await tx.insert(candidateEvents).values(
            inserted.map((c) => ({
              candidateId: c.id,
              eventType: "imported",
              fromValue: null,
              toValue: "left_to_review",
              createdBy: "sheet-sync",
            })),
          );
        }

        await tx
          .update(importBatches)
          .set({ importedCount: inserted.length })
          .where(eq(importBatches.id, batch.id));

        totalInserted += inserted.length;
      }

      result.importedCount = totalInserted;
    });

    // Update sheet sync metadata
    await db
      .update(connectedSheets)
      .set({
        lastSyncAt: new Date(),
        lastRowCount: totalCurrentRows,
        lastError: null,
      })
      .where(eq(connectedSheets.id, sheet.id));

    revalidatePath("/", "layout");
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown sync error.";
    console.error(`[syncConnectedSheet] Error for ${sheet.name}:`, err);

    await db
      .update(connectedSheets)
      .set({ lastSyncAt: new Date(), lastError: errorMsg })
      .where(eq(connectedSheets.id, sheet.id));

    return { ...result, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// Sync All -- Used by cron
// ---------------------------------------------------------------------------

/**
 * Determine which sheets are due for sync based on their frequency:
 * - hourly: last synced > 1 hour ago (or never)
 * - daily: last synced > 24 hours ago (or never)
 * - manual: never auto-synced
 */
export async function syncDueSheets(): Promise<SyncResult[]> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const activeSheets = await db
    .select()
    .from(connectedSheets)
    .where(
      and(
        eq(connectedSheets.isActive, true),
        or(
          eq(connectedSheets.syncFrequency, "hourly"),
          eq(connectedSheets.syncFrequency, "daily"),
        ),
      ),
    );

  const dueSheets = activeSheets.filter((sheet) => {
    if (!sheet.lastSyncAt) return true;

    if (sheet.syncFrequency === "hourly") {
      return sheet.lastSyncAt <= oneHourAgo;
    }

    if (sheet.syncFrequency === "daily") {
      return sheet.lastSyncAt <= oneDayAgo;
    }

    return false;
  });

  const results: SyncResult[] = [];
  for (const sheet of dueSheets) {
    const syncResult = await syncConnectedSheet(sheet.id);
    results.push(syncResult);
  }

  return results;
}
