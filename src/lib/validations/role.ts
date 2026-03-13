import { z } from "zod";

export const roleCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  icon: z.string().min(1, "Icon is required"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
});

export const roleUpdateSchema = roleCreateSchema.extend({
  id: z.string().uuid("Invalid role ID"),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
