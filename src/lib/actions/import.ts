"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { candidates, candidateEvents, importBatches, roles } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Input/Output types
// ---------------------------------------------------------------------------

export interface ImportRow {
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  experience: string | null;
  resumeUrl: string | null;
  /** Flexible key-value data from "Save to Profile" columns */
  customFields?: Record<string, string>;
  /** Validation warnings from import (stored for manual review flags) */
  reviewReasons?: string[];
  /** User's decision set in Step 3 of the import wizard. */
  decision: "import" | "merge" | "skip";
  /** Candidate ID to fill gaps on (only when decision='merge'). */
  mergeTargetId?: string;
  /** Per-row role ID override (used when importing with a role column). */
  roleId?: string;
  /** Existing candidate ID this row is a duplicate of (set even for "import" decisions). */
  duplicateMatchId?: string;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  importedCount: number;
  mergedCount: number;
  skippedCount: number;
  duplicatesFound: number;
}

export interface DuplicateMatch {
  candidateId: string;
  candidateName: string;
  roleName: string;
  matchedOn: "email" | "phone" | "name";
  /** Which standard fields already have values on the existing candidate */
  filledFields: string[];
  /** Keys already present in the existing candidate's customFields */
  existingCustomFieldKeys: string[];
}

// ---------------------------------------------------------------------------
// detectDuplicates -- batch lookup called by wizard UI before final submission
// ---------------------------------------------------------------------------

/**
 * Given lists of emails and phones, returns a lookup map of existing candidates.
 * Keys are "email:<value>" or "phone:<value>" (lowercased).
 * Joins with roles table to provide a user-readable "may already exist as X in Y" message.
 */
/**
 * Normalize a phone number for comparison.
 * Strips all non-digit chars, removes +91/091 prefix for Indian numbers.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return digits;
}

/**
 * Normalize a name for duplicate comparison.
 * Lowercases, trims, collapses whitespace.
 */
