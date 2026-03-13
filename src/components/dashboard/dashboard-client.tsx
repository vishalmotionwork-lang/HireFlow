"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Eye,
  Star,
  CheckCircle,
  XCircle,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RoleCard } from "@/components/dashboard/role-card";
import { HiredRejectedTable } from "@/components/dashboard/hired-rejected-table";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import type { Role, Activity } from "@/types";
import type { RoleHireSummary } from "@/lib/queries/stats";

interface DashboardStats {
  total: number;
  leftToReview: number;
  underReview: number;
  shortlisted: number;
  hired: number;
  rejected: number;
}

interface DashboardClientProps {
  stats: DashboardStats;
  activeRoles: Role[];
  roleCounts: Record<string, number>;
  tierBreakdown: Record<string, Record<string, number>>;
  activities: Activity[];
  hireSummary: RoleHireSummary[];
}

const STAT_CARDS: {
  label: string;
  icon: typeof Users;
  key: keyof DashboardStats;
  href: string;
}[] = [
  { label: "Total Candidates", icon: Users, key: "total", href: "/master" },
  {
    label: "Left to Review",
    icon: Eye,
    key: "leftToReview",
    href: "/master?status=left_to_review",
  },
  {
    label: "Under Review",
    icon: Eye,
    key: "underReview",
    href: "/master?status=under_review",
  },
  {
    label: "Shortlisted",
    icon: Star,
    key: "shortlisted",
    href: "/master?status=shortlisted",
  },
  {
    label: "Hired",
    icon: CheckCircle,
    key: "hired",
    href: "/master?status=hired",
  },
  {
    label: "Rejected",
    icon: XCircle,
    key: "rejected",
    href: "/master?status=rejected",
  },
];

export function DashboardClient({
  stats,
  activeRoles,
  roleCounts,
  tierBreakdown,
  activities,
  hireSummary,
}: DashboardClientProps) {
  const router = useRouter();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your hiring pipeline
        </p>
      </div>

      {/* Stats bar — clickable cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAT_CARDS.map(({ label, icon: Icon, key, href }) => {
          const value = stats[key];
          return (
            <Link key={label} href={href}>
              <Card className="border-gray-200 shadow-none cursor-pointer hover:border-blue-200 transition-colors h-full">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Icon size={15} />
                    <span className="text-xs font-medium truncate">{label}</span>
                  </div>
                  <p
                    className={`text-2xl font-semibold ${value > 0 ? "text-gray-900" : "text-gray-300"}`}
                  >
                    {value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Two-column: Roles + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Role cards — 2/3 width */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Roles
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                candidateCount={roleCounts[role.id] ?? 0}
                tierBreakdown={tierBreakdown[role.id] ?? {}}
              />
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

        {/* Activity Feed — 1/3 width */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Recent Activity
          </h2>
          <ActivityFeed
            activities={activities}
            onCandidateClick={(id) => setSelectedCandidateId(id)}
          />
        </div>
      </div>

      {/* Hired vs Rejected summary table */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Hired vs Rejected by Role
        </h2>
        <HiredRejectedTable data={hireSummary} />
      </div>

      {/* Candidate drawer — opened from activity feed clicks */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
}
