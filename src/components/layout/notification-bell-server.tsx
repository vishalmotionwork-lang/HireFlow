import { getAuthUser } from "@/lib/auth";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/actions/notifications";
import { NotificationBell } from "@/components/layout/notification-bell";

/**
 * Server component that fetches notification data and renders the client bell.
 * Returns null if the user is not authenticated.
 */
export async function NotificationBellServer() {
  const user = await getAuthUser();
  if (!user) return null;

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id),
    getUnreadCount(user.id),
  ]);

  return (
    <NotificationBell
      userId={user.id}
      initialUnreadCount={unreadCount}
      initialNotifications={notifications}
    />
  );
}
