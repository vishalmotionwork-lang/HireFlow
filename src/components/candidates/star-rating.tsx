"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Star } from "lucide-react";
import {
  rateCandidate,
  getCandidateAverageRating,
} from "@/lib/actions/ratings";
import type { AverageRating } from "@/lib/actions/ratings";

interface StarRatingProps {
  candidateId: string;
  /** Compact mode for table rows — just shows average, no interaction */
  compact?: boolean;
}

/** Single star with fill/hover states */
function StarIcon({
  filled,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 18,
}: {
  filled: boolean;
  hovered: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: number;
}) {
  const isActive = filled || hovered;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="p-0 border-0 bg-transparent cursor-pointer transition-transform duration-100 hover:scale-110 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded-sm"
      aria-label={`Rate ${filled ? "filled" : "empty"}`}
    >
      <Star
        size={size}
        className={
          isActive
            ? "fill-amber-400 text-amber-400 transition-colors duration-150"
            : "fill-transparent text-gray-300 transition-colors duration-150"
        }
      />
    </button>
  );
}

/**
 * Compact star display for table rows.
 * Shows a single filled star icon + average number.
 */
export function CompactStarRating({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<AverageRating | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getCandidateAverageRating(candidateId);
      setData(result);
    });
  }, [candidateId]);

  if (!data || data.count === 0) {
    return <span className="text-gray-300 text-sm">--</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-sm">
      <Star size={14} className="fill-amber-400 text-amber-400" />
      <span className="text-gray-700 font-medium">
        {data.average?.toFixed(1)}
      </span>
    </span>
  );
}

/**
 * Interactive star rating — shows 5 stars, hover preview, and team average.
 * Used in the candidate drawer.
 */
export function StarRating({ candidateId, compact = false }: StarRatingProps) {
  const [data, setData] = useState<AverageRating | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const loadRating = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await getCandidateAverageRating(id);
        setData(result);
      });
    },
    [],
  );

  useEffect(() => {
    loadRating(candidateId);
  }, [candidateId, loadRating]);

  if (compact) {
    return <CompactStarRating candidateId={candidateId} />;
  }

  const handleRate = async (star: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const result = await rateCandidate(candidateId, star);

    if ("success" in result) {
      // Optimistic: update local state immediately
      setData((prev) => {
        if (!prev) {
          return { average: star, count: 1, userRating: star };
        }
        // Recalculate average: if user already rated, adjust; otherwise add
        const hadPrevRating = prev.userRating !== null;
        const newCount = hadPrevRating ? prev.count : prev.count + 1;
        const oldTotal = (prev.average ?? 0) * prev.count;
        const newTotal = hadPrevRating
          ? oldTotal - (prev.userRating ?? 0) + star
          : oldTotal + star;

        return {
          average: newCount > 0 ? newTotal / newCount : null,
          count: newCount,
          userRating: star,
        };
      });
    }

    setIsSubmitting(false);
  };

  const userRating = data?.userRating ?? 0;
  const displayRating = hoveredStar ?? userRating;

  return (
    <div className="flex flex-col gap-1">
      {/* Interactive stars */}
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHoveredStar(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            filled={star <= userRating}
            hovered={hoveredStar !== null && star <= hoveredStar}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoveredStar(star)}
            size={20}
          />
        ))}

        {/* "Your rating" label */}
        {userRating > 0 && hoveredStar === null && (
          <span className="ml-2 text-xs text-gray-400">Your rating</span>
        )}
        {hoveredStar !== null && hoveredStar !== userRating && (
          <span className="ml-2 text-xs text-amber-500">
            Rate {displayRating}
          </span>
        )}
      </div>

      {/* Team average */}
      {data && data.count > 0 && (
        <p className="text-xs text-gray-400">
          Team avg:{" "}
          <span className="font-medium text-gray-600">
            {data.average?.toFixed(1)}
          </span>{" "}
          ({data.count} {data.count === 1 ? "review" : "reviews"})
        </p>
      )}

      {data && data.count === 0 && (
        <p className="text-xs text-gray-400">No ratings yet</p>
      )}
    </div>
  );
}
