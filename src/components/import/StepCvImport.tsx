"use client";

import {
  useReducer,
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from "react";
import { FileText, Loader2, CheckCircle2, Upload } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CvExtractionProgress } from "@/components/import/CvExtractionProgress";
import type { ResumeExtractionResult } from "@/lib/ai/resume-extractor";

// ── Types ────────────────────────────────────────────────────────────────────

interface RoleOption {
  id: string;
  name: string;
}

interface StepCvImportProps {
  roleId?: string;
  roles?: RoleOption[];
}

interface FileEntry {
  id: string;
  file: File;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  storagePath?: string;
  fileName?: string;
  extraction?: ResumeExtractionResult;
  extractedName?: string;
  suggestedRole?: string;
  error?: string;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

type FileAction =
  | { type: "ADD_FILES"; payload: FileEntry[] }
  | {
      type: "UPDATE_STATUS";
      payload: { id: string; updates: Partial<FileEntry> };
    }
  | { type: "RESET" };

function fileReducer(state: FileEntry[], action: FileAction): FileEntry[] {
  switch (action.type) {
    case "ADD_FILES":
      return [...state, ...action.payload];
    case "UPDATE_STATUS":
      return state.map((entry) =>
        entry.id === action.payload.id
          ? { ...entry, ...action.payload.updates }
          : entry,
      );
    case "RESET":
      return [];
    default:
      return state;
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const BATCH_SIZE = 5;

// ── Component ────────────────────────────────────────────────────────────────

export function StepCvImport({
  roleId: initialRoleId,
  roles = [],
}: StepCvImportProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(initialRoleId ?? "");
  const roleId = selectedRoleId;

  const [files, dispatch] = useReducer(fileReducer, []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchId = useRef(crypto.randomUUID()).current;

  // ── File selection ───────────────────────────────────────────────────────

  const addFiles = useCallback((fileList: FileList) => {
    const entries: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only PDF and DOCX files are accepted`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File size must be under 10MB`);
        continue;
      }
      entries.push({
        id: crypto.randomUUID(),
        file,
        status: "pending",
      });
    }
    if (entries.length > 0) {
      dispatch({ type: "ADD_FILES", payload: entries });
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  // ── Sequential upload processing ────────────────────────────────────────

  const processFiles = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setIsProcessing(true);

    for (const entry of pending) {
      dispatch({
        type: "UPDATE_STATUS",
        payload: { id: entry.id, updates: { status: "uploading" } },
      });

      try {
        const formData = new FormData();
        formData.append("file", entry.file);
        formData.append("batchId", batchId);
        formData.append("extractData", "true");

        dispatch({
          type: "UPDATE_STATUS",
          payload: { id: entry.id, updates: { status: "extracting" } },
        });

        const response = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          dispatch({
            type: "UPDATE_STATUS",
            payload: {
              id: entry.id,
              updates: {
                status: "error",
                error: errorData?.error ?? `Upload failed (${response.status})`,
              },
            },
          });
          continue;
        }

        const result = await response.json();
        dispatch({
          type: "UPDATE_STATUS",
          payload: {
            id: entry.id,
            updates: {
              status: "done",
              storagePath: result.storagePath,
              fileName: result.fileName,
              extraction: result.extraction,
              extractedName: result.extraction?.name ?? undefined,
              suggestedRole: result.extraction?.suggestedRole ?? undefined,
            },
          },
        });
      } catch (err) {
        dispatch({
          type: "UPDATE_STATUS",
          payload: {
            id: entry.id,
            updates: {
              status: "error",
              error: err instanceof Error ? err.message : "Unexpected error",
            },
          },
        });
      }
    }

    setIsProcessing(false);
  }, [files, batchId]);

  // ── Bulk create candidates ──────────────────────────────────────────────

  const createAllCandidates = useCallback(async () => {
    if (!roleId) {
      toast.error("Please select a role before creating candidates");
      return;
    }
    const doneFiles = files.filter((f) => f.status === "done");
    if (doneFiles.length === 0) return;

    setIsCreating(true);
    let totalCreated = 0;

    // Process in batches of BATCH_SIZE
    for (let i = 0; i < doneFiles.length; i += BATCH_SIZE) {
      const batch = doneFiles.slice(i, i + BATCH_SIZE);
      const payload = {
        roleId,
        items: batch.map((f) => ({
          tempPath: f.storagePath,
          fileName: f.fileName ?? f.file.name,
          extraction: f.extraction ?? null,
        })),
      };

      try {
        const response = await fetch("/api/resume/confirm-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          toast.error(
            `Batch creation failed for files ${i + 1}-${i + batch.length}`,
          );
          continue;
        }

        const data = await response.json();
        const count = data.created?.length ?? 0;
        totalCreated += count;
        setCreatedCount(totalCreated);
      } catch {
        toast.error("Failed to create candidates");
      }
    }

    setIsCreating(false);
    setIsDone(true);
    toast.success(
      `${totalCreated} candidate${totalCreated !== 1 ? "s" : ""} created`,
    );
  }, [files, roleId, batchId]);

