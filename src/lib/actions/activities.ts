"use server";

import { db } from "@/db";
import { activities } from "@/db/schema";
import type { NewActivity } from "@/types";

export interface ActivityActor {
  readonly id: string;
  readonly name: string;
  readonly avatar: string | null;
}

/**
 * Create an activity record. Denormalized for fast reads -- no joins needed.
 * Called from other server actions after mutations.
 *
 * The caller must pass the authenticated user (actor) explicitly.
 * This avoids a redundant auth lookup since the caller already has the user.
 */
export async function createActivity(
  params: Omit<NewActivity, "id" | "createdAt" | "actorId" | "actorName">,
  actor?: ActivityActor,
) {
  // If no actor provided, resolve from session (backward compatibility)
  const resolvedActor = actor ?? (await resolveActor());

  await db.insert(activities).values({
    ...params,
    actorId: resolvedActor.id,
    actorName: resolvedActor.name,
    actorAvatar: resolvedActor.avatar,
  });
}

async function resolveActor(): Promise<ActivityActor> {
  const { getCurrentUserForAudit } = await import(
    "@/lib/actions/get-current-user"
  );
  return getCurrentUserForAudit();
}
