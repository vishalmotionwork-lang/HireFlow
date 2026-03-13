"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  PowerOff,
  Power,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { toggleRoleActive, reorderRoles } from "@/lib/actions/roles";
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

  const handleToggleActive = (role: Role) => {
    const isDeactivating = role.isActive;
    const confirmed = isDeactivating
      ? window.confirm(
          `Deactivate "${role.name}"? It will be hidden from the sidebar and dashboard.`
        )
      : true;

    if (!confirmed) return;

    startTransition(async () => {
      const result = await toggleRoleActive(role.id);
      if ("error" in result) {
        const message =
          typeof result.error === "string"
            ? result.error
            : "Failed to update role";
        toast.error(message);
      } else {
        toast.success(
          isDeactivating
            ? `"${role.name}" deactivated`
            : `"${role.name}" activated`
        );
        // Update local state
        setRoles((prev) =>
          prev.map((r) =>
            r.id === role.id ? { ...r, isActive: !r.isActive } : r
          )
        );
      }
    });
  };

  // Separate active and inactive roles
  const activeRoles = roles.filter((r) => r.isActive);
  const inactiveRoles = roles.filter((r) => !r.isActive);

  const renderRoleRow = (role: Role, index: number, isActive: boolean) => (
    <div
      key={role.id}
      className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
        isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isActive ? "bg-blue-50" : "bg-gray-100"
        }`}
      >
        <DynamicIcon
          name={role.icon}
          size={16}
          className={isActive ? "text-blue-500" : "text-gray-400"}
        />
      </div>

      {/* Name + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`font-medium text-sm ${
              isActive ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {role.name}
          </p>
          {!isActive && (
            <Badge
              variant="outline"
              className="text-[10px] text-gray-400 border-gray-200"
            >
              Inactive
            </Badge>
          )}
        </div>
        {role.description && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
            {role.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Reorder arrows — only for active roles */}
        {isActive && (
          <>
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
              disabled={index === activeRoles.length - 1 || isPending}
              title="Move down"
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={14} />
            </Button>
          </>
        )}

        {/* Edit */}
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

        {/* Toggle active/inactive */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleToggleActive(role)}
          disabled={isPending}
          title={isActive ? "Deactivate role" : "Activate role"}
          className={
            isActive
              ? "text-gray-400 hover:text-red-500"
              : "text-gray-400 hover:text-green-600"
          }
        >
          {isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {/* Active roles */}
        {activeRoles.map((role, index) =>
          renderRoleRow(role, index, true)
        )}

        {/* Inactive roles */}
        {inactiveRoles.length > 0 && (
          <>
            {activeRoles.length > 0 && (
              <div className="border-t border-dashed border-gray-200 pt-2" />
            )}
            {inactiveRoles.map((role, index) =>
              renderRoleRow(role, index, false)
            )}
          </>
        )}

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
