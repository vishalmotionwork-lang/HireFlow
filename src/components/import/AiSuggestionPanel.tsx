"use client";

import { Sparkles, X } from "lucide-react";
import type { ImportSuggestion } from "@/lib/ai/importValidator";
import { suggestionKey } from "@/components/import/useValidateStep";

interface AiSuggestionPanelProps {
  suggestions: ImportSuggestion[];
  isImporting: boolean;
  onApplyFix: (suggestion: ImportSuggestion) => void;
  onDismiss: (suggestion: ImportSuggestion) => void;
}

export function AiSuggestionPanel({
  suggestions,
  isImporting,
  onApplyFix,
  onDismiss,
}: AiSuggestionPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <>
      {suggestions.map((s) => (
        <div
          key={suggestionKey(s)}
          className="flex items-start gap-1.5 rounded border border-purple-200 bg-purple-50 px-2 py-1.5"
        >
          <Sparkles
            size={11}
            className="mt-0.5 shrink-0 text-purple-500"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-700">
              {s.suggestion}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {s.fixedValue && (
                <button
                  onClick={() => onApplyFix(s)}
                  disabled={isImporting}
                  className="rounded bg-purple-500 px-2 py-0.5 text-[10px] font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                >
                  Apply fix
                </button>
              )}
              <button
                onClick={() => onDismiss(s)}
                disabled={isImporting}
                className="flex items-center gap-0.5 rounded border border-purple-200 bg-white px-1.5 py-0.5 text-[10px] text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
              >
                <X size={9} />
                Ignore
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
