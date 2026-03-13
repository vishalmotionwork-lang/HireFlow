"use client";

import { useTransition } from "react";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import { changeTier } from "@/lib/actions/candidates";
import { TIERS } from "@/types";
import type { Tier } from "@/types";

interface TierBadgeProps {
  candidateId: string;
  tier: Tier;
}

export function TierBadge({ candidateId, tier }: TierBadgeProps) {
  const [isPending, startTransition] = useTransition();

  const currentIndex = TIERS.indexOf(tier);
  const nextTier = TIERS[(currentIndex + 1) % TIERS.length];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    startTransition(async () => {
      await changeTier(candidateId, tier, nextTier);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={`Click to change tier to: ${TIER_LABELS[nextTier]}`}
      aria-label={`Tier: ${TIER_LABELS[tier]}. Click to change to ${TIER_LABELS[nextTier]}.`}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-opacity border-0 ${TIER_COLORS[tier]} ${isPending ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
    >
      {TIER_LABELS[tier]}
    </button>
  );
}