function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function detectDuplicates(
  emails: string[],
  phones: string[],
  names: string[] = [],
): Promise<Record<string, DuplicateMatch>> {
  await requireAuth("editor");

  // Normalise inputs -- filter out empty strings
  const cleanEmails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const cleanPhones = phones
    .map((p) => normalizePhone(p.trim()))
    .filter((p) => p.length >= 7);
  const cleanNames = names
    .map((n) => normalizeName(n))
    .filter((n) => n.length >= 2);

  if (
    cleanEmails.length === 0 &&
    cleanPhones.length === 0 &&
    cleanNames.length === 0
  ) {
    return {};
  }

  // Build OR conditions — use ilike for case-insensitive email matching
  const emailConditions = cleanEmails.map((e) => ilike(candidates.email, e));
  // Name conditions — case-insensitive exact match after normalization
  const nameConditions = cleanNames.map((n) => ilike(candidates.name, n));
  // For phones: fetch ALL non-deleted candidates with a phone, then filter in JS
  // (SQL can't normalize phone formats, so we match after normalizing both sides)
  const hasPhone = cleanPhones.length > 0;

  const orConditions = [...emailConditions, ...nameConditions];
  if (hasPhone) {
    // Broad fetch: any candidate with a phone value (we'll filter in JS)
    orConditions.push(
      sql`${candidates.phone} IS NOT NULL AND ${candidates.phone} != ''`,
    );
  }

  if (orConditions.length === 0) return {};

  const matches = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      instagram: candidates.instagram,
      portfolioUrl: candidates.portfolioUrl,
      linkedinUrl: candidates.linkedinUrl,
      location: candidates.location,
      experience: candidates.experience,
      resumeUrl: candidates.resumeUrl,
      customFields: candidates.customFields,
      roleId: candidates.roleId,
      roleName: roles.name,
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(and(eq(candidates.isDeleted, false), or(...orConditions)));

  // Build normalized sets for fast lookup
  const phoneSet = new Set(cleanPhones);
  const nameSet = new Set(cleanNames);

  /** Compute which standard fields + customField keys are already filled */
  function buildMatchInfo(
    match: (typeof matches)[number],
    matchedOn: "email" | "phone" | "name",
  ): DuplicateMatch {
    const stdFields = [
      "email",
      "phone",
      "instagram",
      "portfolioUrl",
      "linkedinUrl",
      "location",
      "experience",
      "resumeUrl",
    ] as const;
    const filledFields = stdFields.filter(
      (f) =>
        match[f] !== null &&
        match[f] !== undefined &&
        String(match[f]).trim() !== "",
    );
    const cf = (match.customFields as Record<string, string> | null) ?? {};
    const existingCustomFieldKeys = Object.entries(cf)
      .filter(([k, v]) => !k.startsWith("_") && v && String(v).trim() !== "")
      .map(([k]) => k);

    return {
      candidateId: match.id,
      candidateName: match.name,
      roleName: match.roleName,
      matchedOn,
      filledFields,
      existingCustomFieldKeys,
    };
  }

  // Build map keyed by "email:<value>", "phone:<value>", and "name:<value>"
  const map: Record<string, DuplicateMatch> = {};

  for (const match of matches) {
    // Email match (case-insensitive) — highest priority
    if (match.email) {
      const emailLower = match.email.toLowerCase();
      if (cleanEmails.includes(emailLower)) {
        const key = `email:${emailLower}`;
        map[key] = buildMatchInfo(match, "email");
      }
    }
    // Phone match (normalized digits comparison)
    if (match.phone) {
      const normalizedDbPhone = normalizePhone(match.phone);
      if (normalizedDbPhone.length >= 7 && phoneSet.has(normalizedDbPhone)) {
        const key = `phone:${normalizedDbPhone}`;
        if (!map[key]) {
          map[key] = buildMatchInfo(match, "phone");
        }
      }
    }
    // Name match (case-insensitive, whitespace-normalized)
    if (match.name) {
      const normalizedDbName = normalizeName(match.name);
      if (nameSet.has(normalizedDbName)) {
        const key = `name:${normalizedDbName}`;
        if (!map[key]) {
          map[key] = buildMatchInfo(match, "name");
        }
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// importCandidates -- main server action called after Step 3 wizard completion
// ---------------------------------------------------------------------------

/**
 * Execute user's import decisions atomically.
 *
 * - decision='import': inserts a new candidate record
 * - decision='merge': fills null fields on the existing candidate (preserves non-null existing data)
 * - decision='skip': counted but no DB write
 *
 * Creates an importBatch record and updates counts after execution.
 * Returns ImportResult with full accounting of what happened.
 *
 * IMPORTANT: This action executes the decisions already made by the user in the
 * wizard Step 3. It does NOT auto-decide merges -- that is the user's job.
 */
export interface ImportSourceInfo {
  sourceName?: string;
  sourceUrl?: string;
  sourceHash?: string;
}

export async function importCandidates(
  rows: ImportRow[],
  targetRoleId: string,
  source: "excel" | "csv" | "paste",
  sourceInfo?: ImportSourceInfo,
): Promise<ImportResult | { error: string }> {
  try {
    const user = await requireAuth("editor");

    // ------------------------------------------------------------------
    // 1. Validate targetRoleId
    // ------------------------------------------------------------------
    if (!targetRoleId || !/^[0-9a-f-]{36}$/i.test(targetRoleId)) {
      return { error: "Invalid role ID format." };
    }

    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, targetRoleId), eq(roles.isActive, true)))
      .limit(1);

    if (!role) {
      return { error: "Target role not found or is inactive." };
    }

    // ------------------------------------------------------------------
    // 2. Separate rows by decision
    // ------------------------------------------------------------------
    const toInsert = rows.filter((r) => r.decision === "import");
    const toMerge = rows.filter(
      (r) => r.decision === "merge" && r.mergeTargetId,
    );
    const toSkip = rows.filter((r) => r.decision === "skip");

    // ------------------------------------------------------------------
    // 3. Create importBatch record upfront (counts updated at end)
    // ------------------------------------------------------------------
    const [batch] = await db
      .insert(importBatches)
      .values({
        roleId: targetRoleId,
        source,
        sourceName: sourceInfo?.sourceName ?? null,
        sourceUrl: sourceInfo?.sourceUrl ?? null,
        sourceHash: sourceInfo?.sourceHash ?? null,
        totalRows: rows.length,
        importedCount: 0,
        skippedCount: 0,
        createdBy: user.name,
      })
      .returning({ id: importBatches.id });

    if (!batch) {
      return { error: "Failed to create import batch record." };
    }

    const batchId = batch.id;

    // ------------------------------------------------------------------
    // 4. Execute all writes in a single transaction
    // ------------------------------------------------------------------
    const insertedIds: string[] = [];
    const mergedIds: string[] = [];

    await db.transaction(async (tx) => {
      // --- Insert new candidates ---
      if (toInsert.length > 0) {
        const insertValues = toInsert.map((row) => {
          const cf = { ...(row.customFields ?? {}) };
          if (row.reviewReasons && row.reviewReasons.length > 0) {
            cf._reviewReasons = JSON.stringify(row.reviewReasons);
            cf._needsReview = "true";
          }
          return {
            roleId: row.roleId ?? targetRoleId,
            name: row.name,
            email: row.email ?? null,
            phone: row.phone ?? null,
            instagram: row.instagram ?? null,
            portfolioUrl: row.portfolioUrl ?? null,
            linkedinUrl: row.linkedinUrl ?? null,
            location: row.location ?? null,
            experience: row.experience ?? null,
            resumeUrl: row.resumeUrl ?? null,
            customFields: cf,
            isDuplicate: !!row.duplicateMatchId,
            duplicateOfId: row.duplicateMatchId ?? null,
            importBatchId: batchId,
            createdBy: user.name,
          };
        });

        const inserted = await tx
          .insert(candidates)
          .values(insertValues)
          .returning({ id: candidates.id });

        for (const c of inserted) {
          insertedIds.push(c.id);
        }

        // Insert 'imported' event for each new candidate
        if (inserted.length > 0) {
          await tx.insert(candidateEvents).values(
            inserted.map((c) => ({
              candidateId: c.id,
              eventType: "imported",
              fromValue: null,
              toValue: "left_to_review",
              createdBy: user.name,
            })),
          );
        }
      }

      // --- Mark existing candidates as duplicates (for "import" decisions with known matches) ---
      const dupMatchIds = toInsert
        .map((r) => r.duplicateMatchId)
        .filter((id): id is string => !!id);
      if (dupMatchIds.length > 0) {
        await tx
          .update(candidates)
          .set({ isDuplicate: true, updatedAt: new Date() })
          .where(
            and(
              inArray(candidates.id, dupMatchIds),
              eq(candidates.isDuplicate, false),
            ),
          );
      }

      // --- Merge into existing candidates ---
      for (const row of toMerge) {
        const targetId = row.mergeTargetId!;

        // Fetch existing candidate to know which fields are null
        const [existing] = await tx
          .select()
          .from(candidates)
          .where(eq(candidates.id, targetId))
          .limit(1);

        if (!existing) {
          // Target no longer exists -- skip silently
          continue;
        }

        // Build update object: only fill NULL fields, never overwrite non-null
        const updates: Partial<typeof candidates.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (!existing.email && row.email) updates.email = row.email;
        if (!existing.phone && row.phone) updates.phone = row.phone;
        if (!existing.instagram && row.instagram)
          updates.instagram = row.instagram;
        if (!existing.portfolioUrl && row.portfolioUrl)
          updates.portfolioUrl = row.portfolioUrl;
        if (!existing.linkedinUrl && row.linkedinUrl)
          updates.linkedinUrl = row.linkedinUrl;
        if (!existing.location && row.location) updates.location = row.location;
        if (!existing.experience && row.experience)
          updates.experience = row.experience;
        if (!existing.resumeUrl && row.resumeUrl)
          updates.resumeUrl = row.resumeUrl;

        // Merge customFields: add new keys, never overwrite existing ones
        if (row.customFields && Object.keys(row.customFields).length > 0) {
          const existingCf =
            (existing.customFields as Record<string, string>) ?? {};
          const merged = { ...existingCf };
          let hasNewFields = false;
          for (const [key, val] of Object.entries(row.customFields)) {
            if (val && (!existingCf[key] || existingCf[key].trim() === "")) {
              merged[key] = val;
              hasNewFields = true;
            }
          }
          if (hasNewFields) {
            updates.customFields = merged;
          }
        }

        // Only write to DB if there's actually something new to merge
        const hasUpdates = Object.keys(updates).length > 1; // more than just updatedAt
        if (!hasUpdates) {
          // Nothing new to merge — skip silently
          continue;
        }

        updates.isDuplicate = true;

        await tx
          .update(candidates)
          .set(updates)
          .where(eq(candidates.id, targetId));

        mergedIds.push(targetId);

        // Insert 'imported' event on the existing record
        await tx.insert(candidateEvents).values({
          candidateId: targetId,
          eventType: "imported",
          fromValue: null,
          toValue: "merged",
          createdBy: user.name,
        });
      }

      // --- Update importBatch with final counts ---
      await tx
        .update(importBatches)
        .set({
          importedCount: insertedIds.length,
          skippedCount: toSkip.length,
        })
        .where(eq(importBatches.id, batchId));
    });

    // ------------------------------------------------------------------
    // 5. Revalidate layout so tables refresh
    // ------------------------------------------------------------------
    revalidatePath("/", "layout");

    return {
      batchId,
      totalRows: rows.length,
      importedCount: insertedIds.length,
      mergedCount: mergedIds.length,
      skippedCount: toSkip.length,
      duplicatesFound: toMerge.length,
    };
  } catch (err) {
    console.error("[importCandidates] Error:", err);
    return { error: "Import failed. Please try again." };
  }
}
