"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  ArrowRight,
  MessageSquare,
  GitMerge,
  XCircle,
  Upload,
  Pencil,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import { loadMoreActivities } from "@/lib/actions/activity-loader";
import type { Activity, CandidateStatus } from "@/types";

interface ActivityFeedProps {
  activities: Activity[];
  onCandidateClick?: (candidateId: string) => void;
  /** Maximum entries to allow loading. Defaults to 50. */
  maxEntries?: number;
}

const ACTIVITY_ICONS: Record<string, typeof UserPlus> = {
  created: UserPlus,
  status_change: ArrowRight,
  tier_change: ArrowRight,
  comment: MessageSquare,
  merged: GitMerge,
  rejected: XCircle,
  imported: Upload,
  field_update: Pencil,
};

function getActivityDescription(activity: Activity): string {
  const meta = activity.metadata as Record<string, string> | null;
  const name = activity.candidateName ?? "a candidate";

  switch (activity.type) {
    case "created":
      return `Added ${name}`;
    case "status_change": {
      const to = meta?.to as CandidateStatus | undefined;
      return `Moved ${name} to ${to ? (STATUS_LABELS[to] ?? to) : "new status"}`;
    }
    case "rejected":
      return `Rejected ${name}${meta?.reason ? ` \u2014 ${meta.reason}` : ""}`;
    case "comment":
      return `Commented on ${name}`;
    case "tier_change":
      return `Changed tier for ${name}`;
    case "merged":
      return `Merged duplicate for ${name}`;
    case "imported":
      return `Imported ${name}`;
    case "field_update":
      return `Updated ${name}`;
    default:
      return `${activity.type} on ${name}`;
  }
}

export function ActivityFeed({
  activities: initialActivities,
  onCandidateClick,
  maxEntries = 50,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [hasMore, setHasMore] = useState(initialActivities.length >= 10);
  const [isLoading, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const lastActivity = activities[activities.length - 1];
      if (!lastActivity) return;

      const remaining = maxEntries - activities.length;
      if (remaining <= 0) {
        setHasMore(false);
        return;
      }

      const batchSize = Math.min(20, remaining);
      const more = await loadMoreActivities(
        lastActivity.createdAt.toISOString(),
        batchSize,
      );

      if (more.length === 0 || more.length < batchSize) {
        setHasMore(false);
      }

      setActivities((prev) => [...prev, ...more]);
    });
  };

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type] ?? ArrowRight;
          const isClickable = !!activity.candidateId && !!onCandidateClick;

          return (
            <div
              key={activity.id}
              className={`flex items-start gap-3 px-4 py-3 ${isClickable ? "cursor-pointer hover:bg-accent/50" : ""}`}
              onClick={
                isClickable
                  ? () => onCandidateClick!(activity.candidateId!)
                  : undefined
              }
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onCandidateClick!(activity.candidateId!);
                      }
                    }
                  : undefined
              }
            >
              {/* Avatar or icon */}
              {activity.actorAvatar ? (
                <img
                  src={activity.actorAvatar}
                  alt={activity.actorName}
                  className="h-6 w-6 rounded-full shrink-0 mt-0.5 object-cover"
                />
              ) : (
                <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                  <Icon size={12} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.actorName}
                  {activity.roleName && (
                    <span className="text-muted-foreground/60">
                      {" "}
                      in {activity.roleName}
                    </span>
                  )}
                  {" \u00B7 "}
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more button */}
      {hasMore && activities.length < maxEntries && (
        <button
          onClick={handleLoadMore}
          disabled={isLoading}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              Load more
            </>
          )}
        </button>
      )}
    </div>
  );
}
