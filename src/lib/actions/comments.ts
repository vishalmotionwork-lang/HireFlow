"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { candidateComments, candidates, roles, teamMembers } from "@/db/schema";
import { requireAuth, getAuthUser } from "@/lib/auth";
import { createActivity } from "@/lib/actions/activities";
import { createNotification } from "@/lib/actions/notifications";
import { sendMentionNotificationEmail } from "@/lib/email";
import { sendWhatsAppText, isWhatsAppConfigured } from "@/lib/whatsapp";

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
    const user = await requireAuth("editor");

    if (!body.trim()) {
      return { error: "Comment cannot be empty" };
    }

    const trimmedBody = body.trim();

    await db.insert(candidateComments).values({
      candidateId,
      body: trimmedBody,
      mentions,
      createdBy: user.name,
    });

    await createActivity(
      {
        type: "comment",
        candidateId,
        metadata: { body: trimmedBody.slice(0, 100) },
      },
      { id: user.id, name: user.name, avatar: user.avatar },
    );

    // Send mention notification emails (fire-and-forget, non-blocking)
    if (mentions.length > 0) {
      notifyMentionedMembers({
        mentions,
        candidateId,
        commentBody: trimmedBody,
        commenterName: user.name,
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
      phone: teamMembers.phone,
      whatsappEnabled: teamMembers.whatsappEnabled,
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

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3099");
  const candidateUrl = `${baseUrl}${notificationLink}`;
  const whatsappConfigured = isWhatsAppConfigured();

  // Send emails + in-app notifications + WhatsApp in parallel
  await Promise.allSettled(
    recipients.flatMap((recipient) => {
      const tasks: Promise<unknown>[] = [
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
      ];

      // WhatsApp -- one simple message with link
      if (whatsappConfigured && recipient.whatsappEnabled && recipient.phone) {
        tasks.push(
          sendWhatsAppText(
            recipient.phone,
            `[HireFlow] ${commenterName} mentioned you on ${candidateName} -- ${candidateUrl}`,
          ),
        );
      }

      return tasks;
    }),
  );
}

/**
 * Edit an existing comment. Only the author can edit, within 5 minutes.
 * Uses user.name from session to verify ownership.
 */
export async function editComment(
  commentId: string,
  body: string,
): Promise<ActionResult> {
  try {
    const user = await requireAuth("editor");

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
          eq(candidateComments.createdBy, user.name),
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
 * Delete a comment. Only the author can delete.
 */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth("editor");

    const [comment] = await db
      .select({ createdBy: candidateComments.createdBy })
      .from(candidateComments)
      .where(eq(candidateComments.id, commentId))
      .limit(1);

    if (!comment) {
      return { error: "Comment not found" };
    }

    if (comment.createdBy !== user.name) {
      return { error: "You can only delete your own comments" };
    }

    await db
      .delete(candidateComments)
      .where(eq(candidateComments.id, commentId));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[deleteComment] Error:", err);
    return { error: "Failed to delete comment. Please try again." };
  }
}

/**
 * Get all comments for a candidate, newest first.
 * Read-only -- requires authenticated user.
 */
export async function getComments(candidateId: string) {
  const user = await getAuthUser();
  if (!user) return [];

  return db
    .select()
    .from(candidateComments)
    .where(eq(candidateComments.candidateId, candidateId))
    .orderBy(desc(candidateComments.createdAt));
}

/**
 * Get active team members for @mention autocomplete.
 * Returns only id and name -- no sensitive data sent to the client.
 * Read-only -- requires authenticated user.
 */
export async function getMentionableMembers(): Promise<
  Array<{ id: string; name: string }>
> {
  const user = await getAuthUser();
  if (!user) return [];

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
