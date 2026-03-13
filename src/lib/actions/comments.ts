"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { candidateComments } from "@/db/schema";
import { MOCK_USER } from "@/lib/constants";
import { createActivity } from "@/lib/actions/activities";

type ActionError = { error: string };
type ActionSuccess = { success: true };
type ActionResult = ActionError | ActionSuccess;

/**
 * Create a new comment on a candidate profile.
 */
export async function createComment(
  candidateId: string,
  body: string,
  mentions: Array<{ userId: string; name: string }> = [],
): Promise<ActionResult> {
  try {
    if (!body.trim()) {
      return { error: "Comment cannot be empty" };
    }

    await db.insert(candidateComments).values({
      candidateId,
      body: body.trim(),
      mentions,
      createdBy: MOCK_USER.name,
    });

    await createActivity({
      type: "comment",
      candidateId,
      metadata: { body: body.trim().slice(0, 100) },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[createComment] Error:", err);
    return { error: "Failed to post comment. Please try again." };
  }
}

/**
 * Edit an existing comment. Only the author can edit, within 5 minutes.
 */
export async function editComment(
  commentId: string,
  body: string,
): Promise<ActionResult> {
  try {
    if (!body.trim()) {
      return { error: "Comment cannot be empty" };
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [comment] = await db
      .select()
      .from(candidateComments)
      .where(
        and(
          eq(candidateComments.id, commentId),
          eq(candidateComments.createdBy, MOCK_USER.name),
          gt(candidateComments.createdAt, fiveMinAgo),
        ),
      )
      .limit(1);

    if (!comment) {
      return { error: "Comment not found, not yours, or edit window expired (5 min)" };
    }

    await db
      .update(candidateComments)
      .set({ body: body.trim(), editedAt: new Date() })
      .where(eq(candidateComments.id, commentId));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[editComment] Error:", err);
    return { error: "Failed to edit comment. Please try again." };
  }
}

/**
 * Get all comments for a candidate, newest first.
 */
export async function getComments(candidateId: string) {
  return db
    .select()
    .from(candidateComments)
    .where(eq(candidateComments.candidateId, candidateId))
    .orderBy(desc(candidateComments.createdAt));
}
