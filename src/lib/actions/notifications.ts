"use server";

import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth, getAuthUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = "mention" | "status_change";

export interface CreateNotificationInput {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly link: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Queries -- derive userId from session, not client parameter
// ---------------------------------------------------------------------------

/**
 * Fetch up to 50 notifications for the authenticated user, newest first.
 * userId is derived from the session to prevent IDOR.
 */
export async function getNotifications(): Promise<
  ReadonlyArray<NotificationRow>
> {
  const user = await getAuthUser();
  if (!user) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

/**
 * Count unread notifications for the authenticated user.
 * userId is derived from the session to prevent IDOR.
 */
export async function getUnreadCount(): Promise<number> {
  const user = await getAuthUser();
  if (!user) return 0;

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, user.id), eq(notifications.isRead, false)),
    );

  return result?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a single notification record.
 * This is an internal function called by other server actions
 * (e.g., notifyMentionedMembers) to create notifications for specific users.
 * The userId here is the target recipient, not the current user.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/**
 * Mark a single notification as read.
 * Verifies the notification belongs to the authenticated user.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  if (!notificationId) return;

  const user = await requireAuth();
  if (!user) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id),
      ),
    );
}

/**
 * Mark all notifications for the authenticated user as read.
 * userId is derived from the session to prevent IDOR.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireAuth();
  if (!user) return;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, user.id), eq(notifications.isRead, false)),
    );
}
