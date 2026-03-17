import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getAuthUser, isActiveTeamMember } from "@/lib/auth";
import { db } from "@/db";
import { candidates, roles, activities } from "@/db/schema";
import { moveResume } from "@/lib/supabase/storage";
import type { ResumeExtractionResult } from "@/lib/ai/resume-extractor";

const MAX_ITEMS_PER_REQUEST = 5;

interface BulkItem {
  readonly tempPath: string;
  readonly fileName: string;
  readonly extraction: ResumeExtractionResult;
}

interface BulkRequestBody {
  readonly roleId: string;
  readonly items: readonly BulkItem[];
}

interface CreatedCandidate {
  readonly id: string;
  readonly name: string;
}

interface BulkResponse {
  readonly created: readonly CreatedCandidate[];
  readonly errors: readonly { fileName: string; error: string }[];
  readonly remaining?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authorized = await isActiveTeamMember();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getAuthUser();
    const body = (await request.json()) as BulkRequestBody;

    // Validate request body
    if (!body.roleId || typeof body.roleId !== "string") {
      return NextResponse.json(
        { error: "roleId is required." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items array is required and must not be empty." },
        { status: 400 },
      );
    }

    // Validate roleId exists
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, body.roleId))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: "Role not found." }, { status: 404 });
    }

    // Cap at MAX_ITEMS_PER_REQUEST to stay under Vercel timeout
    const itemsToProcess = body.items.slice(0, MAX_ITEMS_PER_REQUEST);
    const remaining =
      body.items.length > MAX_ITEMS_PER_REQUEST
        ? body.items.length - MAX_ITEMS_PER_REQUEST
        : undefined;

    const created: CreatedCandidate[] = [];
    const errors: { fileName: string; error: string }[] = [];

    // Process sequentially to avoid timeouts
    for (const item of itemsToProcess) {
      try {
        const candidateName = item.extraction.name ?? item.fileName;

        const [newCandidate] = await db
          .insert(candidates)
          .values({
            roleId: body.roleId,
            name: candidateName,
            email: item.extraction.email,
            phone: item.extraction.phone,
            linkedinUrl: item.extraction.linkedin,
            portfolioUrl: item.extraction.portfolio,
            instagram: item.extraction.instagram,
            location: item.extraction.location,
            experience: item.extraction.experience,
            resumeFileName: item.fileName,
            source: "cv_upload",
          })
          .returning();

        // Move file from temp to permanent storage
        const permanentPath = `${newCandidate.id}/${item.fileName}`;
        await moveResume(item.tempPath, permanentPath);

        // Update candidate with the permanent resume URL
        await db
          .update(candidates)
          .set({ resumeUrl: permanentPath })
          .where(eq(candidates.id, newCandidate.id));

        created.push({ id: newCandidate.id, name: candidateName });

        // Log activity
        await db.insert(activities).values({
          type: "created",
          actorId: user?.id ?? "system",
          actorName: user?.name ?? "System",
          actorAvatar: user?.avatar ?? null,
          candidateId: newCandidate.id,
          candidateName,
          roleId: body.roleId,
          roleName: role.name,
          metadata: { source: "cv_upload", fileName: item.fileName },
        });
      } catch (itemError) {
        const message =
          itemError instanceof Error
            ? itemError.message
            : "Unknown error processing item";
        errors.push({ fileName: item.fileName, error: message });
      }
    }

    const response: BulkResponse = {
      created,
      errors,
      ...(remaining !== undefined ? { remaining } : {}),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during bulk confirm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
