"use server";

import { revalidatePath } from "next/cache";
import { eq, and, avg, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { candidateRatings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

// Shared response types
type ActionError = { error: string };
type RateSuccess = { success: true; rating: number };
type RateResult = ActionError | RateSuccess;

const ratingSchema = z.object({
  candidateId: z.string().uuid("Invalid candidate ID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be 1-5")
    .max(5, "Rating must be 1-5"),
});

/**
 * Upsert a rating for a candidate.
 * Each user can only have one rating per candidate — re-rating overwrites.
 */
export async function rateCandidate(
  candidateId: string,
  rating: number,
): Promise<RateResult> {
  try {
    const user = await requireAuth();

    const parsed = ratingSchema.safeParse({ candidateId, rating });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return { error: firstError };
    }

    const now = new Date();

    // Upsert: insert or update on conflict
    await db
      .insert(candidateRatings)
      .values({
        candidateId: parsed.data.candidateId,
        userId: user.id,
        rating: parsed.data.rating,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [candidateRatings.candidateId, candidateRatings.userId],
        set: {
          rating: parsed.data.rating,
          updatedAt: now,
        },
      });

    revalidatePath("/", "layout");
    return { success: true, rating: parsed.data.rating };
  } catch (err) {
    console.error("[rateCandidate] Error:", err);
    return { error: "Failed to save rating. Please try again." };
  }
}

/** Shape returned by getCandidateRatings */
export interface CandidateRatingEntry {
  id: string;
  userId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all individual ratings for a candidate.
 */
export async function getCandidateRatings(
  candidateId: string,
): Promise<CandidateRatingEntry[]> {
  try {
    await requireAuth();

    const rows = await db
      .select({
        id: candidateRatings.id,
        userId: candidateRatings.userId,
        rating: candidateRatings.rating,
        createdAt: candidateRatings.createdAt,
        updatedAt: candidateRatings.updatedAt,
      })
      .from(candidateRatings)
      .where(eq(candidateRatings.candidateId, candidateId));

    return rows;
  } catch (err) {
    console.error("[getCandidateRatings] Error:", err);
    return [];
  }
}

/** Shape returned by getCandidateAverageRating */
export interface AverageRating {
  average: number | null;
  count: number;
  userRating: number | null;
}

/**
 * Get the average rating and count for a candidate,
 * plus the current user's own rating.
 */
export async function getCandidateAverageRating(
  candidateId: string,
): Promise<AverageRating> {
  try {
    const user = await requireAuth();

    // Get average + count
    const [stats] = await db
      .select({
        average: avg(candidateRatings.rating),
        count: count(candidateRatings.id),
      })
      .from(candidateRatings)
      .where(eq(candidateRatings.candidateId, candidateId));

    // Get current user's rating
    const [userRow] = await db
      .select({ rating: candidateRatings.rating })
      .from(candidateRatings)
      .where(
        and(
          eq(candidateRatings.candidateId, candidateId),
          eq(candidateRatings.userId, user.id),
        ),
      )
      .limit(1);

    return {
      average: stats?.average ? parseFloat(String(stats.average)) : null,
      count: Number(stats?.count ?? 0),
      userRating: userRow?.rating ?? null,
    };
  } catch (err) {
    console.error("[getCandidateAverageRating] Error:", err);
    return { average: null, count: 0, userRating: null };
  }
}
