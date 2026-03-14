"use client";

import { cn } from "@/lib/utils";
import { ROLE_EMOJI_ICONS } from "@/lib/constants";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {ROLE_EMOJI_ICONS.map((emoji) => {
        const isSelected = value === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={cn(
              "flex items-center justify-center rounded-lg border p-2 text-xl transition-all",
              "hover:border-blue-300 hover:bg-blue-50 hover:scale-110",
              isSelected
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300 ring-offset-1 scale-110"
                : "border-gray-200 bg-white"
            )}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
