import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import type { Role } from "@/types";

interface RoleCardProps {
  role: Role;
  candidateCount: number;
  /** Per-tier counts for this role: { untiered, junior, senior, both } */
  tierBreakdown: Record<string, number>;
}

const TIER_COLORS: Record<string, string> = {
  untiered: "bg-gray-300",
  junior: "bg-blue-400",
  senior: "bg-purple-400",
  both: "bg-teal-400",
};

const TIER_LABELS: Record<string, string> = {
  untiered: "Untiered",
  junior: "Junior",
  senior: "Senior",
  both: "Both",
};

export function RoleCard({
  role,
  candidateCount,
  tierBreakdown,
}: RoleCardProps) {
  const TIER_ORDER = ["untiered", "junior", "senior", "both"] as const;
  const totalWithTier = TIER_ORDER.reduce(
    (sum, tier) => sum + (tierBreakdown[tier] ?? 0),
    0,
  );

  const tierSegments = TIER_ORDER.map((tier) => ({
    tier,
    count: tierBreakdown[tier] ?? 0,
    pct:
      totalWithTier > 0
        ? ((tierBreakdown[tier] ?? 0) / totalWithTier) * 100
        : 0,
    color: TIER_COLORS[tier],
    label: TIER_LABELS[tier],
  })).filter((s) => s.count > 0);

  return (
    <Card className="border-border shadow-sm hover:border-ring/30 hover:shadow-md transition-all">
      <CardContent className="p-6">
        {/* Role header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <DynamicIcon
                name={role.icon}
                size={18}
                className="text-accent-foreground"
              />
            </div>
            <div>
              <p className="font-semibold text-foreground">{role.name}</p>
              <p className="text-xs text-muted-foreground">
                {candidateCount}{" "}
                {candidateCount === 1 ? "candidate" : "candidates"}
              </p>
            </div>
          </div>
        </div>

        {/* Tier breakdown mini-bar */}
        {totalWithTier > 0 && (
          <div className="mb-4">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              {tierSegments.map((seg) => (
                <div
                  key={seg.tier}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${seg.pct}%` }}
                  title={`${seg.label}: ${seg.count}`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {tierSegments.map((seg) => (
                <span key={seg.tier} className="text-xs text-muted-foreground">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${seg.color} mr-1 align-middle`}
                  />
                  {seg.label}: {seg.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick action links */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <Link
            href={`/roles/${role.slug}?addCandidate=true`}
            className="text-xs font-medium text-muted-foreground hover:text-accent-foreground transition-colors"
          >
            Add
          </Link>
          <Link
            href="/import"
            className="text-xs font-medium text-muted-foreground hover:text-accent-foreground transition-colors"
          >
            Import
          </Link>
          <Link
            href={`/roles/${role.slug}`}
            className="text-xs font-semibold text-accent-foreground hover:text-accent-foreground/80 transition-colors ml-auto"
          >
            View All
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
