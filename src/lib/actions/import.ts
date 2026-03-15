"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, or } from "drizzle-orm";
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
  /** User's decision set in Step 3 of the import wizard. */
  decision: "import" | "merge" | "skip";
  /** Candidate ID to fill gaps on (only when decision='merge'). */
  mergeTargetId?: string;
  /** Per-row role ID override (used when importing with a role column). */
  roleId?: string;
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
  matchedOn: "email" | "phone";
}

// ---------------------------------------------------------------------------
// detectDuplicates -- batch lookup called by wizard UI before final submission
// ---------------------------------------------------------------------------

/**
 * Given lists of emails and phones, returns a lookup map of existing candidates.
 * Keys are "email:<value>" or "phone:<value>" (lowercased).
 * Joins with roles table to provide a user-readable "may already exist as X in Y" message.
 */
export async function detectDuplicates(
  emails: string[],
  phones: string[],
): Promise<Record<string, DuplicateMatch>> {
  await requireAuth("editor");

  // Normalise inputs -- filter out empty strings
  const cleanEmails = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const cleanPhones = phones.map((p) => p.trim()).filter(Boolean);

  if (cleanEmails.length === 0 && cleanPhones.length === 0) {
    return {};
  }

  // Build OR conditions -- only include non-empty arrays to avoid Drizzle inArray([]) error
  const conditions = [];
  if (cleanEmails.length > 0) {
    conditions.push(inArray(candidates.email, cleanEmails));
  }
  if (cleanPhones.length > 0) {
    conditions.push(inArray(candidates.phone, cleanPhones));
  }

  const matches = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      roleId: candidates.roleId,
      roleName: roles.name,
    })
    .from(candidates)
    .innerJoin(roles, eq(candidates.roleId, roles.id))
    .where(or(...conditions));

  // Build map keyed by "email:<value>" and "phone:<value>"
  const map: Record<string, DuplicateMatch> = {};

  for (const match of matches) {
    if (match.email) {
      const key = `email:${match.email.toLowerCase()}`;
      map[key] = {
        candidateId: match.id,
        candidateName: match.name,
        roleName: match.roleName,
        matchedOn: "email",
      };
    }
    if (match.phone) {
      const key = `phone:${match.phone}`;
      // Only set if not already set by email (prefer email matches)
      if (!map[key]) {
        map[key] = {
          candidateId: match.id,
          candidateName: match.name,
          roleName: match.roleName,
          matchedOn: "phone",
        };
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
        const insertValues = toInsert.map((row) => ({
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
          isDuplicate: false,
          importBatchId: batchId,
          createdBy: user.name,
        }));

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
          isDuplicate: true,
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
