"use server";
import { db } from "@/db";
import {
  extractionDrafts,
  candidates,
  importBatches,
  roles,
} from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { runExtraction, runRegexOnly } from "@/lib/ai/extract";
import { scrapeUrl } from "@/lib/extraction/firecrawl";
import { requireAuth, getAuthUser } from "@/lib/auth";

const MAX_URLS_PER_BATCH = 20;

// ---------------------------------------------------------------------------
// NEW: Async scrape + extract pipeline (Next.js after() for background work)
// ---------------------------------------------------------------------------

/**
 * Submit multiple portfolio URLs for async extraction.
 * Creates an importBatch + one extractionDraft per URL, then fires-and-forgets
 * the actual scraping work via next/server after() so the response returns immediately.
 *
 * Returns { batchId } -- client polls /api/extraction-status/[batchId] for progress.
 */
export async function startExtractions(
  urls: string[],
  roleId: string,
): Promise<{ batchId: string }> {
  const user = await requireAuth("editor");

  // Validate
  if (!urls || urls.length === 0) {
    throw new Error("At least one URL is required");
  }
  if (urls.length > MAX_URLS_PER_BATCH) {
    throw new Error(`Maximum ${MAX_URLS_PER_BATCH} URLs per batch`);
  }

  // Verify role exists
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) {
    throw new Error(`Role ${roleId} not found`);
  }

  // Create importBatch
  const [batch] = await db
    .insert(importBatches)
    .values({
      roleId,
      source: "url",
      totalRows: urls.length,
      createdBy: user.name,
    })
    .returning();

  // Create one draft per URL
  const draftRows = await db
    .insert(extractionDrafts)
    .values(
      urls.map((url) => ({
        importBatchId: batch.id,
        sourceUrl: url,
        status: "pending" as const,
        createdBy: user.name,
      })),
    )
    .returning();

  // Background processing -- parallel with concurrency limit of 3
  // Fire-and-forget background processing
  void (async () => {
    const CONCURRENCY = 3;

    async function processDraft(draft: (typeof draftRows)[number]) {
      try {
        await db
          .update(extractionDrafts)
          .set({ status: "processing" })
          .where(eq(extractionDrafts.id, draft.id));

        const scraped = await scrapeUrl(draft.sourceUrl!);

        if (!scraped.success) {
          await db
            .update(extractionDrafts)
            .set({ status: "failed", error: scraped.error })
            .where(eq(extractionDrafts.id, draft.id));
          return;
        }

        const result = await runExtraction({
          rawText: scraped.markdown,
          sourceUrl: draft.sourceUrl ?? undefined,
        });

        await db
          .update(extractionDrafts)
          .set({
            status: "completed",
            extractedData: result.data,
            platform: result.platform,
            overallConfidence: Math.round(result.overallConfidence * 100),
            fieldConfidence: result.fieldConfidence,
            error: result.error,
          })
          .where(eq(extractionDrafts.id, draft.id));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown processing error";
        await db
          .update(extractionDrafts)
          .set({ status: "failed", error: message })
          .where(eq(extractionDrafts.id, draft.id));
      }
    }

    // Process in batches of CONCURRENCY
    for (let i = 0; i < draftRows.length; i += CONCURRENCY) {
      const batch = draftRows.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(processDraft));
    }
  })();

  return { batchId: batch.id };
}

/**
 * Submit a single portfolio URL for async extraction tied to a specific candidate.
 * Used from the candidate profile page (IMPT-09).
 *
 * Returns { batchId, candidateId }.
 */
export async function startSingleExtraction(
  url: string,
  roleId: string,
): Promise<{ batchId: string; candidateId: string; error?: string }> {
  try {
    const user = await requireAuth("editor");

    if (!roleId || roleId.trim() === "") {
      return {
        batchId: "",
        candidateId: "",
        error: "Please select a role first",
      };
    }
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    if (!role) {
      return { batchId: "", candidateId: "", error: "Role not found" };
    }

    // Create records only -- actual scraping happens via API route
    const [batch] = await db
      .insert(importBatches)
      .values({
        roleId,
        source: "url",
        totalRows: 1,
        createdBy: user.name,
      })
      .returning();

    const [candidate] = await db
      .insert(candidates)
      .values({
        roleId,
        name: "Pending extraction...",
        source: "url",
        portfolioUrl: url,
        importBatchId: batch.id,
        createdBy: user.name,
      })
      .returning();

    await db.insert(extractionDrafts).values({
      candidateId: candidate.id,
      importBatchId: batch.id,
      sourceUrl: url,
      status: "pending",
      createdBy: user.name,
    });

    return { batchId: batch.id, candidateId: candidate.id };
  } catch (err) {
    console.error("[startSingleExtraction] Error:", err);
    return {
      batchId: "",
      candidateId: "",
      error: err instanceof Error ? err.message : "Extraction failed",
    };
  }
}

