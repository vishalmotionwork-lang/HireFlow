"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers, invitations } from "@/db/schema";
import { requireAuth, type TeamRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function getTeamMembers() {
  return db.select().from(teamMembers).where(eq(teamMembers.isActive, true));
}

export async function getPendingMembers() {
  return db.select().from(teamMembers).where(eq(teamMembers.isActive, false));
}

export async function approveMember(memberId: string, role?: TeamRole) {
  await requireAuth("admin");

  await db
    .update(teamMembers)
    .set({ isActive: true, role: role ?? "viewer" })
    .where(eq(teamMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}

export async function rejectPendingMember(memberId: string) {
  await requireAuth("admin");

  await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}

export async function getPendingInvitations() {
  return db.select().from(invitations).where(eq(invitations.status, "pending"));
}

export async function inviteTeamMember(email: string, role: TeamRole) {
  const user = await requireAuth("admin");

  // Check if already a member
  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    return { error: "This person is already a team member" };
  }

  // Check if already invited
  const [existingInvite] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.email, email.toLowerCase()))
    .limit(1);

  if (existingInvite && existingInvite.status === "pending") {
    return { error: "An invitation is already pending for this email" };
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invitation record
  await db.insert(invitations).values({
    email: email.toLowerCase(),
    role,
    invitedBy: user.id,
    token,
    expiresAt,
  });

  // Send magic link via Supabase (they'll auto-join on callback)
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email.toLowerCase(),
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  );

  if (error) {
    // If user already exists in Supabase Auth, that's fine — they'll just log in
    if (!error.message.includes("already been registered")) {
      console.error("[inviteTeamMember] Supabase invite error:", error.message);
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateMemberRole(memberId: string, newRole: TeamRole) {
  const user = await requireAuth("admin");

  // Can't change own role
  const [target] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (!target) return { error: "Member not found" };
  if (target.userId === user.id)
    return { error: "Cannot change your own role" };

  await db
    .update(teamMembers)
    .set({ role: newRole })
    .where(eq(teamMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}

export async function removeMember(memberId: string) {
  const user = await requireAuth("admin");

  const [target] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (!target) return { error: "Member not found" };
  if (target.userId === user.id) return { error: "Cannot remove yourself" };

  await db
    .update(teamMembers)
    .set({ isActive: false })
    .where(eq(teamMembers.id, memberId));

  revalidatePath("/settings");
  return { success: true };
}

export async function revokeInvitation(invitationId: string) {
  await requireAuth("admin");

  await db
    .update(invitations)
    .set({ status: "expired" })
    .where(eq(invitations.id, invitationId));

  revalidatePath("/settings");
  return { success: true };
}
