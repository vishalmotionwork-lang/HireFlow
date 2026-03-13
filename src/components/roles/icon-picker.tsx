"use client";

import { cn } from "@/lib/utils";
import { DynamicIcon } from "@/components/layout/dynamic-icon";
import { LUCIDE_ROLE_ICONS, type LucideRoleIcon } from "@/lib/constants";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {LUCIDE_ROLE_ICONS.map((iconName) => {
        const isSelected = value === iconName;
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-2 transition-all",
              "hover:border-blue-300 hover:bg-blue-50",
              isSelected
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300 ring-offset-1"
                : "border-gray-200 bg-white"
            )}
            title={iconName}
          >
            <DynamicIcon
              name={iconName}
              size={18}
              className={cn(
                isSelected ? "text-blue-600" : "text-gray-500"
              )}
            />
            <span
              className={cn(
                "text-[9px] font-medium truncate w-full text-center leading-none",
                isSelected ? "text-blue-600" : "text-gray-400"
              )}
            >
              {iconName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
