"use client";

import { useState } from "react";
import { toast } from "sonner";
import { startExtractions, startSingleExtraction } from "@/lib/actions/extraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepUrlPasteProps {
  roles: Array<{ id: string; name: string }>;
  onBatchStarted: (batchId: string, candidateId?: string) => void;
}

type ActiveMode = "single" | "bulk";

const MAX_URLS = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function parseUrls(text: string): string[] {
  const lines = text.split("\n");
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// StepUrlPaste component
// ---------------------------------------------------------------------------

export function StepUrlPaste({ roles, onBatchStarted }: StepUrlPasteProps) {
  const [activeMode, setActiveMode] = useState<ActiveMode>("single");
  const [singleUrl, setSingleUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const [isLoading, setIsLoading] = useState(false);

  const parsedUrls = parseUrls(bulkText);
  const overLimit = parsedUrls.length > MAX_URLS;

  // ---------------------------------------------------------------------------
  // Single URL submit
  // ---------------------------------------------------------------------------

  const handleSingleSubmit = async () => {
    const url = singleUrl.trim();

    if (!url) {
      toast.error("Please enter a portfolio URL.");
      return;
    }

    if (!isValidUrl(url)) {
      toast.error("URL must start with http:// or https://");
      return;
    }

    if (!selectedRoleId) {
      toast.error("Please select a role.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await startSingleExtraction(url, selectedRoleId);
      onBatchStarted(result.batchId, result.candidateId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start extraction";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Bulk URL submit
  // ---------------------------------------------------------------------------

  const handleBulkSubmit = async () => {
    if (parsedUrls.length === 0) {
      toast.error("Please paste at least one URL.");
      return;
    }

    if (overLimit) {
      toast.error(`Maximum ${MAX_URLS} URLs per batch. Please remove ${parsedUrls.length - MAX_URLS} URLs.`);
      return;
    }

    const invalidUrls = parsedUrls.filter((u) => !isValidUrl(u));
    if (invalidUrls.length > 0) {
      toast.error(`${invalidUrls.length} URL(s) are invalid. All URLs must start with http:// or https://`);
      return;
    }

    if (!selectedRoleId) {
      toast.error("Please select a role.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await startExtractions(parsedUrls, selectedRoleId);
      onBatchStarted(result.batchId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start extraction";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveMode("single")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeMode === "single"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Single URL
        </button>
        <button
          onClick={() => setActiveMode("bulk")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeMode === "bulk"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Bulk URLs
        </button>
      </div>

      {/* Single URL mode */}
      {activeMode === "single" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Enter one portfolio URL to extract candidate info from a single source.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Portfolio URL
              </label>
              <input
                type="url"
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="https://johndoe.com"
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSingleSubmit}
              disabled={isLoading || !singleUrl.trim()}
              className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isLoading ? "Starting..." : "Extract"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk URL mode */}
      {activeMode === "bulk" && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Paste up to {MAX_URLS} portfolio URLs, one per line. Duplicates are automatically removed.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">
                  Portfolio URLs
                </label>
                {parsedUrls.length > 0 && (
                  <span
                    className={`text-xs font-medium ${
                      overLimit ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {parsedUrls.length} URL{parsedUrls.length !== 1 ? "s" : ""} detected
                  </span>
                )}
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste portfolio URLs, one per line..."
                rows={8}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 resize-y disabled:cursor-not-allowed disabled:opacity-50"
              />
              {overLimit && (
                <p className="mt-1 text-xs text-red-600">
                  Maximum {MAX_URLS} URLs per batch. Please remove{" "}
                  {parsedUrls.length - MAX_URLS} URL{parsedUrls.length - MAX_URLS !== 1 ? "s" : ""}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleBulkSubmit}
              disabled={isLoading || parsedUrls.length === 0 || overLimit}
              className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isLoading ? "Starting..." : "Extract All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