/**
 * Confirm an extraction draft -- applies extracted + edited data to the candidate.
 * If draft has a candidateId, updates that candidate. Otherwise, creates a new one.
 */
export async function confirmExtraction(
  draftId: string,
  edits: Record<string, string>,
): Promise<{ success: boolean; candidateId: string }> {
  const user = await requireAuth("editor");

  const [draft] = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.id, draftId));

  if (!draft) {
    throw new Error(`Extraction draft ${draftId} not found`);
  }
  if (draft.status !== "completed") {
    throw new Error(
      `Draft must be in 'completed' status to confirm (current: ${draft.status})`,
    );
  }

  const extracted = (draft.extractedData ?? {}) as Record<string, unknown>;

  // Merge extracted data with user edits (edits win)
  const merged: Record<string, unknown> = {
    ...extracted,
    ...edits,
    lastModifiedBy: user.name,
    updatedAt: new Date(),
  };

  let candidateId: string;

  if (draft.candidateId) {
    // Update existing candidate
    await db
      .update(candidates)
      .set({
        name: (merged.name as string) || "Unknown",
        email: (merged.email as string) || null,
        phone: (merged.phone as string) || null,
        instagram: (merged.instagram as string) || null,
        portfolioLinks: (merged.portfolioLinks as object[]) || [],
        socialHandles: (merged.socialHandles as object[]) || [],
        lastModifiedBy: user.name,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, draft.candidateId));
    candidateId = draft.candidateId;
  } else {
    // Bulk flow: create new candidate from extraction data
    if (!draft.importBatchId) {
      throw new Error("Draft has no candidateId or importBatchId");
    }

    // Get roleId from the importBatch
    const [batch] = await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.id, draft.importBatchId));

    if (!batch) {
      throw new Error("Associated import batch not found");
    }

    const [newCandidate] = await db
      .insert(candidates)
      .values({
        roleId: batch.roleId,
        name: (merged.name as string) || "Unknown",
        email: (merged.email as string) || null,
        phone: (merged.phone as string) || null,
        instagram: (merged.instagram as string) || null,
        portfolioUrl: draft.sourceUrl ?? undefined,
        portfolioLinks: (merged.portfolioLinks as object[]) || [],
        socialHandles: (merged.socialHandles as object[]) || [],
        source: "url",
        importBatchId: draft.importBatchId,
        createdBy: user.name,
      })
      .returning();

    candidateId = newCandidate.id;
  }

  // Mark draft as applied
  await db
    .update(extractionDrafts)
    .set({ status: "applied", appliedAt: new Date() })
    .where(eq(extractionDrafts.id, draftId));

  return { success: true, candidateId };
}

/**
 * Skip an extraction draft -- marks it reviewed without applying any changes.
 */
export async function skipExtraction(
  draftId: string,
): Promise<{ success: boolean }> {
  await requireAuth("editor");

  await db
    .update(extractionDrafts)
    .set({ status: "reviewed", reviewedAt: new Date() })
    .where(eq(extractionDrafts.id, draftId));

  return { success: true };
}

// ---------------------------------------------------------------------------
// LEGACY: Functions retained for backward compatibility
// ---------------------------------------------------------------------------

/**
 * Create a pending extraction draft for a candidate URL/text.
 */
export async function createExtractionDraft(input: {
  candidateId?: string;
  importBatchId?: string;
  sourceUrl?: string;
  rawText?: string;
}) {
  const user = await requireAuth("editor");

  const [draft] = await db
    .insert(extractionDrafts)
    .values({
      candidateId: input.candidateId,
      importBatchId: input.importBatchId,
      sourceUrl: input.sourceUrl,
      rawText: input.rawText,
      status: "pending",
      createdBy: user.name,
    })
    .returning();

  return draft;
}

/**
 * Process a single extraction draft -- runs the full AI pipeline.
 */
export async function processExtraction(draftId: string) {
  await requireAuth("editor");

  // Mark as processing
  await db
    .update(extractionDrafts)
    .set({ status: "processing" })
    .where(eq(extractionDrafts.id, draftId));

  // Fetch the draft
  const [draft] = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.id, draftId));

  if (!draft) {
    throw new Error(`Extraction draft ${draftId} not found`);
  }

  const rawText = draft.rawText ?? "";

  if (!rawText.trim()) {
    await db
      .update(extractionDrafts)
      .set({ status: "failed", error: "No raw text to extract from" })
      .where(eq(extractionDrafts.id, draftId));
    return null;
  }

  try {
    const result = await runExtraction({
      rawText,
      sourceUrl: draft.sourceUrl ?? undefined,
      candidateId: draft.candidateId ?? undefined,
    });

    await db
      .update(extractionDrafts)
      .set({
        status: "completed",
        extractedData: result.data,
        platform: result.platform,
        overallConfidence: Math.round(result.overallConfidence * 100),
        fieldConfidence: result.fieldConfidence,
        error: result.error,
      })
      .where(eq(extractionDrafts.id, draftId));

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(extractionDrafts)
      .set({ status: "failed", error: message })
      .where(eq(extractionDrafts.id, draftId));
    return null;
  }
}

