"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionStatusDraft {
  id: string;
  sourceUrl: string | null;
  status: string;
  extractedData: unknown;
  error: string | null;
  overallConfidence: number | null;
}

interface ExtractionStatusResponse {
  total: number;
  done: number;
  pending: number;
  failed: number;
  drafts: ExtractionStatusDraft[];
}

interface ExtractionProgressProps {
  batchId: string;
  onComplete: (drafts: ExtractionStatusDraft[]) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;
const SESSION_KEY = "pendingExtractionBatchId";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateUrl(url: string | null, maxLength = 40): string {
  if (!url) return "Unknown URL";
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + "...";
}

// ---------------------------------------------------------------------------
// Status icons (inline SVG, no dependency)
// ---------------------------------------------------------------------------

function SpinnerIcon() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent flex-shrink-0" />
  );
}

function CheckIcon() {
  return (
    <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-2.5 h-2.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExtractionProgress component
// ---------------------------------------------------------------------------

export function ExtractionProgress({ batchId, onComplete }: ExtractionProgressProps) {
  const [status, setStatus] = useState<ExtractionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCompleteRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Persist batchId so the user can resume on page revisit
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_KEY, batchId);
      } catch {
        // ignore quota errors
      }
    }

    async function poll() {
      if (isCompleteRef.current) return;

      try {
        const res = await fetch(`/api/extraction-status/${batchId}`);
        if (!res.ok) {
          setError(`Polling error: ${res.status} ${res.statusText}`);
          return;
        }

        const data: ExtractionStatusResponse = await res.json();
        setStatus(data);

        // When all drafts are done, fire onComplete and clean up
        if (data.total > 0 && data.pending === 0) {
          isCompleteRef.current = true;

          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Clear session storage — extraction finished
          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem(SESSION_KEY);
            } catch {
              // ignore
            }
          }

          onComplete(data.drafts);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error while polling";
        setError(message);
      }
    }

    // Poll immediately, then on interval
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [batchId, onComplete]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">Polling error</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-3 py-8 justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Connecting to extraction pipeline...</p>
      </div>
    );
  }

  const { total, done, pending, drafts } = status;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = pending === 0 && total > 0;

  return (
    <div className="space-y-5">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">
            {isComplete
              ? "Extraction complete"
              : `Extracting info from ${pending} portfolio${pending !== 1 ? "s" : ""}...`}
          </p>
          <span className="text-sm font-semibold text-gray-700">
            {done}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 text-right">{percentage}% complete</p>
      </div>

      {/* Per-URL status list */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {drafts.map((draft) => {
            const isPending = draft.status === "pending" || draft.status === "processing";
            const isFailed = draft.status === "failed";

            return (
              <div key={draft.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">
                  {isPending ? (
                    <SpinnerIcon />
                  ) : isFailed ? (
                    <ErrorIcon />
                  ) : (
                    <CheckIcon />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-mono truncate">
                    {truncateUrl(draft.sourceUrl)}
                  </p>
                  {isFailed && draft.error && (
                    <p className="text-xs text-red-500 mt-0.5">{draft.error}</p>
                  )}
                  {draft.overallConfidence !== null && !isPending && !isFailed && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {draft.overallConfidence}% confidence
                    </p>
                  )}
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    isPending
                      ? "bg-blue-50 text-blue-600"
                      : isFailed
                        ? "bg-red-50 text-red-600"
                        : "bg-green-50 text-green-600"
                  }`}
                >
                  {draft.status === "processing" ? "Processing" : draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
