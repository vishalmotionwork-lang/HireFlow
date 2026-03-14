import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TeamRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: TeamRole;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Find team member record
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  // No record or inactive → not authorized (middleware handles redirect)
  if (!member || !member.isActive) return null;

  return {
    id: user.id,
    email: user.email ?? member.email,
    name:
      member.name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "User",
    avatar: member.avatar ?? user.user_metadata?.avatar_url ?? null,
    role: member.role as TeamRole,
  };
}

/**
 * Check if a Supabase-authenticated user is an active team member.
 * Used for API route guards where middleware may not apply.
 */
export async function isActiveTeamMember(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const [member] = await db
    .select({ isActive: teamMembers.isActive })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  return !!member?.isActive;
}

/** Check if user has required permission level */
export function hasPermission(userRole: TeamRole, required: TeamRole): boolean {
  const levels: Record<TeamRole, number> = {
    admin: 3,
    editor: 2,
    viewer: 1,
  };
  return levels[userRole] >= levels[required];
}

/** Require auth — throws redirect if not authenticated or not active */
export async function requireAuth(minRole?: TeamRole): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  // If Supabase session exists but getAuthUser returns null,
  // the user is authenticated but not an active team member → pending
  const user = await getAuthUser();
  if (!user && supabaseUser) {
    const { redirect } = await import("next/navigation");
    redirect("/pending");
    throw new Error("Redirecting to pending");
  }
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
    throw new Error("Redirecting to login");
  }
  if (minRole && !hasPermission(user.role, minRole)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard?error=unauthorized");
  }
  return user;
}
