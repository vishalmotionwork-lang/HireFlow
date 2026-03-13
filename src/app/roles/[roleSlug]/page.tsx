import { notFound } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DynamicIcon } from "@/components/layout/dynamic-icon";

interface RolePageProps {
  params: Promise<{ roleSlug: string }>;
}

export default async function RolePage({ params }: RolePageProps) {
  const { roleSlug } = await params;

  // Fetch the current role
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.slug, roleSlug))
    .limit(1);

  if (!role) {
    notFound();
  }

  // Fetch all active roles for the tab strip
  const allRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  return (
    <div className="space-y-6">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <DynamicIcon name={role.icon} size={18} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {role.name}{" "}
            <span className="text-sm font-normal text-gray-400">(0)</span>
          </h1>
          {role.description && (
            <p className="text-xs text-gray-400">{role.description}</p>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {allRoles.map((r) => (
          <Link
            key={r.id}
            href={`/roles/${r.slug}`}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              r.slug === roleSlug
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {r.name}
          </Link>
        ))}
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Inbox size={22} className="text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-700">No candidates yet</h3>
        <p className="mt-1 max-w-xs text-xs text-gray-400">
          Candidates will appear here once imported or added manually.
        </p>
      </div>
    </div>
  );
}
