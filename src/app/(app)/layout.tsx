export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { getAuthUser } from "@/lib/auth";
import { getReviewCounts } from "@/lib/queries/candidates";
import type { Role } from "@/types";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-next",
});

export const metadata: Metadata = {
  title: "HireFlow Direct",
  description: "Candidate pipeline management for creative teams",
};

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch roles + user in parallel (keep layout fast)
  const [activeRoles, user] = await Promise.all([
    db
      .select()
      .from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(roles.sortOrder) as Promise<Role[]>,
    getAuthUser(),
  ]);

  // Review counts are non-critical — fetch but don't block on timeout
  let reviewCounts: Record<string, number> = {};
  try {
    reviewCounts = await getReviewCounts();
  } catch {
    // Silently fall back to no badges rather than breaking the layout
  }

  return (
    <html lang="en" className="light">
      <body className={`${inter.className} ${mono.variable} antialiased`}>
        <AppShell roles={activeRoles} user={user} reviewCounts={reviewCounts}>
          {children}
        </AppShell>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
