import { cache } from "react";
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

/**
 * Get the authenticated user for the current request.
 * Wrapped in React.cache() so it is deduplicated per request —
 * layout, page, and components can all call this without extra DB hits.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
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
});

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

/**
 * Require auth — throws redirect if not authenticated or not active.
 *
 * Uses getAuthUser() (cached) so no duplicate Supabase calls.
 * If getAuthUser returns null, does a lightweight session check to
 * distinguish "not logged in" from "logged in but not a team member".
 */
export async function requireAuth(minRole?: TeamRole): Promise<AuthUser> {
  const { redirect } = await import("next/navigation");

  const user = await getAuthUser();

  if (!user) {
    // Distinguish: no session vs session but not an active team member
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser) {
      // Has a Supabase session but getAuthUser returned null →
      // authenticated but not an active team member
      redirect("/pending");
    }

    // No session at all — redirect() throws internally but TS doesn't know
    redirect("/login");
    throw new Error("Redirecting to login"); // unreachable, satisfies TS
  }

  if (minRole && !hasPermission(user.role, minRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  return user;
}
