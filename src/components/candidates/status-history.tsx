"use client";

import { STATUS_LABELS, TIER_LABELS } from "@/lib/constants";
import type { CandidateEvent } from "@/types";

interface StatusHistoryProps {
  events: CandidateEvent[];
}

/** Returns a color class for the dot based on event type. */
function getDotColor(eventType: string): string {
  switch (eventType) {
    case "created":
    case "hired":
      return "bg-green-500";
    case "status_change":
      return "bg-blue-500";
    case "tier_change":
      return "bg-purple-500";
    default:
      return "bg-gray-400";
  }
}

/** Format a date as relative time ("2 hours ago") or "Mar 13" for older dates. */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Build a human-readable description for an event. */
function describeEvent(event: CandidateEvent): string {
  switch (event.eventType) {
    case "created":
      return "Candidate created";
    case "status_change": {
      const from = event.fromValue
        ? STATUS_LABELS[event.fromValue as keyof typeof STATUS_LABELS] ?? event.fromValue
        : "unknown";
      const to = event.toValue
        ? STATUS_LABELS[event.toValue as keyof typeof STATUS_LABELS] ?? event.toValue
        : "unknown";
      return `Status changed from ${from} to ${to}`;
    }
    case "tier_change": {
      const from = event.fromValue
        ? TIER_LABELS[event.fromValue as keyof typeof TIER_LABELS] ?? event.fromValue
        : "unknown";
      const to = event.toValue
        ? TIER_LABELS[event.toValue as keyof typeof TIER_LABELS] ?? event.toValue
        : "unknown";
      return `Tier changed from ${from} to ${to}`;
    }
    default:
      return event.eventType.replace(/_/g, " ");
  }
}

export function StatusHistory({ events }: StatusHistoryProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No history yet.</p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const dotColor = getDotColor(event.eventType);

        return (
          <li key={event.id} className="flex gap-3">
            {/* Left column: dot + vertical line */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`}
                aria-hidden="true"
              />
              {!isLast && (
                <span className="mt-1 w-px flex-1 bg-gray-200" aria-hidden="true" />
              )}
            </div>

            {/* Right column: text content */}
            <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
              <p className="text-sm text-gray-800">{describeEvent(event)}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {event.createdBy && (
                  <span className="mr-1">{event.createdBy} &middot;</span>
                )}
                {formatRelativeTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
