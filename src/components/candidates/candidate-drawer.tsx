"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Copy, ExternalLink, MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditField } from "@/components/candidates/edit-field";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { StatusHistory } from "@/components/candidates/status-history";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchCandidateProfile,
  updateCandidateField,
} from "@/lib/actions/candidates";
import type { Candidate, CandidateEvent } from "@/types";

interface CandidateDrawerProps {
  candidateId: string | null;
  onClose: () => void;
}

interface DrawerData {
  candidate: Candidate;
  events: CandidateEvent[];
}

/** Copy text to clipboard with a brief visual confirmation. */
function CopyButton({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API not available — silently ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
    >
      <Copy
        className={`h-3.5 w-3.5 transition-colors ${copied ? "text-green-500" : ""}`}
      />
    </button>
  );
}

/** Skeleton placeholder shown while candidate data loads. */
function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Contact block skeleton */}
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-gray-100" />
        ))}
      </div>

      {/* History skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded bg-gray-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function CandidateDrawer({ candidateId, onClose }: CandidateDrawerProps) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<DrawerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const loadProfile = useCallback((id: string) => {
    setIsLoading(true);
    startTransition(async () => {
      const result = await fetchCandidateProfile(id);
      setData(result ?? null);
      setIsLoading(false);
    });
  }, []);

  // Load candidate data when candidateId changes
  useEffect(() => {
    if (!candidateId) {
      setData(null);
      return;
    }
    loadProfile(candidateId);
  }, [candidateId, loadProfile]);

  /** Save a single field and re-fetch to refresh drawer state. */
  const handleFieldSave = async (field: string, value: string) => {
    if (!candidateId) return;
    await updateCandidateField(candidateId, field, value);
    // Re-fetch to keep drawer in sync (revalidatePath on server refreshes table too)
    loadProfile(candidateId);
  };

  const candidate = data?.candidate ?? null;
  const events = data?.events ?? [];

  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={!!candidateId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side={side}
        className="w-full sm:max-w-[480px] overflow-y-auto p-0"
        showCloseButton
      >
        {isLoading || !candidate ? (
          <DrawerSkeleton />
        ) : (
          <div className="flex flex-col gap-0">
            {/* Header section */}
            <SheetHeader className="border-b border-gray-100 px-4 py-3 gap-2">
              <SheetTitle className="text-base font-semibold">
                <EditField
                  value={candidate.name}
                  onSave={(v) => handleFieldSave("name", v)}
                  placeholder="Candidate name"
                />
              </SheetTitle>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  candidateId={candidate.id}
                  status={candidate.status}
                />
                <TierBadge
                  candidateId={candidate.id}
                  tier={candidate.tier}
                />
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col divide-y divide-gray-100">
              {/* Contact block */}
              <section className="px-4 py-4 flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Contact
                </h3>

                {/* Email */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="w-20 shrink-0 text-xs text-gray-400">Email</span>
                  <div className="flex flex-1 items-center min-w-0">
                    <EditField
                      value={candidate.email ?? ""}
                      onSave={(v) => handleFieldSave("email", v)}
                      placeholder="Add email"
                    />
                    <CopyButton value={candidate.email} />
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="w-20 shrink-0 text-xs text-gray-400">Phone</span>
                  <div className="flex flex-1 items-center min-w-0">
                    <EditField
                      value={candidate.phone ?? ""}
                      onSave={(v) => handleFieldSave("phone", v)}
                      placeholder="Add phone / WhatsApp"
                    />
                    <CopyButton value={candidate.phone} />
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="w-20 shrink-0 text-xs text-gray-400">Instagram</span>
                  <div className="flex flex-1 items-center min-w-0">
                    <EditField
                      value={candidate.instagram ?? ""}
                      onSave={(v) => handleFieldSave("instagram", v)}
                      placeholder="Add handle"
                    />
                    {candidate.instagram && (
                      <a
                        href={`https://instagram.com/${candidate.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Open Instagram profile"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <CopyButton value={candidate.instagram} />
                  </div>
                </div>

                {/* Portfolio URL */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="w-20 shrink-0 text-xs text-gray-400">Portfolio</span>
                  <div className="flex flex-1 items-center min-w-0">
                    {candidate.portfolioUrl ? (
                      <a
                        href={candidate.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-blue-600 hover:underline text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {candidate.portfolioUrl}
                      </a>
                    ) : (
                      <EditField
                        value={candidate.portfolioUrl ?? ""}
                        onSave={(v) => handleFieldSave("portfolioUrl", v)}
                        placeholder="Add portfolio URL"
                      />
                    )}
                    {candidate.portfolioUrl && (
                      <>
                        <a
                          href={candidate.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Open portfolio"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <CopyButton value={candidate.portfolioUrl} />
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Comments placeholder (CAND-04 — full implementation in Phase 5) */}
              <section className="px-4 py-4 flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Comments
                </h3>
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 py-6 text-center">
                  <MessageSquare className="h-6 w-6 text-gray-300" aria-hidden="true" />
                  <p className="text-sm italic text-gray-400">Comments coming soon</p>
                </div>
              </section>

              {/* Status history timeline */}
              <section className="px-4 py-4 flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  History
                </h3>
                <StatusHistory events={events} />
              </section>
            </div>

            {/* Metadata footer */}
            <div className="border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
              <p className="text-xs text-gray-400">
                Created by{" "}
                <span className="text-gray-600">{candidate.createdBy ?? "Unknown"}</span>
                {" "}on{" "}
                <span className="text-gray-600">
                  {new Date(candidate.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
              {candidate.updatedAt && (
                <p className="text-xs text-gray-400">
                  Last updated{" "}
                  <span className="text-gray-600">
                    {new Date(candidate.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
