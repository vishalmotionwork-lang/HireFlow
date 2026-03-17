"use client";

import { useState, useCallback } from "react";
import { Download, RefreshCw, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ResumeUploadButton } from "@/components/candidates/resume-upload-button";
import { updateCandidateField } from "@/lib/actions/candidates";

interface ResumeViewerProps {
  candidateId: string;
  resumeUrl: string | null;
  resumeFileName: string | null;
  onResumeChange?: () => void;
}

export function ResumeViewer({
  candidateId,
  resumeUrl,
  resumeFileName,
  onResumeChange,
}: ResumeViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplace, setShowReplace] = useState(false);

  const downloadUrl = `/api/resume/download/${candidateId}`;

  const isPdf = resumeFileName?.toLowerCase().endsWith(".pdf") ?? false;
  const isDocx = resumeFileName?.toLowerCase().endsWith(".docx") ?? false;

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const r1 = await updateCandidateField(candidateId, "resumeUrl", "");
      const r2 = await updateCandidateField(candidateId, "resumeFileName", "");
      if ((r1 && "error" in r1) || (r2 && "error" in r2)) {
        toast.error("Failed to remove resume");
        return;
      }
      toast.success("Resume removed");
      onResumeChange?.();
    } catch {
      toast.error("Failed to remove resume");
    } finally {
      setIsDeleting(false);
    }
  }, [candidateId, onResumeChange]);

  const handleUploadComplete = useCallback(() => {
    setShowReplace(false);
    toast.success("Resume replaced");
    onResumeChange?.();
  }, [onResumeChange]);

  // No resume — show upload dropzone
  if (!resumeUrl) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          No resume uploaded for this candidate.
        </p>
        <ResumeUploadButton
          candidateId={candidateId}
          variant="dropzone"
          onUploadComplete={() => {
            toast.success("Resume uploaded");
            onResumeChange?.();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* PDF preview or DOCX fallback */}
      {isPdf && (
        <iframe
          src={downloadUrl}
          title="Resume preview"
          className="w-full h-96 rounded-lg border border-gray-200"
        />
      )}

      {isDocx && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-8">
          <FileText className="h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">{resumeFileName}</p>
          <p className="text-xs text-gray-500">
            DOCX preview is not available. Download to view.
          </p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
      )}

      {!isPdf && !isDocx && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-8">
          <FileText className="h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            {resumeFileName ?? "Resume"}
          </p>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </a>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </a>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowReplace((prev) => !prev)}
        >
          <RefreshCw className="h-4 w-4" />
          Replace
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Removing..." : "Remove"}
        </Button>
      </div>

      {/* Replace upload area */}
      {showReplace && (
        <ResumeUploadButton
          candidateId={candidateId}
          variant="dropzone"
          onUploadComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
