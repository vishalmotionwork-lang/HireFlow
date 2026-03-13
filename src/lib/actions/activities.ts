"use server";

import { db } from "@/db";
import { activities } from "@/db/schema";
import { MOCK_USER } from "@/lib/constants";
import type { NewActivity } from "@/types";

/**
 * Create an activity record. Denormalized for fast reads — no joins needed.
 * Called from other server actions after mutations.
 */
export async function createActivity(
  params: Omit<NewActivity, "id" | "createdAt" | "actorId" | "actorName">,
) {
  await db.insert(activities).values({
    ...params,
    actorId: MOCK_USER.name, // replace with Clerk userId when auth is added
    actorName: MOCK_USER.name,
    actorAvatar: MOCK_USER.avatar,
  });
}
