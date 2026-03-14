export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { getAuthUser } from "@/lib/auth";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if this is a public page that doesn't need DB queries
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const url =
    headersList.get("x-url") ?? headersList.get("x-invoke-path") ?? "";
  const isPublicPage =
    url.startsWith("/login") ||
    url.startsWith("/pending") ||
    url.startsWith("/auth/");

  let activeRoles: Role[] = [];
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;

  if (!isPublicPage) {
    // Only query DB for authenticated pages
    const [rolesResult] = await Promise.all([
      db
        .select()
        .from(roles)
        .where(eq(roles.isActive, true))
        .orderBy(roles.sortOrder),
      getAuthUser()
        .then((u) => {
          user = u;
        })
        .catch(() => {
          // Auth error — continue without user
        }),
    ]);
    activeRoles = rolesResult;
  }

  return (
    <html lang="en" className="light">
      <body className={`${inter.className} ${mono.variable} antialiased`}>
        <AppShell roles={activeRoles} user={user}>
          {children}
        </AppShell>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
