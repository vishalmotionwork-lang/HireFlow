import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HireFlow Direct",
  description: "Candidate pipeline management for creative teams",
};

/**
 * Minimal root layout. All rendering is delegated to route group layouts:
 * - (public)/layout.tsx — login, pending (no DB queries)
 * - (app)/layout.tsx — authenticated pages (AppShell + DB queries)
 *
 * This file exists only to satisfy Next.js requirement for a root layout.
 * html/body tags are defined in the route group layouts to avoid conflicts.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
