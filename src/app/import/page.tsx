import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ImportWizard } from "@/components/import/ImportWizard";
import Link from "next/link";

export default async function ImportPage() {
  const activeRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  const firstRoleSlug = activeRoles[0]?.slug ?? null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Import Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a spreadsheet or paste data to import candidates
        </p>
      </div>

      {/* Import wizard */}
      <ImportWizard roles={activeRoles} />

      {/* Manual entry fallback (IMPT-10) */}
      {firstRoleSlug && (
        <p className="text-sm text-gray-400 text-center">
          Or{" "}
          <Link
            href={`/roles/${firstRoleSlug}`}
            className="text-blue-500 hover:text-blue-600 underline underline-offset-2"
          >
            add candidates manually
          </Link>{" "}
          via the role page.
        </p>
      )}
    </div>
  );
}
