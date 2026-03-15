"use server";

import { revalidatePath } from "next/cache";
import { eq, ne, max, count } from "drizzle-orm";
import { db } from "@/db";
import { roles, candidates } from "@/db/schema";
import { roleCreateSchema, roleUpdateSchema } from "@/lib/validations/role";
import { requireAuth } from "@/lib/auth";

// Shared error response type
type ActionError = { error: Record<string, string[]> | string };
type ActionSuccess = { success: true };
type ActionResult = ActionError | ActionSuccess;

/**
 * Generate a URL-safe slug from a role name.
 * Handles special characters like "/" in "AI/Tech".
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Create a new role from plain data (used by import wizard).
 * Returns the new role's ID on success, or null on failure.
 */
/** Pick a fitting emoji for a role name using keyword matching */
function pickEmojiForRole(name: string): string {
  const lower = name.toLowerCase();
  const map: [string[], string][] = [
    [["video edit", "editor", "motion", "animation"], "\uD83C\uDFAC"],
    [["write", "script", "copy", "author"], "\u270D\uFE0F"],
    [["design", "ui", "ux", "graphic"], "\uD83C\uDFA8"],
    [["ai", "tech", "engineer", "develop", "code", "software"], "\uD83E\uDD16"],
    [["social media", "community"], "\uD83D\uDCF1"],
    [["content", "blog"], "\uD83D\uDCDD"],
    [["strateg", "plan"], "\uD83C\uDFAF"],
    [["direct", "creative direct", "art direct"], "\uD83C\uDFA5"],
    [["manag", "project", "product", "program"], "\uD83D\uDCCA"],
    [["sale", "closer", "business dev", "bd"], "\uD83D\uDCB0"],
    [["photo", "camera"], "\uD83D\uDCF8"],
    [["music", "audio", "sound"], "\uD83C\uDFB5"],
    [["podcast", "voice", "narrator"], "\uD83C\uDF99\uFE0F"],
    [["market", "growth", "seo", "ads"], "\uD83D\uDCE3"],
    [["research", "analyst", "data"], "\uD83D\uDD0D"],
    [["hr", "recruit", "talent", "people"], "\uD83D\uDC65"],
    [["ops", "operation", "logistics"], "\u26A1"],
    [["legal", "compliance", "finance", "account"], "\uD83D\uDCCB"],
  ];

  for (const [keywords, emoji] of map) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return emoji;
    }
  }
  return "\uD83D\uDCBC"; // default
}

export async function createRoleFromData(
  name: string,
  icon: string,
): Promise<{ id: string } | null> {
  await requireAuth("editor");

  // Auto-pick emoji if icon is a legacy Lucide name
  const isLegacyIcon = /^[A-Z]/.test(icon) && !/^\p{Emoji}/u.test(icon);
  const resolvedIcon = isLegacyIcon ? pickEmojiForRole(name) : icon;
  const slug = generateSlug(name);

  // Check slug uniqueness
  const existing = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    // Return the existing role instead of failing
    return { id: existing[0].id };
  }

  // Get next sortOrder
  const [maxResult] = await db
    .select({ maxOrder: max(roles.sortOrder) })
    .from(roles);
  const nextOrder = (maxResult?.maxOrder ?? -1) + 1;

  const [inserted] = await db
    .insert(roles)
    .values({
      name,
      slug,
      icon: resolvedIcon,
      description: null,
      sortOrder: nextOrder,
    })
    .returning({ id: roles.id });

  if (!inserted) return null;

  revalidatePath("/", "layout");
  return { id: inserted.id };
}

/**
 * Create a new role.
 * Returns { error } on validation failure or duplicate name.
 * Returns { success: true } on success.
 */
export async function createRole(formData: FormData): Promise<ActionResult> {
  await requireAuth("editor");

  const raw = {
    name: formData.get("name"),
    icon: formData.get("icon"),
    description: formData.get("description") || null,
  };

  const parsed = roleCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { error: flat.fieldErrors as Record<string, string[]> };
  }

  const { name, icon, description } = parsed.data;
  const slug = generateSlug(name);

  // Check slug uniqueness
  const existing = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return { error: { name: ["A role with this name already exists"] } };
  }

  // Get next sortOrder
  const [maxResult] = await db
    .select({ maxOrder: max(roles.sortOrder) })
    .from(roles);
  const nextOrder = (maxResult?.maxOrder ?? -1) + 1;

  await db.insert(roles).values({
    name,
    slug,
    icon,
    description: description ?? null,
    sortOrder: nextOrder,
  });

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Update an existing role's name, icon, and description.
 * Returns { error } on validation failure, duplicate name, or missing role.
 * Returns { success: true } on success.
 */
export async function updateRole(formData: FormData): Promise<ActionResult> {
  await requireAuth("editor");

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    icon: formData.get("icon"),
    description: formData.get("description") || null,
  };

  const parsed = roleUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { error: flat.fieldErrors as Record<string, string[]> };
  }

  const { id, name, icon, description } = parsed.data;
  const newSlug = generateSlug(name);

  // Check uniqueness excluding current role
  const existing = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.slug, newSlug))
    .limit(1);

  const conflictingRole = existing.find((r) => r.id !== id);
  if (conflictingRole) {
    return { error: { name: ["A role with this name already exists"] } };
  }

  await db
    .update(roles)
    .set({
      name,
      slug: newSlug,
      icon,
      description: description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(roles.id, id));

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Toggle a role's active status.
 * Guards against deactivating a role that has candidates.
 * Returns { error: string } if guard fails.
 * Returns { success: true } on success.
 */
export async function toggleRoleActive(roleId: string): Promise<ActionResult> {
  await requireAuth("editor");

  // Fetch current role
  const [role] = await db
    .select({ id: roles.id, isActive: roles.isActive })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!role) {
    return { error: "Role not found" };
  }

  // Guard: if currently active and about to deactivate, check for candidates
  if (role.isActive) {
    const [countResult] = await db
      .select({ total: count() })
      .from(candidates)
      .where(eq(candidates.roleId, roleId));

    if ((countResult?.total ?? 0) > 0) {
      return {
        error:
          "Cannot deactivate a role that has candidates. Reassign or remove candidates first.",
      };
    }
  }

  await db
    .update(roles)
    .set({ isActive: !role.isActive, updatedAt: new Date() })
    .where(eq(roles.id, roleId));

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Permanently delete a role. Only allowed when the role has no candidates.
 * Admin-only operation.
 */
export async function deleteRole(roleId: string): Promise<ActionResult> {
  await requireAuth("admin");

  const [role] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!role) {
    return { error: "Role not found" };
  }

  // Guard: can't delete if role has candidates
  const [countResult] = await db
    .select({ total: count() })
    .from(candidates)
    .where(eq(candidates.roleId, roleId));

  if ((countResult?.total ?? 0) > 0) {
    return {
      error:
        "Cannot delete a role that has candidates. Reassign or remove candidates first.",
    };
  }

  await db.delete(roles).where(eq(roles.id, roleId));

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Reorder roles by updating sortOrder for each role.
 * Accepts an ordered array of role IDs.
 */
export async function reorderRoles(roleIds: string[]): Promise<ActionResult> {
  await requireAuth("editor");

  // Update each role's sortOrder based on its position in the array
  await Promise.all(
    roleIds.map((id, index) =>
      db
        .update(roles)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(roles.id, id)),
    ),
  );

  revalidatePath("/", "layout");
  return { success: true };
}
