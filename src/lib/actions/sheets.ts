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
import { detectMapping, ROLE_KEYWORDS } from "@/lib/import/columnHeuristics";
import { normalizeRows } from "@/lib/import/normalizeRows";
import { cleanRows } from "@/lib/import/cleanRows";
import { createRoleFromData } from "@/lib/actions/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectedSheet = typeof connectedSheets.$inferSelect;
export type SyncFrequency = "manual" | "hourly" | "daily";

export interface ConnectSheetInput {
  name: string;
  sheetUrl: string;
  roleId: string | null; // null when auto-detecting roles
  syncFrequency: SyncFrequency;
  autoDetectRole?: boolean;
  roleColumnIndex?: number | null;
  gid?: string | null;
}

export interface DetectRoleColumnResult {
  hasRoleColumn: boolean;
  roleColumnIndex: number | null;
  roleColumnHeader: string | null;
  headers: string[];
}

export interface SyncResult {
  sheetId: string;
  sheetName: string;
  newRows: number;
  importedCount: number;
  skippedDuplicates: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the Google Sheet ID from various URL formats.
 * Supports:
 *   - https://docs.google.com/spreadsheets/d/{ID}/edit
 *   - https://docs.google.com/spreadsheets/d/{ID}/export?...
 *   - Just the raw ID string
 */
function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Fallback: if it looks like a raw ID (no slashes, alphanumeric)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();

  return null;
}

/**
 * Extract the GID from a Google Sheet URL hash (#gid=123).
 */
