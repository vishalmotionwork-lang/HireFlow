"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ResumeExtractionResult } from "@/lib/ai/resume-extractor";

interface UploadResult {
  storagePath: string;
  signedUrl: string;
  fileName: string;
  extraction?: ResumeExtractionResult;
}

interface ResumeUploadButtonProps {
  candidateId?: string;
  batchId?: string;
  onUploadComplete: (result: UploadResult) => void;
  onError?: (error: string) => void;
  extractData?: boolean;
  variant?: "button" | "dropzone";
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx";

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Only PDF and DOCX files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 10MB.";
  }
  return null;
}

export function ResumeUploadButton({
  candidateId,
  batchId,
  onUploadComplete,
  onError,
  extractData = true,
  variant = "button",
  className = "",
}: ResumeUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate progress during upload + AI extraction
  useEffect(() => {
    if (!isUploading) {
      setProgress(0);
      return;
    }
    // Ramp up quickly to 30 (upload), slow through 30-80 (AI), then hold
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) return prev + 6;
        if (prev < 80) return prev + 2;
        if (prev < 95) return prev + 0.5;
        return prev;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [isUploading]);

  const handleError = useCallback(
    (message: string) => {
      if (onError) {
        onError(message);
      } else {
        toast.error(message);
      }
    },
    [onError],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        handleError(validationError);
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (candidateId) formData.append("candidateId", candidateId);
        if (batchId) formData.append("batchId", batchId);
        if (extractData) formData.append("extractData", "true");

        const response = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const message =
            errorData?.error ?? `Upload failed (${response.status})`;
          handleError(message);
          return;
        }

        const result: UploadResult = await response.json();
        onUploadComplete(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed unexpectedly";
        handleError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [candidateId, batchId, extractData, onUploadComplete, handleError],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    },
    [uploadFile],
  );

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPTED_EXTENSIONS}
      onChange={handleFileChange}
      className="hidden"
      aria-label="Upload resume file"
    />
  );

  if (variant === "dropzone") {
    return (
      <div className={className}>
        {hiddenInput}
        <div
          role="button"
          tabIndex={0}
          onClick={triggerFileSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") triggerFileSelect();
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
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <AnimatedCircularProgressBar
                value={Math.round(progress)}
                max={100}
                min={0}
                gaugePrimaryColor="#7C3AED"
                gaugeSecondaryColor="#EDE9FE"
                className="size-20 text-sm"
              />
              <p className="text-xs text-purple-600 font-medium">
                {progress < 30
                  ? "Uploading..."
                  : progress < 80
                    ? "AI extracting data..."
                    : "Almost done..."}
              </p>
            </div>
          ) : (
            <>
              <FileText className="h-8 w-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Drop a resume here or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF or DOCX, up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // "button" variant
  return (
    <div className={className}>
      {hiddenInput}
      <Button
        variant="outline"
        size="sm"
        onClick={triggerFileSelect}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? "Uploading..." : "Upload CV"}
      </Button>
    </div>
  );
}
