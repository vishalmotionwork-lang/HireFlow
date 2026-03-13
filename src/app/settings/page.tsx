import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { RoleList } from "@/components/roles/role-list";
import { AddRoleDialog } from "@/components/roles/add-role-dialog";

export default async function SettingsPage() {
  // Fetch all roles (including inactive) ordered by sortOrder
  const allRoles = await db.select().from(roles).orderBy(roles.sortOrder);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your hiring roles and preferences
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

      {/* Placeholder for future settings */}
      <section className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">More settings coming soon</p>
      </section>
    </div>
  );
}
