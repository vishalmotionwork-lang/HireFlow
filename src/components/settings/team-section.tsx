"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  X,
  Shield,
  Pencil,
  Eye,
  Loader2,
  Mail,
  Clock,
  Phone,
  MessageCircle,
} from "lucide-react";
import {
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  approveMember,
  rejectPendingMember,
  updateMemberPhone,
  updateMemberWhatsApp,
} from "@/lib/actions/team";
import type { TeamMember, Invitation } from "@/types";
import type { TeamRole } from "@/lib/auth";

const ROLE_CONFIG: Record<
  TeamRole,
  { label: string; icon: typeof Shield; color: string }
> = {
  admin: {
    label: "Admin",
    icon: Shield,
    color: "bg-purple-50 text-purple-700",
  },
  editor: { label: "Editor", icon: Pencil, color: "bg-blue-50 text-blue-700" },
  viewer: { label: "Viewer", icon: Eye, color: "bg-gray-100 text-gray-600" },
};

interface TeamSectionProps {
  members: TeamMember[];
  pendingInvitations: Invitation[];
  pendingMembers?: TeamMember[];
  isAdmin: boolean;
  currentUserId: string | null;
}

export function TeamSection({
  members,
  pendingInvitations,
  pendingMembers = [],
  isAdmin,
  currentUserId,
}: TeamSectionProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [isPending, startTransition] = useTransition();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    startTransition(async () => {
      const result = await inviteTeamMember(email, inviteRole);
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success(`Invitation sent to ${email}`);
        setInviteEmail("");
        setInviteRole("viewer");
      }
    });
  };

  const handleRoleChange = (memberId: string, newRole: TeamRole) => {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole);
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Role updated");
      }
    });
  };

  const handleRemove = (memberId: string, name: string | null) => {
    if (!confirm(`Remove ${name ?? "this member"} from the team?`)) return;

    startTransition(async () => {
      const result = await removeMember(memberId);
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Member removed");
      }
    });
  };

  const handleRevoke = (invitationId: string) => {
    startTransition(async () => {
      const result = await revokeInvitation(invitationId);
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Invitation revoked");
      }
    });
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Team</h2>
        <p className="text-sm text-gray-500">
          {isAdmin
            ? "Manage team members and invite new people."
            : "View your team members."}
        </p>
      </div>

      {/* Invite form — admin only */}
      {isAdmin && (
        <form
          onSubmit={handleInvite}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Email address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
              disabled={isPending}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending || !inviteEmail.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            Invite
          </button>
        </form>
      )}

      {/* Member list */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
        {members.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No team members yet
          </div>
        )}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isAdmin={isAdmin}
            isCurrentUser={member.userId === currentUserId}
            isPending={isPending}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Pending approval — users who signed in without invitation */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Clock size={14} className="text-amber-500" />
            Pending Approval ({pendingMembers.length})
          </h3>
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 divide-y divide-amber-100 overflow-hidden">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name ?? ""}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                    {(member.name ?? member.email)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {member.name ?? member.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-400">{member.email}</p>
                </div>
                <select
                  defaultValue="viewer"
                  id={`role-${member.id}`}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium focus:border-blue-400 focus:outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById(
                      `role-${member.id}`,
                    ) as HTMLSelectElement;
                    const role = (select?.value ?? "viewer") as
                      | "admin"
                      | "editor"
                      | "viewer";
                    startTransition(async () => {
                      const result = await approveMember(member.id, role);
                      if ("error" in result) {
                        toast.error(result.error as string);
                      } else {
                        toast.success(
                          `${member.name ?? member.email} approved`,
                        );
                      }
                    });
                  }}
                  disabled={isPending}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    startTransition(async () => {
                      const result = await rejectPendingMember(member.id);
                      if ("error" in result) {
                        toast.error(result.error as string);
                      } else {
                        toast.success("Request rejected");
                      }
                    });
                  }}
                  disabled={isPending}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {isAdmin && pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Clock size={14} className="text-gray-400" />
            Pending invitations
          </h3>
          <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 divide-y divide-amber-100 overflow-hidden">
            {pendingInvitations.map((invite) => {
              const roleConfig =
                ROLE_CONFIG[invite.role as TeamRole] ?? ROLE_CONFIG.viewer;

              return (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Mail size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {invite.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleConfig.color}`}
                  >
                    {roleConfig.label}
                  </span>
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={isPending}
                    className="rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Revoke invitation"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// MemberRow — individual team member with expandable WhatsApp settings
// ---------------------------------------------------------------------------

interface MemberRowProps {
  member: TeamMember;
  isAdmin: boolean;
  isCurrentUser: boolean;
  isPending: boolean;
  onRoleChange: (memberId: string, newRole: TeamRole) => void;
  onRemove: (memberId: string, name: string | null) => void;
}

function MemberRow({
  member,
  isAdmin,
  isCurrentUser,
  isPending,
  onRoleChange,
  onRemove,
}: MemberRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [phoneInput, setPhoneInput] = useState(member.phone ?? "");
  const [waEnabled, setWaEnabled] = useState(member.whatsappEnabled);
  const [saving, startSaving] = useTransition();

  const roleConfig = ROLE_CONFIG[member.role as TeamRole] ?? ROLE_CONFIG.viewer;

  const canEdit = isAdmin || isCurrentUser;

  const handleSavePhone = () => {
    startSaving(async () => {
      const result = await updateMemberPhone(member.id, phoneInput ?? "");
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        toast.success("Phone number updated");
        // If phone was cleared, disable WhatsApp too
        if (!phoneInput && waEnabled) {
          setWaEnabled(false);
        }
      }
    });
  };

  const handleToggleWhatsApp = (enabled: boolean) => {
    startSaving(async () => {
      const result = await updateMemberWhatsApp(member.id, enabled);
      if ("error" in result && result.error) {
        toast.error(String(result.error));
      } else {
        setWaEnabled(enabled);
        toast.success(
          enabled
            ? "WhatsApp notifications enabled"
            : "WhatsApp notifications disabled",
        );
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 overflow-hidden">
          {member.avatar ? (
            <img
              src={member.avatar}
              alt={member.name ?? ""}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            (member.name ?? member.email).charAt(0).toUpperCase()
          )}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {member.name ?? member.email}
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-gray-400">(you)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 truncate">{member.email}</p>
        </div>

        {/* WhatsApp indicator */}
        {member.phone && waEnabled && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
            title="WhatsApp notifications enabled"
          >
            <MessageCircle size={10} />
            WA
          </span>
        )}

        {/* Expand phone/WhatsApp settings */}
        {canEdit && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`rounded-md p-1 transition-colors ${
              expanded
                ? "text-blue-600 bg-blue-50"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            title="Phone & WhatsApp settings"
          >
            <Phone size={14} />
          </button>
        )}

        {/* Role badge / selector */}
        {isAdmin && !isCurrentUser ? (
          <select
            value={member.role}
            onChange={(e) =>
              onRoleChange(member.id, e.target.value as TeamRole)
            }
            disabled={isPending}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium outline-none focus:border-blue-400 disabled:opacity-50"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleConfig.color}`}
          >
            <roleConfig.icon size={10} />
            {roleConfig.label}
          </span>
        )}

        {/* Remove button — admin only, not self */}
        {isAdmin && !isCurrentUser && (
          <button
            onClick={() => onRemove(member.id, member.name)}
            disabled={isPending}
            className="rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Remove member"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Expanded phone / WhatsApp settings */}
      {expanded && canEdit && (
        <div className="px-4 pb-3 pl-[52px] flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <Phone size={12} className="text-gray-400 shrink-0" />
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="919876543210"
              disabled={saving}
              className="w-full sm:w-48 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
            <button
              onClick={handleSavePhone}
              disabled={saving || phoneInput === (member.phone ?? "")}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? "..." : "Save"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={waEnabled}
              onChange={(e) => handleToggleWhatsApp(e.target.checked)}
              disabled={saving || !member.phone}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
            />
            <MessageCircle size={12} className="text-green-600" />
            <span className="text-gray-600">WhatsApp notifications</span>
          </label>
        </div>
      )}
    </div>
  );
}
