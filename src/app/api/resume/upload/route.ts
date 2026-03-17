import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { isActiveTeamMember } from "@/lib/auth";
import { db } from "@/db";
import { candidates, roles } from "@/db/schema";
import {
  ALLOWED_RESUME_MIMES,
  MAX_RESUME_SIZE_BYTES,
  MAX_RESUME_SIZE_MB,
} from "@/lib/resume/constants";
import {
  ensureBucket,
  uploadResume,
  getSignedResumeUrl,
} from "@/lib/supabase/storage";
import { extractTextFromResume } from "@/lib/resume/parse-resume";
import {
  extractResumeData,
  type ResumeExtractionResult,
} from "@/lib/ai/resume-extractor";

interface UploadResponse {
  readonly storagePath: string;
  readonly signedUrl: string;
  readonly fileName: string;
  readonly extraction?: ResumeExtractionResult;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorized = await isActiveTeamMember();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;
    const batchId = formData.get("batchId") as string | null;
    const extractDataRaw = formData.get("extractData") as string | null;
    const shouldExtract = extractDataRaw !== "false";

    // Validate file exists
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Include a 'file' field in the form data." },
        { status: 400 },
      );
    }

    // Validate MIME type
    const mimeAllowed = (ALLOWED_RESUME_MIMES as readonly string[]).includes(
      file.type,
    );
    if (!mimeAllowed) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Accepted: PDF, DOCX.` },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_RESUME_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_RESUME_SIZE_MB}MB limit.` },
        { status: 400 },
      );
    }

    // Require either candidateId or batchId
    if (!candidateId && !batchId) {
      return NextResponse.json(
        { error: "Either candidateId or batchId is required." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine storage path
    const storagePath = candidateId
      ? `${candidateId}/${file.name}`
      : `temp/${batchId}/${file.name}`;

    // Upload to storage
    await ensureBucket();
    await uploadResume(storagePath, buffer, file.type);

    // Attach to candidate record if candidateId provided
    if (candidateId) {
      await db
        .update(candidates)
        .set({ resumeUrl: storagePath, resumeFileName: file.name })
        .where(eq(candidates.id, candidateId));
    }

    // Optionally extract resume data
    let extraction: ResumeExtractionResult | undefined;
    if (shouldExtract) {
      const { text } = await extractTextFromResume(buffer, file.type);
      if (text.trim()) {
        try {
          // Fetch role names so AI can suggest the best match
          const allRoles = await db
            .select({ name: roles.name })
            .from(roles)
            .where(eq(roles.isActive, true));
          const roleNames = allRoles.map((r) => r.name);
          extraction = await extractResumeData(text, roleNames);
        } catch {
          // Extraction failed (e.g. scanned PDF with no text) — continue without it
        }
      }
    }

    // Generate signed URL for the uploaded file
    const signedUrl = await getSignedResumeUrl(storagePath);

    const response: UploadResponse = {
      storagePath,
      signedUrl,
      fileName: file.name,
      ...(extraction ? { extraction } : {}),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during resume upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
