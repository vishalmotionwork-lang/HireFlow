"use server";

import { db } from "@/db";
import { activities } from "@/db/schema";
import { getCurrentUserForAudit } from "@/lib/actions/get-current-user";
import type { NewActivity } from "@/types";

/**
 * Create an activity record. Denormalized for fast reads — no joins needed.
 * Called from other server actions after mutations.
 */
export async function createActivity(
  params: Omit<NewActivity, "id" | "createdAt" | "actorId" | "actorName">,
) {
  const actor = await getCurrentUserForAudit();
  await db.insert(activities).values({
    ...params,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
  });
}
