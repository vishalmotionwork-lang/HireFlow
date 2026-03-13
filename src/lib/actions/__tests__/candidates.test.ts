/**
 * Integration tests for candidate server actions.
 * These tests run against the real PostgreSQL database.
 * Ensure the database is running before executing.
 *
 * Prerequisite: DATABASE_URL must be set (loaded from .env.local).
 */

import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidates, candidateEvents, roles } from "@/db/schema";
import {
  createCandidate,
  changeStatus,
  changeTier,
  updateCandidateField,
} from "@/lib/actions/candidates";

// Mock next/cache — not available outside Next.js runtime
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Test state
let testRoleId: string;
const createdCandidateIds: string[] = [];

beforeAll(async () => {
  // Ensure a test role exists
  const existingRoles = await db.select({ id: roles.id }).from(roles).limit(1);

  if (existingRoles.length > 0) {
    testRoleId = existingRoles[0].id;
  } else {
    // Create a test role if none exist
    const [newRole] = await db
      .insert(roles)
      .values({
        name: "Test Role",
        slug: "test-role-integration",
        icon: "Briefcase",
        sortOrder: 999,
      })
      .returning({ id: roles.id });
    testRoleId = newRole.id;
  }
});

afterAll(async () => {
  // Clean up: delete events and candidates created during tests
  if (createdCandidateIds.length > 0) {
    await db.delete(candidateEvents).where(
      // Delete events for all test candidates
      // We use a loop since Drizzle doesn't have inArray for FK deletes easily
      // Without importing sql, we clean up individually
      eq(candidateEvents.candidateId, createdCandidateIds[0]),
    );

    // Clean up remaining candidates' events
    for (const id of createdCandidateIds.slice(1)) {
      await db
        .delete(candidateEvents)
        .where(eq(candidateEvents.candidateId, id));
    }

    // Delete the test candidates
    for (const id of createdCandidateIds) {
      await db.delete(candidates).where(eq(candidates.id, id));
    }
  }
});

/**
 * Helper to build FormData for candidate creation.
 */
function makeCandidateFormData(
  overrides: Record<string, string> = {},
): FormData {
  const fd = new FormData();
  fd.set("roleId", testRoleId);
  fd.set("name", "Test Candidate");
  Object.entries(overrides).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe("createCandidate", () => {
  it("creates a candidate with valid FormData and logs a created event", async () => {
    const fd = makeCandidateFormData({
      name: "Jane Doe",
      email: "jane@example.com",
    });
    const result = await createCandidate(fd);

    expect(result).toEqual({ success: true });

    // Verify candidate exists in DB
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId))
      .orderBy(candidates.createdAt)
      .limit(1);

    // Find the candidate we just created by email
    const allForRole = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId));

    const created = allForRole.find((c) => c.email === "jane@example.com");
    expect(created).toBeDefined();
    expect(created!.name).toBe("Jane Doe");
    expect(created!.status).toBe("left_to_review");
    expect(created!.tier).toBe("untiered");

    createdCandidateIds.push(created!.id);

    // Verify 'created' event was logged
    const events = await db
      .select()
      .from(candidateEvents)
      .where(eq(candidateEvents.candidateId, created!.id));

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe("created");
    expect(events[0].fromValue).toBeNull();
    expect(events[0].toValue).toBe("left_to_review");
  });

  it("returns field errors when name is empty", async () => {
    const fd = makeCandidateFormData({ name: "" });
    const result = await createCandidate(fd);

    expect(result).toHaveProperty("error");
    const error = (result as { error: Record<string, string[]> }).error;
    expect(error).toHaveProperty("name");
    expect(Array.isArray(error.name)).toBe(true);
    expect(error.name.length).toBeGreaterThan(0);

    // Verify no candidate was created with empty name
    const allForRole = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId));

    const emptyNameCandidate = allForRole.find((c) => c.name === "");
    expect(emptyNameCandidate).toBeUndefined();
  });
});

describe("changeStatus", () => {
  it("changes candidate status and logs a status_change event", async () => {
    // Create a candidate first
    const fd = makeCandidateFormData({ name: "Status Test Candidate" });
    await createCandidate(fd);

    const allForRole = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId));

    const target = allForRole.find((c) => c.name === "Status Test Candidate");
    expect(target).toBeDefined();
    createdCandidateIds.push(target!.id);

    // Change status
    const result = await changeStatus(
      target!.id,
      "left_to_review",
      "shortlisted",
    );
    expect(result).toEqual({ success: true });

    // Verify status updated in DB
    const [updated] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, target!.id))
      .limit(1);

    expect(updated.status).toBe("shortlisted");

    // Verify status_change event logged
    const events = await db
      .select()
      .from(candidateEvents)
      .where(eq(candidateEvents.candidateId, target!.id))
      .orderBy(candidateEvents.createdAt);

    const statusEvent = events.find((e) => e.eventType === "status_change");
    expect(statusEvent).toBeDefined();
    expect(statusEvent!.fromValue).toBe("left_to_review");
    expect(statusEvent!.toValue).toBe("shortlisted");
  });
});

describe("changeTier", () => {
  it("changes candidate tier and logs a tier_change event", async () => {
    // Create a candidate
    const fd = makeCandidateFormData({ name: "Tier Test Candidate" });
    await createCandidate(fd);

    const allForRole = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId));

    const target = allForRole.find((c) => c.name === "Tier Test Candidate");
    expect(target).toBeDefined();
    createdCandidateIds.push(target!.id);

    // Change tier
    const result = await changeTier(target!.id, "untiered", "junior");
    expect(result).toEqual({ success: true });

    // Verify tier updated in DB
    const [updated] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, target!.id))
      .limit(1);

    expect(updated.tier).toBe("junior");

    // Verify tier_change event logged
    const events = await db
      .select()
      .from(candidateEvents)
      .where(eq(candidateEvents.candidateId, target!.id))
      .orderBy(candidateEvents.createdAt);

    const tierEvent = events.find((e) => e.eventType === "tier_change");
    expect(tierEvent).toBeDefined();
    expect(tierEvent!.fromValue).toBe("untiered");
    expect(tierEvent!.toValue).toBe("junior");
  });
});

describe("updateCandidateField", () => {
  it("updates a single allowed field and rejects disallowed fields", async () => {
    // Create a candidate
    const fd = makeCandidateFormData({ name: "Field Update Candidate" });
    await createCandidate(fd);

    const allForRole = await db
      .select()
      .from(candidates)
      .where(eq(candidates.roleId, testRoleId));

    const target = allForRole.find((c) => c.name === "Field Update Candidate");
    expect(target).toBeDefined();
    createdCandidateIds.push(target!.id);

    // Update email (allowed field)
    const result = await updateCandidateField(
      target!.id,
      "email",
      "updated@test.com",
    );
    expect(result).toEqual({ success: true });

    // Verify email updated in DB
    const [updated] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, target!.id))
      .limit(1);

    expect(updated.email).toBe("updated@test.com");

    // Test with disallowed field
    const badResult = await updateCandidateField(
      target!.id,
      "id",
      "some-injected-id",
    );
    expect(badResult).toHaveProperty("error");
    expect(typeof (badResult as { error: string }).error).toBe("string");

    // Verify the ID was NOT changed (security check)
    const [afterBad] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, target!.id))
      .limit(1);

    expect(afterBad).toBeDefined();
    expect(afterBad.id).toBe(target!.id);
  });
});
