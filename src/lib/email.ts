"use server";

import { Resend } from "resend";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "HireFlow <onboarding@resend.dev>";

/**
 * Send approval request email to all admin team members.
 */
export async function sendApprovalRequestEmail(
  pendingMemberId: string,
  pendingName: string,
  pendingEmail: string,
  pendingAvatar: string | null,
) {
  try {
    // Get all active admins
    const admins = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.role, "admin"));

    const activeAdmins = admins.filter((a) => a.isActive);
    if (activeAdmins.length === 0) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "https://hireflow-app-theta.vercel.app";

    const approveUrl = `${baseUrl}/api/approve-member?id=${pendingMemberId}&action=approve&role=viewer`;
    const approveEditorUrl = `${baseUrl}/api/approve-member?id=${pendingMemberId}&action=approve&role=editor`;
    const rejectUrl = `${baseUrl}/api/approve-member?id=${pendingMemberId}&action=reject`;

    const adminEmails = activeAdmins.map((a) => a.email).filter(Boolean);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject: `🔔 New access request: ${pendingName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #2563eb; color: white; font-weight: bold; font-size: 18px; width: 40px; height: 40px; line-height: 40px; border-radius: 10px;">H</div>
            <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">HireFlow Direct</p>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; text-align: center;">
            ${pendingAvatar ? `<img src="${pendingAvatar}" alt="" style="width: 48px; height: 48px; border-radius: 50%; margin-bottom: 12px;" />` : ""}
            <h2 style="margin: 0 0 4px; font-size: 16px; color: #111827;">${pendingName}</h2>
            <p style="margin: 0 0 16px; font-size: 13px; color: #6b7280;">${pendingEmail}</p>
            <p style="margin: 0 0 20px; font-size: 14px; color: #92400e;">wants to join your HireFlow team</p>

            <div style="display: flex; gap: 8px; justify-content: center;">
              <a href="${approveUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
                ✅ Approve as Viewer
              </a>
              <a href="${approveEditorUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
                ✏️ Approve as Editor
              </a>
            </div>

            <div style="margin-top: 12px;">
              <a href="${rejectUrl}" style="display: inline-block; color: #dc2626; padding: 8px 16px; font-size: 12px; text-decoration: none;">
                Reject request
              </a>
            </div>
          </div>

          <p style="margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
            Or manage all requests at <a href="${baseUrl}/settings" style="color: #2563eb;">Settings → Team</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[sendApprovalRequestEmail] Error:", err);
    // Don't throw — email failure shouldn't block the auth flow
  }
}

/**
 * Build the base URL for links in emails.
 */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "https://hireflow-app-theta.vercel.app";
}

interface MentionNotificationParams {
  readonly recipientEmail: string;
  readonly recipientName: string;
  readonly commenterName: string;
  readonly candidateName: string;
  readonly candidateId: string;
  readonly commentBody: string;
}

/**
 * Send an email notification when someone is @mentioned in a comment.
 * Fire-and-forget — failures are logged but never thrown.
 */
export async function sendMentionNotificationEmail(
  params: MentionNotificationParams,
): Promise<void> {
  const {
    recipientEmail,
    recipientName,
    commenterName,
    candidateName,
    candidateId,
    commentBody,
  } = params;

  try {
    const baseUrl = getBaseUrl();
    const candidateUrl = `${baseUrl}/dashboard?candidate=${candidateId}`;
    const truncatedBody =
      commentBody.length > 200
        ? `${commentBody.slice(0, 200)}...`
        : commentBody;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `[HireFlow] You were mentioned in a comment on ${candidateName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #2563eb; color: white; font-weight: bold; font-size: 18px; width: 40px; height: 40px; line-height: 40px; border-radius: 10px;">H</div>
            <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">HireFlow Direct</p>
          </div>

          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #1e40af; font-weight: 600;">
              Hi ${recipientName},
            </p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
              <strong>${commenterName}</strong> mentioned you in a comment on <strong>${candidateName}</strong>:
            </p>
            <div style="background: white; border-left: 3px solid #2563eb; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5;">
                ${truncatedBody}
              </p>
            </div>
            <div style="text-align: center;">
              <a href="${candidateUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
                View Candidate
              </a>
            </div>
          </div>

          <p style="margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
            You received this because you were @mentioned in a comment on HireFlow.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[sendMentionNotificationEmail] Error:", err);
    // Don't throw — email failure shouldn't block the comment flow
  }
}
