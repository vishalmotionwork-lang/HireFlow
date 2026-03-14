"use client";

import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { TIER_LABELS, TIER_COLORS } from "@/lib/constants";
import { changeTier } from "@/lib/actions/candidates";
import { TIERS } from "@/types";
import type { Tier } from "@/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface TierBadgeProps {
  candidateId: string;
  tier: Tier;
}

export function TierBadge({ candidateId, tier }: TierBadgeProps) {
  const [isPending, startTransition] = useTransition();

  const handleSelect = (newTier: Tier) => {
    if (newTier === tier || isPending) return;
    startTransition(async () => {
      await changeTier(candidateId, tier, newTier);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer transition-opacity border-0 ${TIER_COLORS[tier]} ${isPending ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
        aria-label={`Tier: ${TIER_LABELS[tier]}. Click to change.`}
      >
        {TIER_LABELS[tier]}
        <ChevronDown size={10} className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-36"
        onClick={(e) => e.stopPropagation()}
      >
        {TIERS.map((t) => (
          <DropdownMenuItem
            key={t}
            onClick={() => handleSelect(t)}
            className={tier === t ? "bg-blue-50 text-blue-700" : ""}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full mr-2 ${TIER_COLORS[t].split(" ")[0]}`}
            />
            {TIER_LABELS[t]}
            {tier === t && <span className="ml-auto text-blue-500">&#10003;</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
