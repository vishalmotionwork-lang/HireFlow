"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, User, Mail, Phone, AlertTriangle } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResumeUploadButton } from "@/components/candidates/resume-upload-button";
import type { ResumeExtractionResult } from "@/lib/ai/resume-extractor";

interface UploadResult {
  storagePath: string;
  signedUrl: string;
  fileName: string;
  extraction?: ResumeExtractionResult;
}

interface CvCreateCandidateProps {
  roleId: string;
  roleName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (candidateId: string) => void;
}

type FlowState = "upload" | "review" | "creating";

export function CvCreateCandidate({
  roleId,
  roleName,
  open,
  onOpenChange,
  onSuccess,
}: CvCreateCandidateProps) {
  const [flowState, setFlowState] = useState<FlowState>("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [createProgress, setCreateProgress] = useState(0);

  // Animate progress during candidate creation
  useEffect(() => {
    if (flowState !== "creating") {
      setCreateProgress(0);
      return;
    }
    const timer = setInterval(() => {
      setCreateProgress((prev) => (prev < 90 ? prev + 5 : prev));
    }, 200);
    return () => clearInterval(timer);
  }, [flowState]);

  const batchId = useMemo(() => crypto.randomUUID(), []);

  const extraction = uploadResult?.extraction ?? null;

  const resetState = useCallback(() => {
    setFlowState("upload");
    setUploadResult(null);
  }, []);

  const handleUploadComplete = useCallback((result: UploadResult) => {
    setUploadResult(result);
    setFlowState("review");
  }, []);

  const handleCreate = useCallback(async () => {
    if (!uploadResult) return;

    setFlowState("creating");

    try {
      const payload = {
        roleId,
        items: [
          {
            tempPath: uploadResult.storagePath,
            fileName: uploadResult.fileName,
            extraction: uploadResult.extraction ?? null,
          },
        ],
      };

      const response = await fetch("/api/resume/confirm-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? "Failed to create candidate");
      }

      const data = await response.json();
      const candidateId = data.created?.[0]?.id;

      toast.success("Candidate created from CV");
      onOpenChange(false);
      resetState();

      if (candidateId) {
        onSuccess?.(candidateId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create candidate";
      toast.error(message);
      setFlowState("review");
    }
  }, [uploadResult, roleId, batchId, onOpenChange, onSuccess, resetState]);

  const handleEditAndCreate = useCallback(async () => {
    await handleCreate();
  }, [handleCreate]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload CV</DialogTitle>
          <DialogDescription>
            Upload a resume to automatically create a candidate profile.
          </DialogDescription>
        </DialogHeader>

        {/* Upload state */}
        {flowState === "upload" && (
          <ResumeUploadButton
            batchId={batchId}
            variant="dropzone"
            onUploadComplete={handleUploadComplete}
            extractData
          />
        )}

        {/* Review state */}
        {flowState === "review" && extraction && (
          <div className="flex flex-col gap-4">
            {/* Role mismatch warning */}
            {extraction.suggestedRole &&
              roleName &&
              extraction.suggestedRole.toLowerCase() !==
                roleName.toLowerCase() && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Role mismatch detected
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      This CV looks like a better fit for{" "}
                      <span className="font-semibold">
                        {extraction.suggestedRole}
                      </span>
                      , but you&apos;re adding to{" "}
                      <span className="font-semibold">{roleName}</span>.
                      Continue anyway?
                    </p>
                  </div>
                </div>
              )}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              {/* Name */}
              {extraction.name && (
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-gray-500 shrink-0" />
                  <span className="text-base font-semibold text-gray-900">
                    {extraction.name}
                  </span>
                </div>
              )}

              {/* Contact info */}
              <div className="flex flex-col gap-1.5 mb-3">
                {extraction.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {extraction.email}
                  </div>
                )}
                {extraction.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {extraction.phone}
                  </div>
                )}
              </div>

              {/* Skills */}
              {extraction.skills.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {extraction.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {extraction.experience && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Experience
                  </p>
                  <p className="text-sm text-gray-700">
                    {extraction.experience}
                  </p>
                </div>
              )}

              {/* Education */}
              {extraction.education && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Education
                  </p>
                  <p className="text-sm text-gray-700">
                    {extraction.education}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" onClick={handleEditAndCreate}>
                Edit Before Creating
              </Button>
              <Button onClick={handleCreate}>Create Candidate</Button>
            </div>
          </div>
        )}

        {/* Review state — no extraction data */}
        {flowState === "review" && !extraction && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">
                Resume uploaded but no data could be extracted.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                A candidate will be created with the resume attached.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate}>Create Candidate</Button>
            </div>
          </div>
        )}

        {/* Creating state */}
        {flowState === "creating" && (
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <AnimatedCircularProgressBar
              value={Math.round(createProgress)}
              max={100}
              min={0}
              gaugePrimaryColor="#7C3AED"
              gaugeSecondaryColor="#EDE9FE"
              className="size-24 text-base"
            />
            <p className="text-sm text-purple-600 font-medium">
              Creating candidate...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
