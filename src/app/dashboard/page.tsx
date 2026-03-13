import Link from "next/link";
import {
  Users,
  Eye,
  Star,
  ThumbsDown,
  CheckCircle,
  XCircle,
  PlusCircle,
} from "lucide-react";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/layout/dynamic-icon";

const STAT_CARDS = [
  { label: "Total Candidates", icon: Users, value: 0 },
  { label: "Left to Review", icon: Eye, value: 0 },
  { label: "Under Review", icon: Eye, value: 0 },
  { label: "Shortlisted", icon: Star, value: 0 },
  { label: "Hired", icon: CheckCircle, value: 0 },
  { label: "Rejected", icon: XCircle, value: 0 },
];

export default async function DashboardPage() {
  const activeRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.isActive, true))
    .orderBy(roles.sortOrder);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your hiring pipeline
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map(({ label, icon: Icon, value }) => (
          <Card key={label} className="border-gray-200 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Icon size={15} />
                <span className="text-xs font-medium truncate">{label}</span>
              </div>
              <p className="text-2xl font-semibold text-gray-300">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role cards */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Roles
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeRoles.map((role) => (
            <Card
              key={role.id}
              className="border-gray-200 shadow-none hover:border-gray-300 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                      <DynamicIcon
                        name={role.icon}
                        size={18}
                        className="text-blue-500"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{role.name}</p>
                      <p className="text-xs text-gray-400">0 candidates</p>
                    </div>
                  </div>
                  <Link
                    href={`/roles/${role.slug}`}
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    View All
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Role card */}
          <Link href="/settings">
            <Card className="border-dashed border-gray-300 shadow-none hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer h-full">
              <CardContent className="flex h-full min-h-[72px] items-center justify-center gap-2 p-5">
                <PlusCircle size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-400">
                  Create New Role
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
