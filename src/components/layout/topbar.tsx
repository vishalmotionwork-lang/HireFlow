"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { MOCK_USER } from "@/lib/constants";

export function Topbar() {
  const initials = MOCK_USER.name.charAt(0).toUpperCase();
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Navigate to /master with q param on debounced search change
  useEffect(() => {
    if (debouncedSearch.trim()) {
      router.push(`/master?q=${encodeURIComponent(debouncedSearch.trim())}`);
    } else if (pathname === "/master") {
      // On /master with empty search, clear the q param
      router.push("/master");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
      {/* Hamburger / sidebar collapse trigger */}
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      {/* Logo */}
      <span className="text-base font-bold tracking-tight text-foreground select-none">
        HireFlow
      </span>

      {/* Global search — navigates to /master?q=... on debounced input */}
      <div className="relative mx-auto hidden sm:block w-full max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          size={15}
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search all candidates..."
          className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/10 transition"
          aria-label="Global candidate search"
        />
      </div>

      {/* Mobile spacer */}
      <div className="flex-1 sm:hidden" />

      {/* User avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="User menu"
            />
          }
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-medium">{MOCK_USER.name}</span>
            <span className="block text-xs text-muted-foreground">
              Mock user
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled
            className="text-muted-foreground cursor-not-allowed"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
