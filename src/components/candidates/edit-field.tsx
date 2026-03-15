"use client";

import { useState, useRef, useEffect, useTransition } from "react";

interface EditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
}

export function EditField({ value, onSave, placeholder }: EditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) {
      startTransition(async () => {
        await onSave(draft);
      });
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        aria-label="Edit field"
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className={`block w-full cursor-text rounded px-1 py-0.5 -mx-1 transition-colors hover:bg-gray-50 text-sm ${isPending ? "opacity-60" : ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") startEditing();
      }}
      aria-label={`Edit: ${value || placeholder || "empty"}`}
    >
      {value || (
        <span className="text-gray-400">{placeholder ?? "Click to edit"}</span>
      )}
    </span>
  );
}
