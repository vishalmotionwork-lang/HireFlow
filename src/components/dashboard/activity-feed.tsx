import {
  UserPlus,
  ArrowRight,
  MessageSquare,
  GitMerge,
  XCircle,
  Upload,
  Pencil,
} from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { Activity, CandidateStatus } from "@/types";

interface ActivityFeedProps {
  activities: Activity[];
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
      return `Rejected ${name}${meta?.reason ? ` — ${meta.reason}` : ""}`;
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

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type] ?? ArrowRight;
        return (
          <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
              <Icon size={12} className="text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                {getActivityDescription(activity)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {activity.actorName} &middot;{" "}
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
