import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers, invitations } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendApprovalRequestEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Task 2: Sanitize redirect — block open redirects (//evil.com, protocol-relative, etc.)
  const rawNext = searchParams.get("redirect") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

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

      // Task 3: Check invitation expiry before accepting
      if (
        invite &&
        invite.status === "pending" &&
        new Date(invite.expiresAt) > new Date()
      ) {
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
      } else if (invite) {
        // Expired or already used invitation — mark as expired
        await db
          .update(invitations)
          .set({ status: "expired" })
          .where(eq(invitations.id, invite.id));
        // Fall through to pending approval flow
      }

      // Task 4: Fix first-user race condition — use transaction with count check
      const userName =
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "User";
      const userAvatar = user.user_metadata?.avatar_url ?? null;

      const firstUserInserted = await db.transaction(async (tx) => {
        const [{ count: memberCount }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(teamMembers);

        if (memberCount === 0) {
          // First user -> admin, active immediately
          await tx.insert(teamMembers).values({
            userId: user.id,
            email: user.email ?? "",
            name: userName,
            avatar: userAvatar,
            role: "admin",
            isActive: true,
          });
          return true;
        }
        return false;
      });

      if (firstUserInserted) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Not invited, not first user -> create as INACTIVE (pending approval)
      const [newMember] = await db
        .insert(teamMembers)
        .values({
          userId: user.id,
          email: user.email ?? "",
          name: userName,
          avatar: userAvatar,
          role: "viewer",
          isActive: false,
        })
        .returning();

      // Send approval email to all admins
      await sendApprovalRequestEmail(
        newMember.id,
        userName,
        user.email ?? "",
        userAvatar,
      );

      return NextResponse.redirect(`${origin}/pending`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
