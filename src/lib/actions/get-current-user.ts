"use server";

import { getAuthUser } from "@/lib/auth";

export async function getCurrentUserForAudit() {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized: no authenticated user for audit trail");
  }
  return { id: user.id, name: user.name, avatar: user.avatar };
}
