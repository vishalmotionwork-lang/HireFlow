import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NotificationBellServer } from "@/components/layout/notification-bell-server";
// WhatsApp phone prompt — re-enable when WHATSAPP env vars are configured
// import { PhonePromptServer } from "@/components/layout/phone-prompt-server";
import type { Role } from "@/types";
import type { AuthUser } from "@/lib/auth";

interface AppShellProps {
  roles: Role[];
  user: AuthUser | null;
  reviewCounts?: Record<string, number>;
  children: React.ReactNode;
}

export function AppShell({
  roles,
  user,
  reviewCounts,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar roles={roles} reviewCounts={reviewCounts} />
      <SidebarInset>
        <Topbar
          user={user}
          notificationSlot={
            <Suspense fallback={null}>
              <NotificationBellServer />
            </Suspense>
          }
        />
        <main className="flex-1 bg-background p-6 md:p-8 lg:p-10">
          {children}
        </main>
        {/* WhatsApp phone prompt — re-enable when WHATSAPP env vars are configured */}
      </SidebarInset>
    </SidebarProvider>
  );
}
