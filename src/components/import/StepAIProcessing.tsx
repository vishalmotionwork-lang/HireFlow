"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { analyzeSheetColumns } from "@/lib/ai/importAnalyzer";
import type { AICleanedRow } from "@/lib/ai/importAnalyzer";
import { cleanRows } from "@/lib/import/cleanRows";
import type { RawRow } from "@/lib/import/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIProcessingResult {
  mapping: Record<number, string>;
  cleanedRows: AICleanedRow[];
  summary: {
    totalRows: number;
    fixesApplied: number;
    columnsDetected: string[];
    issues: string[];
  };
}

interface StepAIProcessingProps {
  headers: string[];
  rows: RawRow[];
  onComplete: (result: AIProcessingResult) => void;
  onSkip: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepAIProcessing({
  headers,
  rows,
  onComplete,
  onSkip,
}: StepAIProcessingProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Detecting columns...");
  const [usedFastPath, setUsedFastPath] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;

    async function run() {
      try {
        // Phase 1: Analyze columns (heuristics first, AI fallback)
        setProgress(10);
        setStatusText("Detecting columns...");

        const { mapping, usedHeuristics } = await analyzeSheetColumns(
          headers,
          rows as unknown[][],
        );

        if (abortRef.current) return;

        setUsedFastPath(usedHeuristics);
        setProgress(50);
        setStatusText(
          usedHeuristics
            ? "Columns detected instantly — cleaning data..."
            : "AI detected columns — cleaning data...",
        );

        // Phase 2: Clean using fast deterministic heuristics (no AI)
        // Runs client-side — no server round-trip needed
        const fieldIndices: Record<string, number> = {};
        for (const [idx, field] of Object.entries(mapping)) {
          fieldIndices[field] = parseInt(idx, 10);
        }

        const extractedRows = (rows as unknown[][]).map((row, i) => ({
          name: getCellValue(row, fieldIndices.name),
          email: getCellValue(row, fieldIndices.email),
          phone: getCellValue(row, fieldIndices.phone),
          instagram: getCellValue(row, fieldIndices.instagram),
          portfolioUrl: getCellValue(row, fieldIndices.portfolioUrl),
          linkedinUrl: getCellValue(row, fieldIndices.linkedinUrl),
          location: getCellValue(row, fieldIndices.location),
          experience: getCellValue(row, fieldIndices.experience),
          resumeUrl: getCellValue(row, fieldIndices.resumeUrl),
          _rowIndex: i,
        }));

        const cleanedRows = cleanRows(extractedRows);

        if (abortRef.current) return;

        setProgress(90);
        setStatusText("Finalizing...");

        // Build summary
        const totalFixes = cleanedRows.reduce(
          (sum, r) => sum + r.fixes.length,
          0,
        );
        const detectedColumns = Object.values(mapping);
        const issues: string[] = [];
        if (!detectedColumns.includes("name")) {
          issues.push("Could not detect a Name column");
        }
        if (!detectedColumns.includes("email")) {
          issues.push("No Email column detected");
        }

        setProgress(100);
        setStatusText("Complete!");

        const result: AIProcessingResult = {
          mapping,
          cleanedRows,
          summary: {
            totalRows: rows.length,
            fixesApplied: totalFixes,
            columnsDetected: detectedColumns,
            issues,
          },
        };

        if (totalFixes > 0) {
          toast.success(
            `Cleaned ${totalFixes} data issues across ${rows.length} rows`,
          );
        }

        // Brief delay so user sees completion
        await new Promise((r) => setTimeout(r, usedHeuristics ? 200 : 400));
        onComplete(result);
      } catch (err) {
        if (abortRef.current) return;
        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        toast.error("Analysis failed — you can skip and map manually");
      }
    }

    void run();

    return () => {
      abortRef.current = true;
    };
  }, [headers, rows, onComplete]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900">Analysis Failed</p>
          <p className="text-xs text-gray-500 max-w-xs">{error}</p>
        </div>
        <button
          onClick={onSkip}
          className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Continue with manual mapping
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Animated icon */}
      <div className="relative">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            usedFastPath ? "bg-green-100" : "bg-purple-100"
          }`}
        >
          {usedFastPath ? (
            <Zap size={28} className="text-green-500" />
          ) : (
            <Sparkles size={28} className="text-purple-500 animate-pulse" />
          )}
        </div>
        {progress === 100 && (
          <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
            <CheckCircle size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Phase label */}
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-900">
          {progress === 100
            ? "Analysis complete!"
            : usedFastPath
              ? "Processing your data"
              : "AI is analyzing your data"}
        </p>
        <p
          className={`text-xs ${usedFastPath ? "text-green-600" : "text-purple-600"}`}
        >
          {statusText}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-2">
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              usedFastPath
                ? "bg-gradient-to-r from-green-400 to-emerald-500"
                : "bg-gradient-to-r from-purple-500 to-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{progress}%</span>
          <span>{rows.length} rows</span>
        </div>
      </div>

      {/* Skip option — only show when AI is running (not on fast path) */}
      {progress < 100 && !usedFastPath && (
        <button
          onClick={onSkip}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
        >
          Skip AI and map manually
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCellValue(
  row: unknown[],
  colIndex: number | undefined,
): string | null {
  if (colIndex === undefined || colIndex < 0) return null;
  const cell = row[colIndex];
  if (cell === undefined || cell === null) return null;
  const str = String(cell).trim();
  return str === "" ? null : str;
}
