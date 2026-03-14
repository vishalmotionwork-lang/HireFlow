"use client";

import { useState, useEffect } from "react";
import { Clock, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  getImportHistory,
  type ImportHistoryEntry,
} from "@/lib/actions/importHistory";
import { IMPORT_SOURCES } from "@/lib/constants";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceLabel(source: string): string {
  return (
    IMPORT_SOURCES[source as keyof typeof IMPORT_SOURCES] ?? source
  );
}

export function ImportHistory() {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getImportHistory(50);
        if (!cancelled) {
          setEntries(data);
        }
      } catch {
        // silently fail — history is non-critical
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">
          Loading import history...
        </span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-3">
          <Clock size={20} className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-600">
          No imports yet
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Import history will appear here after your first import.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Source
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Role
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Rows
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Imported
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                Skipped
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                By
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet
                      size={14}
                      className="text-gray-400 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-700">
                        {sourceLabel(entry.source)}
                      </span>
                      {entry.sourceName && (
                        <p
                          className="text-xs text-gray-400 truncate max-w-[180px]"
                          title={entry.sourceName}
                        >
                          {entry.sourceName}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-700">
                  {entry.roleName}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-gray-700 tabular-nums">
                  {entry.totalRows}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-green-600 tabular-nums font-medium">
                  {entry.importedCount}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-gray-400 tabular-nums">
                  {entry.skippedCount}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {entry.createdBy}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(entry.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
