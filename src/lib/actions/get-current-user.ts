"use server";

import { getAuthUser } from "@/lib/auth";
import { MOCK_USER } from "@/lib/constants";

export async function getCurrentUserForAudit() {
  const user = await getAuthUser();
  if (user) {
    return { id: user.id, name: user.name, avatar: user.avatar };
  }
  return { id: "mock-user", name: MOCK_USER.name, avatar: MOCK_USER.avatar };
}
