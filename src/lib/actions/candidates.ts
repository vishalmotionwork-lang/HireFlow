"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { candidates, candidateEvents, candidateComments } from "@/db/schema";
import { MOCK_USER } from "@/lib/constants";
import { getCandidateWithEvents } from "@/lib/queries/candidates";
import type { CandidateStatus, Tier } from "@/types";

// Shared response types
type ActionError = { error: Record<string, string[]> | string };
type ActionSuccess = { success: true };
type ActionResult = ActionError | ActionSuccess;

// Zod schema for candidate creation
const candidateCreateSchema = z.object({
  roleId: z.string().uuid("Invalid role ID"),
  name: z.string().min(1, "Name is required").max(200).trim(),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().max(20).optional().nullable().or(z.literal("")),
  instagram: z.string().max(100).optional().nullable().or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("Invalid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
});

// Whitelist of fields that can be updated via updateCandidateField
const UPDATABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "instagram",
  "portfolioUrl",
  "rejectionReason",
  "rejectionMessage",
  "lastModifiedBy",
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

/**
 * Create a new candidate with optional contact fields.
 * Also inserts a 'created' event into candidateEvents.
 */
export async function createCandidate(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const raw = {
      roleId: formData.get("roleId"),
      name: formData.get("name"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      instagram: formData.get("instagram") || null,
      portfolioUrl: formData.get("portfolioUrl") || null,
    };

    const parsed = candidateCreateSchema.safeParse(raw);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return { error: flat.fieldErrors as Record<string, string[]> };
    }

    const { roleId, name, email, phone, instagram, portfolioUrl } = parsed.data;

    // Normalize empty strings to null
    const normalizeEmpty = (v: string | null | undefined) =>
      v === "" || v == null ? null : v;

    const [newCandidate] = await db
      .insert(candidates)
      .values({
        roleId,
        name,
        email: normalizeEmpty(email),
        phone: normalizeEmpty(phone),
        instagram: normalizeEmpty(instagram),
        portfolioUrl: normalizeEmpty(portfolioUrl),
        createdBy: MOCK_USER.name,
      })
      .returning({ id: candidates.id });

    if (!newCandidate) {
      return { error: "Failed to create candidate" };
    }

    // INSERT ONLY — log creation event
    await db.insert(candidateEvents).values({
      candidateId: newCandidate.id,
      eventType: "created",
      fromValue: null,
      toValue: "left_to_review",
      createdBy: MOCK_USER.name,
    });

    // Activity record for dashboard feed
    const { createActivity } = await import("@/lib/actions/activities");
    await createActivity({
      type: "created",
      candidateId: newCandidate.id,
      candidateName: name,
      roleId,
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[createCandidate] Error:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/**
 * Change candidate pipeline status.
 * If rejecting, pass rejection details. If moving FROM rejected, clears rejectionMarkedAt.
 * Wraps UPDATE + INSERT in a transaction to ensure atomicity.
 */
export async function changeStatus(
  candidateId: string,
  fromStatus: CandidateStatus,
  toStatus: CandidateStatus,
  rejection?: { reason: string; message: string },
): Promise<ActionResult> {
  try {
    await db.transaction(async (tx) => {
      const updatePayload: Record<string, unknown> = {
        status: toStatus,
        updatedAt: new Date(),
      };

      if (toStatus === "rejected" && rejection) {
        updatePayload.rejectionReason = rejection.reason;
        updatePayload.rejectionMessage = rejection.message || null;
        updatePayload.rejectionMarkedAt = new Date();
      }

      // If moving FROM rejected, clear the rejection timestamp (keep reason in history)
      if (fromStatus === "rejected" && toStatus !== "rejected") {
        updatePayload.rejectionMarkedAt = null;
      }

      await tx
        .update(candidates)
        .set(updatePayload)
        .where(eq(candidates.id, candidateId));

      // INSERT ONLY — status change event log
      await tx.insert(candidateEvents).values({
        candidateId,
        eventType: "status_change",
        fromValue: fromStatus,
        toValue: toStatus,
        createdBy: MOCK_USER.name,
      });
    });

    // Create activity record (non-blocking — outside transaction)
    const { createActivity } = await import("@/lib/actions/activities");
    await createActivity({
      type: toStatus === "rejected" ? "rejected" : "status_change",
      candidateId,
      metadata: {
        from: fromStatus,
        to: toStatus,
        ...(rejection ? { reason: rejection.reason } : {}),
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[changeStatus] Error:", err);
    return { error: "Failed to change candidate status. Please try again." };
  }
}

/**
 * Cycle candidate tier assignment.
 * Wraps UPDATE + INSERT in a transaction to ensure atomicity.
 */
export async function changeTier(
  candidateId: string,
  fromTier: Tier,
  toTier: Tier,
): Promise<ActionResult> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(candidates)
        .set({ tier: toTier, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId));

      // INSERT ONLY — tier change event log
      await tx.insert(candidateEvents).values({
        candidateId,
        eventType: "tier_change",
        fromValue: fromTier,
        toValue: toTier,
        createdBy: MOCK_USER.name,
      });
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[changeTier] Error:", err);
    return { error: "Failed to change candidate tier. Please try again." };
  }
}

/**
 * Update a single candidate field inline.
 * Only whitelisted fields can be updated to prevent mass assignment.
 */
export async function updateCandidateField(
  candidateId: string,
  field: string,
  value: string,
): Promise<ActionResult> {
  try {
    if (!UPDATABLE_FIELDS.includes(field as UpdatableField)) {
      return {
        error: `Field '${field}' is not allowed. Allowed fields: ${UPDATABLE_FIELDS.join(", ")}`,
      };
    }

    const typedField = field as UpdatableField;

    // Map camelCase field names to Drizzle column references
    const fieldMap: Record<
      UpdatableField,
      keyof typeof candidates.$inferInsert
    > = {
      name: "name",
      email: "email",
      phone: "phone",
      instagram: "instagram",
      portfolioUrl: "portfolioUrl",
      rejectionReason: "rejectionReason",
      rejectionMessage: "rejectionMessage",
      lastModifiedBy: "lastModifiedBy",
    };

    await db
      .update(candidates)
      .set({
        [fieldMap[typedField]]: value || null,
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[updateCandidateField] Error:", err);
    return { error: "Failed to update field. Please try again." };
  }
}

/**
 * Server action wrapper for getCandidateWithEvents.
 * Safe to call from client components via useEffect or startTransition.
 * Drizzle queries cannot run directly in client components — this wrapper
 * exposes them as a 'use server' boundary.
 */
export async function fetchCandidateProfile(candidateId: string) {
  try {
    return await getCandidateWithEvents(candidateId);
  } catch (err) {
    console.error("[fetchCandidateProfile] Error:", err);
    return null;
  }
}

/**
 * Check for duplicate candidates matching the given candidate's email/phone.
 * Returns array of matches (excludes self).
 */
export async function checkDuplicatesAction(candidateId: string) {
  try {
    const [candidate] = await db
      .select({ email: candidates.email, phone: candidates.phone })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!candidate) return [];

    const { checkForDuplicates } = await import("@/lib/duplicate");
    return checkForDuplicates({
      email: candidate.email,
      phone: candidate.phone,
      excludeId: candidateId,
    });
  } catch (err) {
    console.error("[checkDuplicatesAction] Error:", err);
    return [];
  }
}

/**
 * Merge two candidates: combine contact info on target, move comments + events
 * from source to target, soft-delete the source.
 */
export async function mergeCandidates(
  sourceId: string,
  targetId: string,
): Promise<ActionResult> {
  try {
    const [source] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, sourceId))
      .limit(1);

    const [target] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, targetId))
      .limit(1);

    if (!source || !target) {
      return { error: "Candidate not found" };
    }

    await db.transaction(async (tx) => {
      // Merge contact info — prefer non-null target values
      await tx
        .update(candidates)
        .set({
          email: target.email ?? source.email,
          phone: target.phone ?? source.phone,
          instagram: target.instagram ?? source.instagram,
          portfolioUrl: target.portfolioUrl ?? source.portfolioUrl,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, targetId));

      // Move comments from source to target
      await tx
        .update(candidateComments)
        .set({ candidateId: targetId })
        .where(eq(candidateComments.candidateId, sourceId));

      // Move events from source to target
      await tx
        .update(candidateEvents)
        .set({ candidateId: targetId })
        .where(eq(candidateEvents.candidateId, sourceId));

      // Soft-delete the source
      await tx
        .update(candidates)
        .set({
          isDeleted: true,
          duplicateOfId: targetId,
          duplicateAction: "merged",
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, sourceId));
    });

    // Activity record
    const { createActivity } = await import("@/lib/actions/activities");
    await createActivity({
      type: "merged",
      candidateId: targetId,
      candidateName: target.name,
      metadata: { mergedFrom: source.name, sourceId },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("[mergeCandidates] Error:", err);
    return { error: "Failed to merge candidates. Please try again." };
  }
}