/**
 * Apply reviewed extraction data to the candidate record.
 */
export async function applyExtraction(
  draftId: string,
  overrides: {
    name?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    portfolioLinks?: Array<{ url: string; sourceType: string; label: string }>;
    socialHandles?: Array<{ platform: string; handle: string; url: string }>;
  },
) {
  const user = await requireAuth("editor");

  const [draft] = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.id, draftId));

  if (!draft?.candidateId) {
    throw new Error("Draft has no associated candidate");
  }

  // Build update object -- only include non-null overrides
  const updateData: Record<string, unknown> = {
    lastModifiedBy: user.name,
    updatedAt: new Date(),
  };

  if (overrides.name) updateData.name = overrides.name;
  if (overrides.email) updateData.email = overrides.email;
  if (overrides.phone) updateData.phone = overrides.phone;
  if (overrides.instagram) updateData.instagram = overrides.instagram;
  if (overrides.portfolioLinks)
    updateData.portfolioLinks = overrides.portfolioLinks;
  if (overrides.socialHandles)
    updateData.socialHandles = overrides.socialHandles;

  await db
    .update(candidates)
    .set(updateData)
    .where(eq(candidates.id, draft.candidateId));

  // Mark draft as applied
  await db
    .update(extractionDrafts)
    .set({ status: "applied", appliedAt: new Date() })
    .where(eq(extractionDrafts.id, draftId));

  return { success: true };
}

/**
 * Quick regex-only extraction (no AI). Returns result without persisting.
 */
export async function previewExtraction(rawText: string, sourceUrl?: string) {
  await requireAuth("editor");
  return runRegexOnly(rawText, sourceUrl);
}

/**
 * Get all extraction drafts for a candidate.
 * Read-only -- requires authenticated user.
 */
export async function getExtractionDrafts(candidateId: string) {
  const user = await getAuthUser();
  if (!user) return [];

  return db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.candidateId, candidateId));
}

/**
 * Get pending/processing extraction drafts (for queue UI).
 * Read-only -- requires authenticated user.
 */
export async function getPendingExtractions() {
  const user = await getAuthUser();
  if (!user) return [];

  return db
    .select()
    .from(extractionDrafts)
    .where(
      or(
        eq(extractionDrafts.status, "pending"),
        eq(extractionDrafts.status, "processing"),
      ),
    );
}

/**
 * Get completed extractions awaiting review.
 * Read-only -- requires authenticated user.
 */
export async function getCompletedExtractions() {
  const user = await getAuthUser();
  if (!user) return [];

  return db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.status, "completed"));
}

/**
 * Process all pending extractions (batch worker).
 */
export async function processPendingExtractions() {
  await requireAuth("editor");

  const pending = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.status, "pending"));

  const results = [];
  for (const draft of pending) {
    // processExtraction already has auth, but we're calling internally
    // so we process directly to avoid redundant auth checks
    await db
      .update(extractionDrafts)
      .set({ status: "processing" })
      .where(eq(extractionDrafts.id, draft.id));

    const rawText = draft.rawText ?? "";

    if (!rawText.trim()) {
      await db
        .update(extractionDrafts)
        .set({ status: "failed", error: "No raw text to extract from" })
        .where(eq(extractionDrafts.id, draft.id));
      results.push({ draftId: draft.id, result: null });
      continue;
    }

    try {
      const result = await runExtraction({
        rawText,
        sourceUrl: draft.sourceUrl ?? undefined,
        candidateId: draft.candidateId ?? undefined,
      });

      await db
        .update(extractionDrafts)
        .set({
          status: "completed",
          extractedData: result.data,
          platform: result.platform,
          overallConfidence: Math.round(result.overallConfidence * 100),
          fieldConfidence: result.fieldConfidence,
          error: result.error,
        })
        .where(eq(extractionDrafts.id, draft.id));

      results.push({ draftId: draft.id, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db
        .update(extractionDrafts)
        .set({ status: "failed", error: message })
        .where(eq(extractionDrafts.id, draft.id));
      results.push({ draftId: draft.id, result: null });
    }
  }

  return results;
}