  // ── Auto-select role from AI suggestion ─────────────────────────────

  useEffect(() => {
    if (roleId) return; // already selected
    const firstDone = files.find((f) => f.status === "done" && f.suggestedRole);
    if (!firstDone?.suggestedRole || roles.length === 0) return;
    const match = roles.find(
      (r) => r.name.toLowerCase() === firstDone.suggestedRole!.toLowerCase(),
    );
    if (match) {
      setSelectedRoleId(match.id);
      toast.info(`AI suggested role: ${match.name}`);
    }
  }, [files, roleId, roles]);

  // ── Derived state ──────────────────────────────────────────────────────

  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pendingCount = files.filter((f) => f.status === "pending").length;
  const allProcessed = files.length > 0 && pendingCount === 0 && !isProcessing;
  const hasFiles = files.length > 0;
  const processedCount = doneCount + errorCount;
  const progressPercent =
    files.length > 0 ? Math.round((processedCount / files.length) * 100) : 0;

  // ── Render ─────────────────────────────────────────────────────────────

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold text-gray-800">
          {createdCount} candidate{createdCount !== 1 ? "s" : ""} created
        </p>
        {errorCount > 0 && (
          <p className="text-sm text-gray-500">
            {errorCount} file{errorCount !== 1 ? "s" : ""} had errors
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => {
            dispatch({ type: "RESET" });
            setIsDone(false);
            setCreatedCount(0);
          }}
        >
          Upload More
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Role selector — shown when no pre-selected roleId */}
      {!initialRoleId && roles.length > 0 && (
        <div className="flex items-center gap-3">
          <label
            htmlFor="cv-role-select"
            className="text-sm font-medium text-gray-700 shrink-0"
          >
            Target Role
          </label>
          <select
            id="cv-role-select"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a role...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select resume files"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            Drop resumes here or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Multiple PDF or DOCX files, up to 10MB each
          </p>
        </div>
      </div>

      {/* File list */}
      {hasFiles && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Files ({files.length})
          </p>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {files.map((entry) => (
              <CvExtractionProgress
                key={entry.id}
                fileName={entry.file.name}
                status={
                  entry.status === "extracting" ? "extracting" : entry.status
                }
                extractedName={entry.extractedName}
                suggestedRole={entry.suggestedRole}
                currentRoleName={roles.find((r) => r.id === roleId)?.name}
                error={entry.error}
              />
            ))}
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex flex-col items-center gap-3 py-4">
          <AnimatedCircularProgressBar
            value={progressPercent}
            max={100}
            min={0}
            gaugePrimaryColor="#7C3AED"
            gaugeSecondaryColor="#EDE9FE"
            className="size-24 text-base"
          />
          <p className="text-sm text-purple-600 font-medium">
            AI processing {processedCount + 1} of {files.length}...
          </p>
        </div>
      )}

      {/* Action buttons */}
      {hasFiles && !allProcessed && !isProcessing && (
        <div className="flex justify-end">
          <Button onClick={processFiles} disabled={pendingCount === 0}>
            <FileText className="h-4 w-4" />
            Process {pendingCount} File{pendingCount !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {allProcessed && doneCount > 0 && !isCreating && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">
            {doneCount} file{doneCount !== 1 ? "s" : ""} ready
            {errorCount > 0 && `, ${errorCount} failed`}
          </p>
          <Button onClick={createAllCandidates}>
            Create {doneCount} Candidate{doneCount !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {isCreating && (
        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <AnimatedCircularProgressBar
            value={
              doneCount > 0 ? Math.round((createdCount / doneCount) * 100) : 0
            }
            max={100}
            min={0}
            gaugePrimaryColor="#7C3AED"
            gaugeSecondaryColor="#EDE9FE"
            className="size-20 text-sm"
          />
          <p className="text-sm text-gray-600">
            Creating candidates... ({createdCount} created)
          </p>
        </div>
      )}
    </div>
  );
}
