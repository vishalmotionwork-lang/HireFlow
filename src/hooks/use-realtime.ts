"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeSubscriptionConfig {
  /** Supabase table name to listen on */
  table: string;
  /** Postgres schema (defaults to "public") */
  schema?: string;
  /** Event types to listen for (defaults to "*") */
  event?: PostgresChangeEvent;
  /** Optional row-level filter, e.g. "role_id=eq.abc-123" */
  filter?: string;
  /** Callback fired on any matching change */
  onChanged: () => void;
  /** Whether the subscription is active (defaults to true) */
  enabled?: boolean;
}

/**
 * Subscribe to Supabase Realtime postgres_changes on a table.
 * Automatically cleans up the channel on unmount or when deps change.
 *
 * Usage:
 *   useRealtimeSubscription({
 *     table: "candidates",
 *     filter: `role_id=eq.${roleId}`,
 *     onChanged: () => router.refresh(),
 *   });
 */
export function useRealtimeSubscription({
  table,
  schema = "public",
  event = "*",
  filter,
  onChanged,
  enabled = true,
}: RealtimeSubscriptionConfig): void {
  // Keep callback ref fresh without re-subscribing
  const callbackRef = useRef(onChanged);
  callbackRef.current = onChanged;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ""}`;

    const channelConfig: {
      event: PostgresChangeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = { event, schema, table };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, () => {
        callbackRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled]);
}
