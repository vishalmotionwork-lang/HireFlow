"use server";

import { desc, lt } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import type { Activity } from "@/types";

/**
 * Load more activities older than the given cursor timestamp.
 * Used by the "Load more" button in the activity feed.
 */
export async function loadMoreActivities(
  cursorIso: string,
  limit = 20,
): Promise<Activity[]> {
  const cursor = new Date(cursorIso);

  const rows = await db
    .select()
    .from(activities)
    .where(lt(activities.createdAt, cursor))
    .orderBy(desc(activities.createdAt))
    .limit(Math.min(limit, 50));

  return rows;
}
