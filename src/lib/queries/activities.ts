import { desc } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";

/**
 * Fetch most recent activities for the dashboard feed.
 */
export async function getRecentActivities(limit = 10) {
  return db
    .select()
    .from(activities)
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}
