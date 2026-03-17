"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Settings,
  Star,
  Upload,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RoleForm } from "@/components/roles/role-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import type { Role } from "@/types";

interface AppSidebarProps {
  roles: Role[];
  reviewCounts?: Record<string, number>;
}

export function AppSidebar({ roles, reviewCounts }: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [rolesOpen, setRolesOpen] = useState(true);
  const [addRoleOpen, setAddRoleOpen] = useState(false);

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  const isActive = (href: string) => pathname === href;
  const isRoleActive = (slug: string) =>
    pathname === `/roles/${slug}` || pathname.startsWith(`/roles/${slug}/`);

  // Auto-expand roles section when a role page is active
  useEffect(() => {
    if (roles.some((r) => isRoleActive(r.slug))) {
      setRolesOpen(true);
    }
  }, [pathname, roles]);

  return (
    <>
      <Sidebar collapsible="icon">
        {/* Header */}
        <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground">
              <span className="text-xs font-bold text-white">H</span>
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
              HireFlow Direct
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Main nav */}
          <SidebarGroup className="py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive={isActive("/dashboard")}
                  tooltip="Dashboard"
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/master" />}
                  isActive={isActive("/master")}
                  tooltip="Master View"
                >
                  <Users size={16} />
                  <span>Master View</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/best" />}
                  isActive={isActive("/best")}
                  tooltip="Best Candidates"
                >
                  <Star size={16} />
                  <span>Best Candidates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/import" />}
                  isActive={isActive("/import")}
                  tooltip="Import"
                >
                  <Upload size={16} />
                  <span>Import</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Divider */}
          <div className="mx-3 border-t border-sidebar-border group-data-[collapsible=icon]:hidden" />

          {/* Collapsible Roles */}
          <SidebarGroup className="py-2 group-data-[collapsible=icon]:hidden">
            <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
              <CollapsibleTrigger className="group/roles flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
                <ChevronDown
                  size={14}
                  className="shrink-0 text-sidebar-foreground/40 transition-transform duration-200 group-data-[panel-open]/roles:rotate-0 -rotate-90"
                />
                <span>Roles</span>
                <span className="ml-auto rounded-full bg-sidebar-accent/60 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/50 leading-none">
                  {roles.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenu className="mt-0.5 pl-1">
                  {roles.map((role) => {
                    const reviewCount = reviewCounts?.[role.id] ?? 0;
                    return (
                      <SidebarMenuItem key={role.id}>
                        <SidebarMenuButton
                          render={<Link href={`/roles/${role.slug}`} />}
                          isActive={isRoleActive(role.slug)}
                          tooltip={role.name}
                          size="sm"
                        >
                          <DynamicIcon name={role.icon} size={15} />
                          <span>{role.name}</span>
                          {reviewCount > 0 && (
                            <span className="ml-auto rounded-full bg-blue-500 text-white text-[10px] px-1.5 min-w-[18px] text-center leading-4">
                              {reviewCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <button
                          type="button"
                          onClick={() => setAddRoleOpen(true)}
                        />
                      }
                      tooltip="New Role"
                      size="sm"
                      className="text-sidebar-foreground/35 hover:text-sidebar-foreground/60"
                    >
                      <PlusCircle size={15} />
                      <span>New Role</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/settings" />}
                isActive={isActive("/settings")}
                tooltip="Settings"
              >
                <Settings size={16} />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Add Role Dialog — rendered outside Sidebar to avoid click interception */}
      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new hiring category to your pipeline.
            </DialogDescription>
          </DialogHeader>
          <RoleForm mode="create" onSuccess={() => setAddRoleOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
