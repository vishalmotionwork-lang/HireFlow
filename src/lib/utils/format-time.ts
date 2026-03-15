/**
 * Format a date as human-readable relative time.
 *
 * Examples:
 *   - Just now / 5m ago / 3h ago / Yesterday / 4d ago / Mar 13
 *
 * Handles both Date objects and ISO strings.
 * Returns "Never" for null/undefined input.
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Never";

  const d = new Date(date);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;

  // Older than a week: short date
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
