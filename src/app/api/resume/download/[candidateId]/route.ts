import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { isActiveTeamMember } from "@/lib/auth";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { getSignedResumeUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ candidateId: string }> },
): Promise<NextResponse> {
  try {
    const authorized = await isActiveTeamMember();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId } = await params;

    const [candidate] = await db
      .select({ resumeUrl: candidates.resumeUrl })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!candidate || !candidate.resumeUrl) {
      return NextResponse.json(
        { error: "Candidate not found or no resume on file." },
        { status: 404 },
      );
    }

    const { resumeUrl } = candidate;

    // External URL — redirect directly
    if (resumeUrl.startsWith("http")) {
      return NextResponse.redirect(resumeUrl);
    }

    // Storage path — generate a signed URL and redirect
    const signedUrl = await getSignedResumeUrl(resumeUrl);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during resume download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
