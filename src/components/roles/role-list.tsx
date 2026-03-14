"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import { RoleForm } from "@/components/roles/role-form";
import { deleteRole, reorderRoles } from "@/lib/actions/roles";
import type { Role } from "@/types";

interface RoleListProps {
  roles: Role[];
}

export function RoleList({ roles: initialRoles }: RoleListProps) {
  const [roles, setRoles] = useState(initialRoles);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistically update roles list after a server action completes
  const refreshOrder = (newOrder: Role[]) => {
    setRoles(newOrder);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...roles];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setRoles(newOrder);
    startTransition(async () => {
      const result = await reorderRoles(newOrder.map((r) => r.id));
      if ("error" in result) {
        toast.error("Failed to reorder roles");
        setRoles(roles); // revert
      }
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === roles.length - 1) return;
    const newOrder = [...roles];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setRoles(newOrder);
    startTransition(async () => {
      const result = await reorderRoles(newOrder.map((r) => r.id));
      if ("error" in result) {
        toast.error("Failed to reorder roles");
        setRoles(roles); // revert
      }
    });
  };

  const handleDelete = (role: Role) => {
    if (!window.confirm(`Delete "${role.name}"? This cannot be undone.`))
      return;

    startTransition(async () => {
      const result = await deleteRole(role.id);
      if ("error" in result) {
        const message =
          typeof result.error === "string"
            ? result.error
            : "Failed to delete role";
        toast.error(message);
      } else {
        toast.success(`"${role.name}" deleted`);
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
      }
    });
  };

  const renderRoleRow = (role: Role, index: number) => (
    <div
      key={role.id}
      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
        <DynamicIcon name={role.icon} size={16} className="text-blue-500" />
      </div>

      {/* Name + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-900">{role.name}</p>
        </div>
        {role.description && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
            {role.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleMoveUp(index)}
          disabled={index === 0 || isPending}
          title="Move up"
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronUp size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleMoveDown(index)}
          disabled={index === roles.length - 1 || isPending}
          title="Move down"
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditingRole(role)}
          disabled={isPending}
          title="Edit role"
          className="text-gray-400 hover:text-gray-700"
        >
          <Pencil size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleDelete(role)}
          disabled={isPending}
          title="Delete role"
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {roles.map((role, index) => renderRoleRow(role, index))}

        {roles.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No roles yet. Create your first role above.
          </p>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog
        open={editingRole !== null}
        onOpenChange={(open) => !open && setEditingRole(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the name, icon, or description for this role.
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <RoleForm
              mode="edit"
              role={editingRole}
              onSuccess={() => setEditingRole(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
