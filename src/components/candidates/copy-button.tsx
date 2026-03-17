"use client";

import { useState, useEffect } from "react";
import { Copy } from "lucide-react";

/** Copy text to clipboard with a brief visual confirmation. */
export function CopyButton({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard API not available — silently ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
    >
      <Copy
        className={`h-3.5 w-3.5 transition-colors ${copied ? "text-green-500" : ""}`}
      />
    </button>
  );
}
