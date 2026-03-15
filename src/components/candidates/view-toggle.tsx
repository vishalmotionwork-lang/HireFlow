"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutList, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "board";

interface ViewToggleProps {
  currentView: ViewMode;
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const switchView = (view: ViewMode) => {
    if (view === currentView) return;

    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") {
      params.delete("view");
    } else {
      params.set("view", view);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        onClick={() => switchView("list")}
        title="List view"
        aria-label="Switch to list view"
        className={cn(
          "flex items-center justify-center rounded-md p-1.5 transition-colors",
          currentView === "list"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-400 hover:text-gray-600",
        )}
      >
        <LayoutList size={16} />
      </button>
      <button
        onClick={() => switchView("board")}
        title="Board view"
        aria-label="Switch to board view"
        className={cn(
          "flex items-center justify-center rounded-md p-1.5 transition-colors",
          currentView === "board"
            ? "bg-gray-100 text-gray-900"
            : "text-gray-400 hover:text-gray-600",
        )}
      >
        <Columns3 size={16} />
      </button>
    </div>
  );
}
