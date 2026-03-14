import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, invitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendApprovalRequestEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("redirect") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Check if user is already a team member
      const [existing] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, user.id))
        .limit(1);

      if (existing) {
        // Existing member — check if active
        if (!existing.isActive) {
          return NextResponse.redirect(`${origin}/pending`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // New user — check for pending invitation
      const [invite] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.email, user.email ?? ""))
        .limit(1);

      if (invite && invite.status === "pending") {
        // Accept invitation — create as ACTIVE team member
        await db.insert(teamMembers).values({
          userId: user.id,
          email: user.email ?? "",
          name:
            user.user_metadata?.full_name ??
            user.email?.split("@")[0] ??
            "User",
          avatar: user.user_metadata?.avatar_url ?? null,
          role: invite.role,
          invitedBy: invite.invitedBy,
          isActive: true,
        });

        await db
          .update(invitations)
          .set({ status: "accepted" })
          .where(eq(invitations.id, invite.id));

        return NextResponse.redirect(`${origin}${next}`);
      }

      // No invitation — check if FIRST user
      const allMembers = await db.select().from(teamMembers);
      const isFirstUser = allMembers.length === 0;

      if (isFirstUser) {
        // First user → admin, active immediately
        await db.insert(teamMembers).values({
          userId: user.id,
          email: user.email ?? "",
          name:
            user.user_metadata?.full_name ??
            user.email?.split("@")[0] ??
            "User",
          avatar: user.user_metadata?.avatar_url ?? null,
          role: "admin",
          isActive: true,
        });
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Not invited, not first user → create as INACTIVE (pending approval)
      const pendingName =
        user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
      const pendingAvatar = user.user_metadata?.avatar_url ?? null;

      const [newMember] = await db
        .insert(teamMembers)
        .values({
          userId: user.id,
          email: user.email ?? "",
          name: pendingName,
          avatar: pendingAvatar,
          role: "viewer",
          isActive: false,
        })
        .returning();

      // Send approval email to all admins
      await sendApprovalRequestEmail(
        newMember.id,
        pendingName,
        user.email ?? "",
        pendingAvatar,
      );

      return NextResponse.redirect(`${origin}/pending`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
