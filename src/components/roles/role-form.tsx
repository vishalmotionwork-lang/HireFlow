"use client";

import { useActionState, useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/roles/icon-picker";
import { createRole, updateRole } from "@/lib/actions/roles";
import type { Role } from "@/types";

interface RoleFormProps {
  mode: "create" | "edit";
  role?: Role;
  onSuccess?: () => void;
}

type ActionState = {
  error?: Record<string, string[]> | string;
  success?: boolean;
} | null;

const MAX_DESC = 500;

export function RoleForm({ mode, role, onSuccess }: RoleFormProps) {
  const [icon, setIcon] = useState(role?.icon ?? "Briefcase");
  const [description, setDescription] = useState(role?.description ?? "");
  const [name, setName] = useState(role?.name ?? "");

  const action = mode === "create" ? createRole : updateRole;
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (_prev: ActionState, formData: FormData) => {
      formData.set("icon", icon);
      const result = await action(formData);
      return result as ActionState;
    },
    null
  );

  // Handle success
  useEffect(() => {
    if (state?.success) {
      toast.success(mode === "create" ? "Role created!" : "Role updated!");
      if (mode === "create") {
        // Reset form fields
        setName("");
        setIcon("Briefcase");
        setDescription("");
      }
      onSuccess?.();
    }
  }, [state?.success, mode, onSuccess]);

  const fieldErrors =
    state?.error && typeof state.error === "object" ? state.error : {};

  const globalError =
    state?.error && typeof state.error === "string" ? state.error : null;

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden id field for edit mode */}
      {mode === "edit" && role && (
        <input type="hidden" name="id" value={role.id} />
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor={`role-name-${mode}`}>
          Role Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`role-name-${mode}`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Motion Designer"
          maxLength={100}
          required
          className={fieldErrors.name ? "border-red-400 focus-visible:ring-red-300" : ""}
        />
        {fieldErrors.name && (
          <p className="text-xs text-red-500">{fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Icon Picker */}
      <div className="space-y-1.5">
        <Label>Icon</Label>
        <IconPicker value={icon} onChange={setIcon} />
        {/* Hidden input ensures icon is in FormData */}
        <input type="hidden" name="icon" value={icon} />
        {fieldErrors.icon && (
          <p className="text-xs text-red-500">{fieldErrors.icon[0]}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor={`role-desc-${mode}`}>
          Description{" "}
          <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <Textarea
          id={`role-desc-${mode}`}
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this role..."
          maxLength={MAX_DESC}
          className="resize-none"
          rows={3}
        />
        <p className="text-right text-xs text-gray-400">
          {description.length}/{MAX_DESC}
        </p>
        {fieldErrors.description && (
          <p className="text-xs text-red-500">{fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
          {globalError}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
          ? "Create Role"
          : "Save Changes"}
      </Button>
    </form>
  );
}
