"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EditField } from "@/components/candidates/edit-field";
import { CandidateContactSection } from "@/components/candidates/candidate-contact-section";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { StatusHistory } from "@/components/candidates/status-history";
import { CommentThread } from "@/components/candidates/comment-thread";
import { DuplicateBanner } from "@/components/candidates/duplicate-banner";
import { WhatsAppMessageModal } from "@/components/candidates/whatsapp-message-modal";
import { StarRating } from "@/components/candidates/star-rating";
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
  roleName: string | null;
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

export function CandidateDrawer({
  candidateId,
  onClose,
}: CandidateDrawerProps) {
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

  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const candidate = data?.candidate ?? null;
  const events = data?.events ?? [];
  const roleName = data?.roleName ?? null;

  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet
      open={!!candidateId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={side}
        className={cn(
          "overflow-y-auto p-0",
          isMobile
            ? "!h-[100dvh] rounded-t-none border-t-0 w-full"
            : "sm:max-w-[480px]",
        )}
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
                  candidateName={candidate.name}
                />
                <TierBadge candidateId={candidate.id} tier={candidate.tier} />
              </div>

              {/* Star rating */}
              <div className="pt-1">
                <StarRating candidateId={candidate.id} />
              </div>
            </SheetHeader>

            {/* Duplicate banner */}
            <DuplicateBanner
              candidate={candidate}
              onMerged={() => {
                if (candidateId) loadProfile(candidateId);
              }}
            />

            {/* Body */}
            <div className="flex flex-col divide-y divide-gray-100">
              {/* Contact block */}
              <CandidateContactSection
                candidate={candidate}
                onFieldSave={handleFieldSave}
                onWhatsAppClick={() => setWhatsappOpen(true)}
              />

              {/* Details block */}
              {(candidate.location || candidate.experience) && (
                <section className="px-4 py-4 flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Details
                  </h3>

                  {/* Location */}
                  <div className="flex items-center gap-1 text-sm">
                    <span className="w-20 shrink-0 text-xs text-gray-400">
                      Location
                    </span>
                    <div className="flex flex-1 items-center min-w-0">
                      <EditField
                        value={candidate.location ?? ""}
                        onSave={(v) => handleFieldSave("location", v)}
                        placeholder="Add location"
                      />
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="flex items-center gap-1 text-sm">
                    <span className="w-20 shrink-0 text-xs text-gray-400">
                      Experience
                    </span>
                    <div className="flex flex-1 items-center min-w-0">
                      <EditField
                        value={candidate.experience ?? ""}
                        onSave={(v) => handleFieldSave("experience", v)}
                        placeholder="Add experience"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Comments */}
              <section className="px-4 py-4 flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Comments
                </h3>
                <CommentThread candidateId={candidate.id} />
              </section>

              {/* Rejection details — only when rejected */}
              {candidate.status === "rejected" && candidate.rejectionReason && (
                <section className="px-4 py-4 flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-red-400">
                    Rejection
                  </h3>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">
                      {candidate.rejectionReason}
                    </p>
                    {candidate.rejectionMessage && (
                      <p className="mt-1 text-sm text-red-600">
                        {candidate.rejectionMessage}
                      </p>
                    )}
                    {candidate.rejectionMarkedAt && (
                      <p className="mt-2 text-xs text-red-400">
                        Rejected on{" "}
                        {new Date(
                          candidate.rejectionMarkedAt,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </section>
              )}

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
                <span className="text-gray-600">
                  {candidate.createdBy ?? "Unknown"}
                </span>{" "}
                on{" "}
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

      {candidate?.phone && (
        <WhatsAppMessageModal
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          candidateName={candidate.name}
          phone={candidate.phone}
          roleName={roleName}
        />
      )}
    </Sheet>
  );
}
