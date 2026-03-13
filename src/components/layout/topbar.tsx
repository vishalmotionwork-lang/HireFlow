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
    <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
      {/* Hamburger / sidebar collapse trigger */}
      <SidebarTrigger className="text-gray-500 hover:text-gray-700" />

      {/* Logo */}
      <span className="text-base font-semibold text-blue-500 select-none">
        HireFlow
      </span>

      {/* Global search — navigates to /master?q=... on debounced input */}
      <div className="relative mx-auto hidden sm:block w-full max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={15}
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search all candidates..."
          className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
          aria-label="Global candidate search"
        />
      </div>

      {/* Mobile spacer */}
      <div className="flex-1 sm:hidden" />

      {/* Mock user avatar — using render prop pattern for base-ui compatibility */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold hover:bg-blue-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="User menu"
            />
          }
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-medium">{MOCK_USER.name}</span>
            <span className="block text-xs text-gray-500">Mock user</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled
            className="text-gray-400 cursor-not-allowed"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
