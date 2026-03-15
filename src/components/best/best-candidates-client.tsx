"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, MapPin, Briefcase, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { CandidateDrawer } from "@/components/candidates/candidate-drawer";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import type { Role, CandidateStatus } from "@/types";
import type { BestCandidate } from "@/lib/queries/candidates";

interface BestCandidatesClientProps {
  roles: Role[];
  candidates: BestCandidate[];
}

const STATUS_ORDER: CandidateStatus[] = [
  "hired",
  "assignment_passed",
  "shortlisted",
];

export function BestCandidatesClient({
  roles,
  candidates,
}: BestCandidatesClientProps) {
  const router = useRouter();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<
    string | null
  >(null);

  const refresh = () => router.refresh();
  useRealtimeSubscription({ table: "candidates", onChanged: refresh });

  const filtered =
    selectedRoleId === "all"
      ? candidates
      : candidates.filter((c) => c.roleId === selectedRoleId);

  // Group by status in priority order
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    candidates: filtered.filter((c) => c.status === status),
  })).filter((g) => g.candidates.length > 0);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Best Candidates
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Top candidates across all roles &mdash; shortlisted, assignment
            passed, or hired
          </p>
        </div>

        {/* Role filter */}
        <select
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="all">All Roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Trophy
            size={32}
            className="mx-auto mb-3 text-muted-foreground/40"
          />
          <p className="text-sm text-muted-foreground">
            No best candidates yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Candidates appear here when shortlisted, assignment passed, or
            hired
          </p>
        </div>
      )}

      {/* Grouped sections */}
      {grouped.map(({ status, label, candidates: groupCandidates }) => (
        <div key={status}>
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground">
              {groupCandidates.length}{" "}
              {groupCandidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onClick={() => setSelectedCandidateId(candidate.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Candidate drawer */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
}

function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: BestCandidate;
  onClick: () => void;
}) {
  return (
    <Card
      className="border-border shadow-sm hover:border-ring/30 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Name + role badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {candidate.name}
            </p>
            {candidate.email && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {candidate.email}
              </p>
            )}
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {candidate.roleName}
          </span>
        </div>

        {/* Status + Tier badges */}
        <div className="flex items-center gap-2 mb-3">
          <StatusBadge
            candidateId={candidate.id}
            status={candidate.status}
            candidateName={candidate.name}
          />
          <TierBadge candidateId={candidate.id} tier={candidate.tier} />
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {candidate.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {candidate.location}
            </span>
          )}
          {candidate.experience && (
            <span className="flex items-center gap-1">
              <Briefcase size={11} />
              {candidate.experience}
            </span>
          )}
          {candidate.portfolioUrl && (
            <a
              href={candidate.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={11} />
              Portfolio
            </a>
          )}
        </div>

        {/* Updated timestamp */}
        <p className="mt-3 text-xs text-muted-foreground/60">
          Updated {formatRelativeTime(candidate.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
}
