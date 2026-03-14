"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import type { NotificationRow } from "@/lib/actions/notifications";

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  userId: string;
  initialUnreadCount: number;
  initialNotifications: ReadonlyArray<NotificationRow>;
}

export function NotificationBell({
  userId,
  initialUnreadCount,
  initialNotifications,
}: NotificationBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState<ReadonlyArray<NotificationRow>>(
    initialNotifications,
  );
  const [isOpen, setIsOpen] = useState(false);

  // Refresh data from server
  const refreshNotifications = useCallback(() => {
    startTransition(async () => {
      const [freshItems, freshCount] = await Promise.all([
        getNotifications(userId),
        getUnreadCount(userId),
      ]);
      setItems(freshItems);
      setUnreadCount(freshCount);
    });
  }, [userId]);

  // Real-time: subscribe to notifications table filtered by this user
  useRealtimeSubscription({
    table: "notifications",
    filter: `user_id=eq.${userId}`,
    event: "INSERT",
    onChanged: refreshNotifications,
  });

  // Refresh when popover opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        refreshNotifications();
      }
    },
    [refreshNotifications],
  );

  // Click a notification → mark read + navigate
  const handleNotificationClick = useCallback(
    (notification: NotificationRow) => {
      if (!notification.isRead) {
        startTransition(async () => {
          await markNotificationRead(notification.id);
          setItems((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, isRead: true } : n,
            ),
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });
      }
      setIsOpen(false);
      router.push(notification.link);
    },
    [router],
  );

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      await markAllNotificationsRead(userId);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  }, [userId]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 flex flex-col max-h-[28rem]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Bell size={24} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex gap-3 items-start ${
                      notification.isRead ? "opacity-60" : ""
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="mt-1.5 flex-shrink-0">
                      {notification.isRead ? (
                        <div className="h-2 w-2 rounded-full bg-transparent" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          notification.isRead
                            ? "text-muted-foreground"
                            : "text-foreground font-medium"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
