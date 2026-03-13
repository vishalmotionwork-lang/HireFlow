"use client";

import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_USER } from "@/lib/constants";

export function Topbar() {
  const initials = MOCK_USER.name.charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
      {/* Hamburger / sidebar collapse trigger */}
      <SidebarTrigger className="text-gray-500 hover:text-gray-700" />

      {/* Logo */}
      <span className="text-base font-semibold text-blue-500 select-none">
        HireFlow
      </span>

      {/* Search — spacer pushes it center-ish */}
      <div className="relative mx-auto w-full max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={15}
        />
        <Input
          placeholder="Search candidates..."
          disabled
          className="pl-9 bg-gray-50 border-gray-200 text-sm cursor-not-allowed"
        />
      </div>

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
          <DropdownMenuItem disabled className="text-gray-400 cursor-not-allowed">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
