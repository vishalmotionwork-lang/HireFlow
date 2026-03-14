"use client";

import { useRouter } from "next/navigation";
import { useRealtimeSubscription } from "@/hooks/use-realtime";

interface RealtimeRefreshProps {
  /** Tables to subscribe to. Each entry can include a filter. */
  subscriptions: Array<{
    table: string;
    filter?: string;
  }>;
}

/**
 * Drop-in client component that subscribes to Supabase Realtime
 * and calls `router.refresh()` when any subscribed table changes.
 *
 * Renders nothing — just sets up the subscription.
 *
 * Usage (in a server component):
 *   <RealtimeRefresh
 *     subscriptions={[
 *       { table: "candidates", filter: `role_id=eq.${role.id}` },
 *     ]}
 *   />
 */
export function RealtimeRefresh({ subscriptions }: RealtimeRefreshProps) {
  const router = useRouter();

  return (
    <>
      {subscriptions.map(({ table, filter }) => (
        <RealtimeChannel
          key={`${table}:${filter ?? "all"}`}
          table={table}
          filter={filter}
          onChanged={() => router.refresh()}
        />
      ))}
    </>
  );
}

/** Internal: one subscription per channel */
function RealtimeChannel({
  table,
  filter,
  onChanged,
}: {
  table: string;
  filter?: string;
  onChanged: () => void;
}) {
  useRealtimeSubscription({ table, filter, onChanged });
  return null;
}
