import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { TeamRole } from "@/lib/auth";

/**
 * GET /api/approve-member?id=...&action=approve|reject&role=viewer|editor|admin
 *
 * One-click approve/reject from email link.
 * Redirects to settings page after action.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("id");
  const action = searchParams.get("action");
  const role = (searchParams.get("role") ?? "viewer") as TeamRole;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://hireflow-app-theta.vercel.app");

  if (!memberId || !action) {
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_link`);
  }

  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (!member) {
      return NextResponse.redirect(`${baseUrl}/settings?error=member_not_found`);
    }

    if (action === "approve") {
      await db
        .update(teamMembers)
        .set({ isActive: true, role })
        .where(eq(teamMembers.id, memberId));

      return NextResponse.redirect(`${baseUrl}/settings?approved=${member.name ?? member.email}`);
    }

    if (action === "reject") {
      await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

      return NextResponse.redirect(`${baseUrl}/settings?rejected=${member.name ?? member.email}`);
    }

    return NextResponse.redirect(`${baseUrl}/settings`);
  } catch (err) {
    console.error("[approve-member] Error:", err);
    return NextResponse.redirect(`${baseUrl}/settings?error=action_failed`);
  }
}
