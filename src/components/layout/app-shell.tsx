import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Role } from "@/types";

interface AppShellProps {
  roles: Role[];
  children: React.ReactNode;
}

export function AppShell({ roles, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar roles={roles} />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 bg-gray-50/50 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
