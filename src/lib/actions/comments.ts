"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { candidateComments, candidates, roles, teamMembers } from "@/db/schema";
import { MOCK_USER } from "@/lib/constants";
import { createActivity } from "@/lib/actions/activities";
import { createNotification } from "@/lib/actions/notifications";
import { sendMentionNotificationEmail } from "@/lib/email";

type ActionError = { error: string };
type ActionSuccess = { success: true };
type ActionResult = ActionError | ActionSuccess;

/**
 * Create a new comment on a candidate profile.
 * After creation, sends email notifications to any @mentioned team members.
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

    const trimmedBody = body.trim();

    await db.insert(candidateComments).values({
      candidateId,
      body: trimmedBody,
      mentions,
      createdBy: MOCK_USER.name,
    });

    await createActivity({
      type: "comment",
      candidateId,
      metadata: { body: trimmedBody.slice(0, 100) },
    });

    // Send mention notification emails (fire-and-forget, non-blocking)
    if (mentions.length > 0) {
      notifyMentionedMembers({
        mentions,
        candidateId,
        commentBody: trimmedBody,
        commenterName: MOCK_USER.name,
      }).catch((err) =>
        console.error("[createComment] mention notification error:", err),
      );
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[createComment] Error:", err);
    return { error: "Failed to post comment. Please try again." };
  }
}

/**
 * Look up mentioned team members' emails and send notification emails
 * AND create in-app notification records.
 * Excludes the commenter from receiving a notification.
 */
async function notifyMentionedMembers(params: {
  readonly mentions: ReadonlyArray<{ userId: string; name: string }>;
  readonly candidateId: string;
  readonly commentBody: string;
  readonly commenterName: string;
}): Promise<void> {
  const { mentions, candidateId, commentBody, commenterName } = params;

  // Look up candidate name + role slug for the notification link
  const [candidate] = await db
    .select({
      name: candidates.name,
      roleId: candidates.roleId,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  const candidateName = candidate?.name ?? "Unknown Candidate";

  // Resolve role slug for the deep link
  let roleSlug = "dashboard";
  if (candidate?.roleId) {
    const [role] = await db
      .select({ slug: roles.slug })
      .from(roles)
      .where(eq(roles.id, candidate.roleId))
      .limit(1);
    if (role?.slug) {
      roleSlug = role.slug;
    }
  }

  const notificationLink = `/roles/${roleSlug}?candidate=${candidateId}`;

  // Look up mentioned team members from the DB (need userId for in-app notifications)
  const mentionedNames = mentions.map((m) => m.name);
  const members = await db
    .select({
      userId: teamMembers.userId,
      name: teamMembers.name,
      email: teamMembers.email,
    })
    .from(teamMembers)
    .where(eq(teamMembers.isActive, true));

  // Filter to only members whose name matches a mention, excluding the commenter
  const recipients = members.filter(
    (m) =>
      m.name &&
      mentionedNames.includes(m.name) &&
      m.name !== commenterName &&
      m.email,
  );

  const truncatedBody =
    commentBody.length > 120 ? `${commentBody.slice(0, 120)}...` : commentBody;

  // Send emails + create in-app notifications in parallel
  await Promise.allSettled(
    recipients.flatMap((recipient) => [
      // Email notification
      sendMentionNotificationEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name ?? "Team Member",
        commenterName,
        candidateName,
        candidateId,
        commentBody,
      }),
      // In-app notification
      createNotification({
        userId: recipient.userId,
        type: "mention",
        title: `${commenterName} mentioned you`,
        body: `in a comment on ${candidateName}: "${truncatedBody}"`,
        link: notificationLink,
      }),
    ]),
  );
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
      return {
        error: "Comment not found, not yours, or edit window expired (5 min)",
      };
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

/**
 * Get active team members for @mention autocomplete.
 * Returns only id and name — no sensitive data sent to the client.
 */
export async function getMentionableMembers(): Promise<
  Array<{ id: string; name: string }>
> {
  const members = await db
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
    })
    .from(teamMembers)
    .where(eq(teamMembers.isActive, true));

  return members
    .filter((m): m is { id: string; name: string } => m.name !== null)
    .map((m) => ({ id: m.id, name: m.name }));
}
