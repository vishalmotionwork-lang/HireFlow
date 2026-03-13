"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Settings,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import type { Role } from "@/types";

interface AppSidebarProps {
  roles: Role[];
}

export function AppSidebar({ roles }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;
  const isRoleActive = (slug: string) =>
    pathname === `/roles/${slug}` || pathname.startsWith(`/roles/${slug}/`);

  return (
    <Sidebar collapsible="icon">
      {/* Header: Logo mark */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground">
            <span className="text-xs font-bold text-white">H</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
            HireFlow
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Top-level nav: Dashboard + Master View */}
        <SidebarGroup>
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
          </SidebarMenu>
        </SidebarGroup>

        {/* Roles section */}
        <SidebarGroup>
          <SidebarGroupLabel>Roles</SidebarGroupLabel>
          <SidebarMenu>
            {roles.map((role) => (
              <SidebarMenuItem key={role.id}>
                <SidebarMenuButton
                  render={<Link href={`/roles/${role.slug}`} />}
                  isActive={isRoleActive(role.slug)}
                  tooltip={role.name}
                >
                  <DynamicIcon name={role.icon} size={16} />
                  <span>{role.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* + New Role */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/settings" />}
                tooltip="New Role"
                className="text-gray-400 hover:text-gray-600"
              >
                <PlusCircle size={16} />
                <span className="text-sm">+ New Role</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {/* Import section */}
        <SidebarGroup>
          <SidebarMenu>
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
      </SidebarContent>

      {/* Footer: Settings */}
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
  );
}
