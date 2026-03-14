"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { signOut } from "@/lib/actions/auth";
import type { AuthUser } from "@/lib/auth";

interface TopbarProps {
  user: AuthUser | null;
}

export function Topbar({ user }: TopbarProps) {
  const displayName = user?.name ?? "User";
  const initials = displayName.charAt(0).toUpperCase();
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
        HireFlow Direct
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
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring overflow-hidden"
          aria-label="User menu"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">
              {user?.email ?? "Not signed in"}
            </p>
          </div>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="cursor-pointer"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
