import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getDashboardStats,
  getRoleCandidateCounts,
  getRoleTierBreakdown,
  getHiredRejectedByRole,
} from "@/lib/queries/stats";
import { getRecentActivities } from "@/lib/queries/activities";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const [activeRoles, stats, roleCounts, tierBreakdown, activities, hireSummary] =
    await Promise.all([
      db
        .select()
        .from(roles)
        .where(eq(roles.isActive, true))
        .orderBy(roles.sortOrder),
      getDashboardStats(),
      getRoleCandidateCounts(),
      getRoleTierBreakdown(),
      getRecentActivities(10),
      getHiredRejectedByRole(),
    ]);

  return (
    <DashboardClient
      stats={stats}
      activeRoles={activeRoles}
      roleCounts={roleCounts}
      tierBreakdown={tierBreakdown}
      activities={activities}
      hireSummary={hireSummary}
    />
  );
}
