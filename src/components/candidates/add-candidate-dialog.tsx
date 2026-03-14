"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link2, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/ui/shine-border";
import { createCandidate } from "@/lib/actions/candidates";
import {
  startSingleExtraction,
  confirmExtraction,
} from "@/lib/actions/extraction";

type Mode = "manual" | "link";
type ExtractionState = "idle" | "extracting" | "done" | "error";

interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  instagram: string;
  portfolioUrl: string;
}

interface AddCandidateDialogProps {
  roleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function fireConfetti() {
  const end = Date.now() + 300;
  const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

export function AddCandidateDialog({
  roleId,
  open,
  onOpenChange,
}: AddCandidateDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");

  // Link extraction state
  const [linkUrl, setLinkUrl] = useState("");
  const [extractionState, setExtractionState] =
    useState<ExtractionState>("idle");
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetForm = useCallback(() => {
    setMode("manual");
    setSaving(false);
    setError(null);
    setName("");
    setEmail("");
    setPortfolioUrl("");
    setPhone("");
    setInstagram("");
    setLinkUrl("");
    setExtractionState("idle");
    setExtractionError(null);
    setDraftId(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handleManualSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("roleId", roleId);
    formData.set("name", name.trim());
    formData.set("email", email.trim());
    formData.set("portfolioUrl", portfolioUrl.trim());
    formData.set("phone", phone.trim());
    formData.set("instagram", instagram.trim());

    const result = await createCandidate(formData);

    if ("success" in result && result.success) {
      fireConfetti();
      router.refresh();
      setTimeout(() => onOpenChange(false), 600);
    } else {
      const msg =
        "error" in result
          ? typeof result.error === "string"
            ? result.error
            : "Validation failed"
          : "Failed to add candidate";
      setError(msg);
      setSaving(false);
    }
  };

  const handleExtract = async () => {
    const url = linkUrl.trim();
    if (!url) {
      setExtractionError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setExtractionError("Please enter a valid URL");
      return;
    }

    setExtractionState("extracting");
    setExtractionError(null);

    try {
      const result = await startSingleExtraction(url, roleId);

      if (result.error) {
        setExtractionError(result.error);
        setExtractionState("error");
        return;
      }

      const { batchId } = result;

      // Poll for extraction status
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/extraction-status/${batchId}`);
          const data = await res.json();

          if (data.pending === 0 && data.total > 0) {
            // Extraction done
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }

            const draft = data.drafts[0];
            if (draft.status === "completed" && draft.extractedData) {
              const extracted = draft.extractedData as Record<string, unknown>;
              setName((extracted.name as string) ?? "");
              setEmail((extracted.email as string) ?? "");
              setPhone((extracted.phone as string) ?? "");
              setInstagram((extracted.instagram as string) ?? "");
              setPortfolioUrl(url);
              setDraftId(draft.id);
              setExtractionState("done");
            } else {
              setExtractionError(draft.error ?? "Extraction failed");
              setExtractionState("error");
            }
          }
        } catch {
          // Polling error — keep trying
        }
      }, 500);
    } catch (err) {
      setExtractionError(
        err instanceof Error ? err.message : "Failed to start extraction",
      );
      setExtractionState("error");
    }
  };

  const handleConfirmExtracted = async () => {
    if (!draftId) return;

    setSaving(true);
    setError(null);

    try {
      await confirmExtraction(draftId, {
        name: name.trim() || "Unknown",
        email: email.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
      });

      fireConfetti();
      router.refresh();
      setTimeout(() => onOpenChange(false), 600);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm extraction",
      );
      setSaving(false);
    }
  };

  const isManual = mode === "manual";
  const showForm = isManual || extractionState === "done";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <ShineBorder
          shineColor={["#3b82f6", "#8b5cf6", "#06b6d4"]}
          borderWidth={2}
          duration={8}
          className="rounded-xl"
        />

        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
          <DialogDescription>
            Add manually or paste a portfolio link to auto-extract details.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setExtractionState("idle");
              setExtractionError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isManual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User size={14} />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              !isManual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Link2 size={14} />
            Paste Link
          </button>
        </div>

        {/* Link input — shown in link mode before extraction completes */}
        {!isManual && extractionState !== "done" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Portfolio / Website URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://behance.net/johndoe"
                  disabled={extractionState === "extracting"}
                  className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleExtract();
                    }
                  }}
                />
                <Button
                  onClick={handleExtract}
                  disabled={extractionState === "extracting" || !linkUrl.trim()}
                  size="default"
                >
                  {extractionState === "extracting" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Extracting…
                    </>
                  ) : (
                    "Extract"
                  )}
                </Button>
              </div>
            </div>

            {extractionState === "extracting" && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-md px-3 py-2">
                <Loader2 size={14} className="animate-spin" />
                Scraping page and extracting details…
              </div>
            )}

            {extractionState === "error" && extractionError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                <AlertCircle size={14} />
                {extractionError}
              </div>
            )}
          </div>
        )}

        {/* Extraction success banner */}
        {!isManual && extractionState === "done" && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
            <CheckCircle2 size={14} />
            Fields extracted — review and save below.
          </div>
        )}

        {/* Form fields — manual mode always, link mode after extraction */}
        {showForm && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoFocus={isManual}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@handle"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={isManual ? handleManualSave : handleConfirmExtracted}
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Candidate"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
