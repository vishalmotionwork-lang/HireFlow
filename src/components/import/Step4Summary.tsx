"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import type { ImportResult } from "@/lib/import/types";
import type { Role } from "@/types";

// ---------------------------------------------------------------------------
// Step4Summary
// ---------------------------------------------------------------------------

interface Step4SummaryProps {
  result: ImportResult;
  onStartNew: () => void;
  targetRoleId: string;
  roles: Role[];
}

export function Step4Summary({
  result,
  onStartNew,
  targetRoleId,
  roles,
}: Step4SummaryProps) {
  const targetRole = roles.find((r) => r.id === targetRoleId);
  const roleSlug = targetRole?.slug ?? "";

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Success header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Import Complete</h2>
          <p className="mt-1 text-sm text-gray-500">
            {result.totalRows} {result.totalRows === 1 ? "row" : "rows"} processed
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {/* Imported */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-green-50 px-5 py-4">
          <span className="text-3xl font-bold text-green-600">
            {result.importedCount}
          </span>
          <span className="text-xs font-medium text-gray-500">Imported</span>
        </div>

        {/* Merged */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-blue-50 px-5 py-4">
          <span className="text-3xl font-bold text-blue-600">
            {result.mergedCount}
          </span>
          <span className="text-xs font-medium text-gray-500">Merged</span>
        </div>

        {/* Skipped */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
          <span className="text-3xl font-bold text-gray-500">
            {result.skippedCount}
          </span>
          <span className="text-xs font-medium text-gray-500">Skipped</span>
        </div>

        {/* Duplicates found */}
        <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-amber-50 px-5 py-4">
          <span className="text-3xl font-bold text-amber-500">
            {result.duplicatesFound}
          </span>
          <span className="text-xs font-medium text-gray-500">Duplicates Found</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onStartNew}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Import More
        </button>

        {roleSlug && (
          <Link
            href={`/roles/${roleSlug}`}
            className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            View Candidates
          </Link>
        )}
      </div>
    </div>
  );
}
