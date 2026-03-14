import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Role } from "@/types";
import type { AuthUser } from "@/lib/auth";

interface AppShellProps {
  roles: Role[];
  user: AuthUser | null;
  children: React.ReactNode;
}

export function AppShell({ roles, user, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar roles={roles} />
      <SidebarInset>
        <Topbar user={user} />
        <main className="flex-1 bg-background p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
