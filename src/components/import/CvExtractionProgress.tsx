"use client";

import {
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface CvExtractionProgressProps {
  fileName: string;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  extractedName?: string;
  suggestedRole?: string;
  currentRoleName?: string;
  error?: string;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    iconColor: "text-gray-400",
    label: "Pending",
    labelColor: "text-gray-500",
  },
  uploading: {
    icon: Loader2,
    iconColor: "text-blue-500",
    label: "Uploading...",
    labelColor: "text-blue-600",
  },
  extracting: {
    icon: Loader2,
    iconColor: "text-blue-500",
    label: "Extracting...",
    labelColor: "text-blue-600",
  },
  done: {
    icon: CheckCircle2,
    iconColor: "text-green-500",
    label: "Done",
    labelColor: "text-green-600",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-500",
    label: "Failed",
    labelColor: "text-red-600",
  },
} as const;

export function CvExtractionProgress({
  fileName,
  status,
  extractedName,
  suggestedRole,
  currentRoleName,
  error,
}: CvExtractionProgressProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSpinning = status === "uploading" || status === "extracting";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {/* Status icon */}
      <div className="shrink-0">
        <Icon
          className={`h-5 w-5 ${config.iconColor} ${isSpinning ? "animate-spin" : ""}`}
        />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate">
            {fileName}
          </span>
        </div>
        {status === "done" && extractedName && (
          <p className="text-xs text-green-600 mt-0.5 truncate">
            {extractedName}
          </p>
        )}
        {status === "done" &&
          suggestedRole &&
          currentRoleName &&
          suggestedRole.toLowerCase() !== currentRoleName.toLowerCase() && (
            <p className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              CV seems better for &ldquo;{suggestedRole}&rdquo;
            </p>
          )}
        {status === "error" && error && (
          <p className="text-xs text-red-500 mt-0.5 truncate">{error}</p>
        )}
      </div>

      {/* Status label */}
      <span className={`text-xs font-medium shrink-0 ${config.labelColor}`}>
        {config.label}
      </span>
    </div>
  );
}
