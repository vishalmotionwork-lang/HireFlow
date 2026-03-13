import { NextResponse } from "next/server";
import { db } from "@/db";
import { extractionDrafts } from "@/db/schema";
import { eq } from "drizzle-orm";

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
 * GET /api/extraction-status/[batchId]
 *
 * Returns the extraction progress for a batch:
 * - total: number of drafts in the batch
 * - done: completed + failed + applied + reviewed
 * - pending: pending + processing
 * - failed: only failed
 * - drafts: per-URL summary (id, sourceUrl, status, extractedData, error, overallConfidence)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
): Promise<NextResponse<ExtractionStatusResponse>> {
  const { batchId } = await params;

  const drafts = await db
    .select()
    .from(extractionDrafts)
    .where(eq(extractionDrafts.importBatchId, batchId));

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
