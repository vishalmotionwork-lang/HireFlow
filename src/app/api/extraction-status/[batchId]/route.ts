import { NextResponse } from "next/server";
import { db } from "@/db";
import { extractionDrafts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapeUrl } from "@/lib/extraction/firecrawl";
import { runExtraction } from "@/lib/ai/extract";
import { isActiveTeamMember } from "@/lib/auth";

const DONE_STATUSES = new Set(["completed", "failed", "applied", "reviewed"]);
const PENDING_STATUSES = new Set(["pending", "processing"]);

interface ExtractedDraftSummary {
  id: string;
  sourceUrl: string | null;
  status: string;
  extractedData: unknown;
  fieldConfidence: unknown;
  error: string | null;
  overallConfidence: number | null;
}

interface ExtractionStatusResponse {
  total: number;
  done: number;
  pending: number;
  failed: number;
  drafts: ExtractedDraftSummary[];
}

/**
 * Process a single pending draft inline.
 * Returns quickly — scrape + AI extraction.
 */
async function processDraftInline(draftId: string, sourceUrl: string) {
  try {
    await db
      .update(extractionDrafts)
      .set({ status: "processing" })
      .where(eq(extractionDrafts.id, draftId));

    const scraped = await scrapeUrl(sourceUrl);

    if (!scraped.success) {
      await db
        .update(extractionDrafts)
        .set({ status: "failed", error: scraped.error })
        .where(eq(extractionDrafts.id, draftId));
      return;
    }

    const result = await runExtraction({
      rawText: scraped.markdown,
      sourceUrl,
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown processing error";
    await db
      .update(extractionDrafts)
      .set({ status: "failed", error: message })
      .where(eq(extractionDrafts.id, draftId));
  }
}

/**
 * GET /api/extraction-status/[batchId]
 *
 * Returns extraction progress. Also triggers processing of pending drafts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<NextResponse<ExtractionStatusResponse | { error: string }>> {
  // Verify caller is an active team member
  const authorized = await isActiveTeamMember();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { batchId } = await params;

  // Fetch all drafts for this batch
  let drafts = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.importBatchId, batchId));

  // Process ONE pending draft per poll (keeps within timeout)
  const pendingDraft = drafts.find((d) => d.status === "pending");
  if (pendingDraft && pendingDraft.sourceUrl) {
    await processDraftInline(pendingDraft.id, pendingDraft.sourceUrl);

    // Re-fetch to get updated status
    drafts = await db
      .select()
      .from(extractionDrafts)
      .where(eq(extractionDrafts.importBatchId, batchId));
  }

  const total = drafts.length;
  let done = 0;
  let pending = 0;
  let failed = 0;

  for (const draft of drafts) {
    if (DONE_STATUSES.has(draft.status)) done++;
    if (PENDING_STATUSES.has(draft.status)) pending++;
    if (draft.status === "failed") failed++;
  }

  const draftSummaries: ExtractedDraftSummary[] = drafts.map((d) => ({
    id: d.id,
    sourceUrl: d.sourceUrl,
    status: d.status,
    extractedData: d.extractedData,
    fieldConfidence: d.fieldConfidence,
    error: d.error,
    overallConfidence: d.overallConfidence,
  }));

  return NextResponse.json({
    total,
    done,
    pending,
    failed,
    drafts: draftSummaries,
  });
}
