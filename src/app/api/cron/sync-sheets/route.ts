import { NextResponse } from "next/server";
import { syncDueSheets } from "@/lib/actions/sheets";

/**
 * GET /api/cron/sync-sheets
 *
 * Vercel Cron endpoint — syncs all connected Google Sheets that are due.
 * Protected by CRON_SECRET env var (Vercel sends this automatically).
 *
 * Schedule: every 6 hours (configured in vercel.json)
 */
export async function GET(request: Request) {
  // Verify cron secret — Vercel Cron sends this header automatically
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncDueSheets();

    const summary = {
      syncedAt: new Date().toISOString(),
      totalSheets: results.length,
      totalNewCandidates: results.reduce((sum, r) => sum + r.importedCount, 0),
      totalSkippedDuplicates: results.reduce(
        (sum, r) => sum + r.skippedDuplicates,
        0,
      ),
      errors: results.filter((r) => r.error).length,
      details: results.map((r) => ({
        sheet: r.sheetName,
        newRows: r.newRows,
        imported: r.importedCount,
        duplicates: r.skippedDuplicates,
        error: r.error ?? null,
      })),
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/sync-sheets] Error:", err);
    return NextResponse.json(
      { error: "Sync failed", message: String(err) },
      { status: 500 },
    );
  }
}
