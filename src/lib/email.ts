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

    const initials = pendingName.charAt(0).toUpperCase();

    await resend.emails.send({
      from: FROM_EMAIL,
      to: adminEmails,
      subject: `New access request: ${pendingName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background: #ffffff;">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #111827; color: white; font-weight: 700; font-size: 14px; width: 36px; height: 36px; line-height: 36px; border-radius: 8px; letter-spacing: -0.5px;">H</div>
          </div>

          <!-- Card -->
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 24px 24px 20px; text-align: center;">
              ${
                pendingAvatar
                  ? `<img src="${pendingAvatar}" alt="" style="width: 56px; height: 56px; border-radius: 50%; margin-bottom: 16px; border: 2px solid #f3f4f6;" />`
                  : `<div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background: #f3f4f6; color: #374151; font-weight: 600; font-size: 20px; margin-bottom: 16px;">${initials}</div>`
              }
              <h2 style="margin: 0 0 2px; font-size: 18px; font-weight: 600; color: #111827;">${pendingName}</h2>
              <p style="margin: 0 0 16px; font-size: 13px; color: #9ca3af;">${pendingEmail}</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">is requesting access to <strong style="color: #111827;">HireFlow</strong></p>
            </div>

            <!-- Divider -->
            <div style="height: 1px; background: #f3f4f6; margin: 0 24px;"></div>

            <!-- Actions -->
            <div style="padding: 20px 24px 24px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 8px;">
                    <a href="${approveUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">
                      Approve as Viewer
                    </a>
                  </td>
                  <td>
                    <a href="${approveEditorUrl}" style="display: inline-block; background: #ffffff; color: #111827; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; border: 1px solid #d1d5db;">
                      Approve as Editor
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 16px;">
                <a href="${rejectUrl}" style="font-size: 12px; color: #9ca3af; text-decoration: none;">
                  Decline request
                </a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <p style="margin-top: 24px; font-size: 11px; color: #d1d5db; text-align: center;">
            <a href="${baseUrl}/settings" style="color: #9ca3af; text-decoration: none;">Manage team in Settings</a>
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
