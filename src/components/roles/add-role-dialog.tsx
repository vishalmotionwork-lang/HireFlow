"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RoleForm } from "@/components/roles/role-form";

export function AddRoleDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <PlusCircle size={14} />
        Add New Role
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new hiring category to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <RoleForm
            mode="create"
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
