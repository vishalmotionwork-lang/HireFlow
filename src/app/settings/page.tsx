export const dynamic = "force-dynamic";

import { db } from "@/db";
import { roles } from "@/db/schema";
import { RoleList } from "@/components/roles/role-list";
import { AddRoleDialog } from "@/components/roles/add-role-dialog";
import { getAuthUser } from "@/lib/auth";
import {
  getTeamMembers,
  getPendingInvitations,
  getPendingMembers,
} from "@/lib/actions/team";
import { TeamSection } from "@/components/settings/team-section";

export default async function SettingsPage() {
  const [allRoles, user, members, pendingInvites, pendingMembers] =
    await Promise.all([
      db.select().from(roles).orderBy(roles.sortOrder),
      getAuthUser(),
      getTeamMembers(),
      getPendingInvitations(),
      getPendingMembers(),
    ]);

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your hiring roles, team, and preferences
        </p>
      </div>

      {/* Roles section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Roles</h2>
            <p className="text-sm text-gray-500">
              Define the hiring categories for your team.
            </p>
          </div>
          <AddRoleDialog />
        </div>

        <RoleList roles={allRoles} />
      </section>

      {/* Team section */}
      <TeamSection
        members={members}
        pendingInvitations={pendingInvites}
        pendingMembers={pendingMembers}
        isAdmin={isAdmin}
        currentUserId={user?.id ?? null}
      />
    </div>
  );
}