function extractGid(url: string): string | null {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch a Google Sheet as CSV text via the public export endpoint.
 * Throws with a user-friendly message if the sheet is not accessible.
 */
async function fetchSheetCsv(
  sheetId: string,
  gid: string | null,
): Promise<string> {
  const gidParam = gid ? `&gid=${gid}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;

  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
    // No cache — always fetch fresh data
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Sheet not found. Check that the URL is correct and the sheet exists.",
      );
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error(
        "Sheet is not publicly accessible. Go to Share > Anyone with the link > Viewer.",
      );
    }
    throw new Error(
      `Failed to fetch sheet (HTTP ${response.status}). Ensure it is shared as public.`,
    );
  }

  const text = await response.text();

  // Google sometimes returns an HTML sign-in page for private sheets
  if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
    throw new Error(
      "Sheet is not publicly accessible. Go to Share > Anyone with the link > Viewer.",
    );
  }

  return text;
}

/**
 * Parse CSV text into headers + rows (server-side, no PapaParse dependency).
 * Handles quoted fields, newlines inside quotes, and escaped quotes.
 */
function parseServerCsv(csvText: string): {
  headers: string[];
  rows: unknown[][];
} {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (char === "\r" && !inQuotes) {
      // Skip \r, handle \r\n
      if (csvText[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    lines.push(current);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === "," && !insideQuotes) {
        fields.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }

    fields.push(field.trim());
    return fields;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Role Column Detection
// ---------------------------------------------------------------------------

/**
 * Fetch a Google Sheet's headers and detect if a role/position column exists.
 * Used by the Connect Sheet modal to enable auto-role-detect UI.
 */
export async function detectRoleColumn(
  sheetUrl: string,
): Promise<DetectRoleColumnResult | { error: string }> {
  try {
    const googleSheetId = extractSheetId(sheetUrl);
    if (!googleSheetId) {
      return { error: "Invalid Google Sheet URL." };
    }

    const gid = extractGid(sheetUrl) || null;
    const csvText = await fetchSheetCsv(googleSheetId, gid);
    const { headers } = parseServerCsv(csvText);

    if (headers.length === 0) {
      return {
        hasRoleColumn: false,
        roleColumnIndex: null,
        roleColumnHeader: null,
        headers: [],
      };
    }

    // Check each header against role keywords
    for (let i = 0; i < headers.length; i++) {
      const normalized = headers[i].toLowerCase().trim();
      if (ROLE_KEYWORDS.some((kw) => normalized.includes(kw))) {
        return {
          hasRoleColumn: true,
          roleColumnIndex: i,
          roleColumnHeader: headers[i],
          headers,
        };
      }
    }

    return {
      hasRoleColumn: false,
      roleColumnIndex: null,
      roleColumnHeader: null,
      headers,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to check sheet headers.",
    };
  }
}

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

  // No match — create a new role
  const created = await createRoleFromData(roleName.trim(), "Briefcase");
  if (!created) {
    throw new Error(`Failed to create role "${roleName}"`);
  }

  roleCache.set(normalizedInput, created.id);
  return created.id;
}

// ---------------------------------------------------------------------------
// CRUD — Connected Sheets
// ---------------------------------------------------------------------------

/** List all connected sheets with their role names. */
export async function getConnectedSheets(): Promise<
  Array<ConnectedSheet & { roleName: string }>
> {
  const results = await db
    .select({
      id: connectedSheets.id,
      name: connectedSheets.name,
      sheetUrl: connectedSheets.sheetUrl,
      sheetId: connectedSheets.sheetId,
      gid: connectedSheets.gid,
      roleId: connectedSheets.roleId,
      autoDetectRole: connectedSheets.autoDetectRole,
      roleColumnIndex: connectedSheets.roleColumnIndex,
      lastSyncAt: connectedSheets.lastSyncAt,
      lastRowCount: connectedSheets.lastRowCount,
      syncFrequency: connectedSheets.syncFrequency,
      isActive: connectedSheets.isActive,
      lastError: connectedSheets.lastError,
      createdAt: connectedSheets.createdAt,
      roleName: roles.name,
    })
    .from(connectedSheets)
    .leftJoin(roles, eq(connectedSheets.roleId, roles.id))
    .orderBy(connectedSheets.createdAt);

  return results.map((r) => ({
    ...r,
    roleName: r.roleName ?? "Auto-detect",
  }));
}

/** Connect a new Google Sheet. Validates the URL and does a test fetch. */
export async function connectSheet(
  input: ConnectSheetInput,
): Promise<{ id: string } | { error: string }> {
  try {
    const isAutoDetect = input.autoDetectRole === true;

    // Validate role exists (only required when not auto-detecting)
    if (!isAutoDetect) {
      if (!input.roleId) {
        return { error: "Please select a target role." };
      }

      const [role] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.id, input.roleId), eq(roles.isActive, true)))
        .limit(1);

      if (!role) {
        return { error: "Selected role not found or is inactive." };
      }
    }

    // Extract sheet ID from URL
    const googleSheetId = extractSheetId(input.sheetUrl);
    if (!googleSheetId) {
      return {
        error:
          "Invalid Google Sheet URL. Paste the full URL from your browser address bar.",
      };
    }

    // Extract GID from URL if not provided
    const gid = input.gid || extractGid(input.sheetUrl) || null;

    // Test fetch — verifies the sheet is public and accessible
    try {
      await fetchSheetCsv(googleSheetId, gid);
    } catch (fetchError) {
      return {
        error:
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to access sheet. Ensure it is publicly shared.",
      };
    }

    const name = input.name.trim();
    if (!name) {
      return { error: "Sheet name is required." };
    }

    const [sheet] = await db
      .insert(connectedSheets)
      .values({
        name,
        sheetUrl: input.sheetUrl.trim(),
        sheetId: googleSheetId,
        gid,
        roleId: isAutoDetect ? null : input.roleId,
        autoDetectRole: isAutoDetect,
        roleColumnIndex: isAutoDetect ? (input.roleColumnIndex ?? null) : null,
        syncFrequency: input.syncFrequency,
      })
      .returning({ id: connectedSheets.id });

    revalidatePath("/settings");
    return { id: sheet.id };
  } catch (err) {
    console.error("[connectSheet] Error:", err);
    return { error: "Failed to connect sheet. Please try again." };
  }
}

/** Update a connected sheet's settings. */
export async function updateConnectedSheet(
  id: string,
  updates: {
    name?: string;
    roleId?: string;
    syncFrequency?: SyncFrequency;
    isActive?: boolean;
  },
): Promise<{ success: true } | { error: string }> {
  try {
    const setValues: Partial<typeof connectedSheets.$inferInsert> = {};

    if (updates.name !== undefined) setValues.name = updates.name.trim();
    if (updates.roleId !== undefined) setValues.roleId = updates.roleId;
    if (updates.syncFrequency !== undefined)
      setValues.syncFrequency = updates.syncFrequency;
    if (updates.isActive !== undefined) setValues.isActive = updates.isActive;

    await db
      .update(connectedSheets)
      .set(setValues)
      .where(eq(connectedSheets.id, id));

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[updateConnectedSheet] Error:", err);
    return { error: "Failed to update sheet." };
  }
}

/** Disconnect (delete) a connected sheet. */
export async function disconnectSheet(
  id: string,
): Promise<{ success: true } | { error: string }> {
  try {
    await db.delete(connectedSheets).where(eq(connectedSheets.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[disconnectSheet] Error:", err);
    return { error: "Failed to disconnect sheet." };
  }
}

// ---------------------------------------------------------------------------
// Sync — Core Logic
// ---------------------------------------------------------------------------

/**
 * Sync a single connected sheet: fetch CSV, detect new rows, import them.
 *
 * Flow:
 * 1. Fetch the sheet as CSV
 * 2. Parse headers + rows
 * 3. Compare row count with lastRowCount — skip if no new data
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
      // Update sync time even if empty — don't retry constantly
      await db
        .update(connectedSheets)
        .set({ lastSyncAt: new Date(), lastError: null })
        .where(eq(connectedSheets.id, sheet.id));
      return result;
    }

    const totalCurrentRows = allDataRows.length;

    // 3. Compare row count — skip if no new rows
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
    const mapping = detectMapping(headers);

    // Must have at least a name column to import
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

    // Filter out rows without a name
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

    // 7. Dedup by email — find existing candidates with matching emails
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

    // Split into new vs duplicate
    const toImport = cleaned.filter((r) => {
      if (r.email && existingEmailSet.has(r.email.toLowerCase())) return false;
      return true;
    });

    result.skippedDuplicates = cleaned.length - toImport.length;

    if (toImport.length === 0) {
      // All duplicates — still update counts
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
    //    When auto-detecting: read role value per row, fuzzy-match or create
    //    When fixed role: use sheet.roleId for all rows
    const isAutoDetect = sheet.autoDetectRole;
    const roleColIdx = isAutoDetect
      ? (sheet.roleColumnIndex ?? mapping.role)
      : undefined;

    // Cache for role name → role ID (avoids repeated DB lookups within a single sync)
    const roleCache = new Map<string, string>();

    // Pre-populate cache if we have a fixed role
    if (!isAutoDetect && sheet.roleId) {
      roleCache.set("__fixed__", sheet.roleId);
    }

    // Resolve role ID for each row
    const rowRoleIds: string[] = [];
    for (const row of toImport) {
      if (isAutoDetect && roleColIdx !== undefined) {
        // Read the role value from the original new data row
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
          // No role value in this row — skip or use a fallback
          // If the sheet also has a fallback roleId, use it; otherwise skip
          if (sheet.roleId) {
            rowRoleIds.push(sheet.roleId);
          } else {
            rowRoleIds.push(""); // will be filtered out below
          }
        }
      } else {
        // Fixed role mode
        rowRoleIds.push(sheet.roleId ?? "");
      }
    }

    // Filter out rows where we couldn't determine a role
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
    //    Group by roleId for import batches
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
            source: "csv", // Google Sheet sync uses CSV export
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

        // Insert import events
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

        // Update batch counts
        await tx
          .update(importBatches)
          .set({ importedCount: inserted.length })
          .where(eq(importBatches.id, batch.id));

        totalInserted += inserted.length;
      }

      result.importedCount = totalInserted;
    });

    // 9. Update sheet sync metadata
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

    // Store error on the sheet record
    await db
      .update(connectedSheets)
      .set({ lastSyncAt: new Date(), lastError: errorMsg })
      .where(eq(connectedSheets.id, sheet.id));

    return { ...result, error: errorMsg };
  }
}

// ---------------------------------------------------------------------------
// Sync All — Used by cron
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

  // Fetch sheets that are active and not manual
  const activeSheets = await db
    .select()
    .from(connectedSheets)
    .where(
      and(
        eq(connectedSheets.isActive, true),
        // Exclude manual-only sheets
        or(
          eq(connectedSheets.syncFrequency, "hourly"),
          eq(connectedSheets.syncFrequency, "daily"),
        ),
      ),
    );

  // Filter to only sheets that are due
  const dueSheets = activeSheets.filter((sheet) => {
    if (!sheet.lastSyncAt) return true; // Never synced

    if (sheet.syncFrequency === "hourly") {
      return sheet.lastSyncAt <= oneHourAgo;
    }

    if (sheet.syncFrequency === "daily") {
      return sheet.lastSyncAt <= oneDayAgo;
    }

    return false;
  });

  // Sync each due sheet sequentially to avoid overwhelming the DB
  const results: SyncResult[] = [];
  for (const sheet of dueSheets) {
    const syncResult = await syncConnectedSheet(sheet.id);
    results.push(syncResult);
  }

  return results;
}
