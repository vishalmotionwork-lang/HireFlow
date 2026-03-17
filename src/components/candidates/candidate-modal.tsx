"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EditField } from "@/components/candidates/edit-field";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { StatusHistory } from "@/components/candidates/status-history";
import { CommentThread } from "@/components/candidates/comment-thread";
import { DuplicateBanner } from "@/components/candidates/duplicate-banner";
import { WhatsAppMessageModal } from "@/components/candidates/whatsapp-message-modal";
import { StarRating } from "@/components/candidates/star-rating";
import { ResumeViewer } from "@/components/candidates/resume-viewer";
import { CopyButton } from "@/components/candidates/copy-button";
import {
  FileText,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  MapPin,
  Briefcase,
  MessageCircle,
} from "lucide-react";
import {
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import {
  fetchCandidateProfile,
  updateCandidateField,
} from "@/lib/actions/candidates";
import type { Candidate, CandidateEvent } from "@/types";

interface CandidateModalProps {
  candidateId: string | null;
  onClose: () => void;
}

interface ModalData {
  candidate: Candidate;
  events: CandidateEvent[];
  roleName: string | null;
}

type RightPanel = "comments" | "history" | "resume";

function ModalSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-64 border-r p-4 flex flex-col gap-3">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-16 rounded-full bg-gray-200" />
        </div>
        <div className="space-y-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col gap-4">
        <div className="flex gap-4 border-b pb-3">
          <div className="h-5 w-20 rounded bg-gray-200" />
          <div className="h-5 w-16 rounded bg-gray-200" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Property row in the left sidebar */
function PropertyItem({
  icon,
  label,
  value,
  hasData,
  isActive,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  hasData: boolean;
  isActive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "hover:bg-gray-50 text-gray-700"
      }`}
    >
      {/* Status dot */}
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${hasData ? "bg-green-500" : "bg-gray-300"}`}
      />
      {/* Icon */}
      <span className="shrink-0 text-gray-400">{icon}</span>
      {/* Label + value */}
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-gray-400">{label}</span>
        {children ?? (
          <span className="block truncate text-sm">
            {value || (
              <span className="text-gray-300 italic">Not added</span>
            )}
          </span>
        )}
      </span>
      {/* External link for URLs */}
      {hasData && value && (value.startsWith("http") || value.startsWith("resumes/")) && (
        <ExternalLink className="h-3 w-3 text-gray-300 shrink-0" />
      )}
    </button>
  );
}

export function CandidateModal({ candidateId, onClose }: CandidateModalProps) {
  const [data, setData] = useState<ModalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();
  const [rightPanel, setRightPanel] = useState<RightPanel>("comments");
  const [activeProperty, setActiveProperty] = useState<string | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const loadProfile = useCallback((id: string) => {
    setIsLoading(true);
    startTransition(async () => {
      const result = await fetchCandidateProfile(id);
      setData(result ?? null);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!candidateId) {
      setData(null);
      return;
    }
    setRightPanel("comments");
    setActiveProperty(null);
    loadProfile(candidateId);
  }, [candidateId, loadProfile]);

  const handleFieldSave = async (field: string, value: string) => {
    if (!candidateId) return;
    await updateCandidateField(candidateId, field, value);
    loadProfile(candidateId);
  };

  const handlePropertyClick = (prop: string) => {
    setActiveProperty(prop);
    if (prop === "resume") {
      setRightPanel("resume");
    }
  };

  const candidate = data?.candidate ?? null;
  const events = data?.events ?? [];
  const roleName = data?.roleName ?? null;

  return (
    <>
      <Dialog
        open={!!candidateId}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className="sm:max-w-[80vw] md:max-w-[75vw] lg:max-w-[70vw] max-h-[85vh] overflow-hidden p-0"
          showCloseButton
        >
          <DialogTitle className="sr-only">
            {candidate?.name ?? "Candidate Profile"}
          </DialogTitle>

          {isLoading || !candidate ? (
            <ModalSkeleton />
          ) : (
            <div className="flex flex-col md:flex-row h-[80vh] max-h-[80vh]">
              {/* ── Left Panel: Properties Sidebar ── */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto shrink-0">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="text-base font-semibold">
                    <EditField
                      value={candidate.name}
                      onSave={(v) => handleFieldSave("name", v)}
                      placeholder="Candidate name"
                    />
                  </div>
                  {roleName && (
                    <p className="text-xs text-gray-400 mt-0.5">{roleName}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge
                      candidateId={candidate.id}
                      status={candidate.status}
                      candidateName={candidate.name}
                    />
                    <TierBadge
                      candidateId={candidate.id}
                      tier={candidate.tier}
                    />
                  </div>
                  <div className="mt-1.5">
                    <StarRating candidateId={candidate.id} />
                  </div>
                </div>

                {/* Duplicate banner */}
                <DuplicateBanner
                  candidate={candidate}
                  onMerged={() => {
                    if (candidateId) loadProfile(candidateId);
                  }}
                />

                {/* Properties list */}
                <div className="px-2 py-2 flex flex-col gap-0.5">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    Contact
                  </p>

                  <PropertyItem
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label="Email"
                    value={candidate.email}
                    hasData={!!candidate.email}
                    isActive={activeProperty === "email"}
                    onClick={() => setActiveProperty("email")}
                  >
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm">
                        {candidate.email || (
                          <span className="text-gray-300 italic">Add email</span>
                        )}
                      </span>
                      {candidate.email && <CopyButton value={candidate.email} />}
                    </span>
                  </PropertyItem>

                  <PropertyItem
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label="Phone"
                    value={candidate.phone}
                    hasData={!!candidate.phone}
                    isActive={activeProperty === "phone"}
                    onClick={() => setActiveProperty("phone")}
                  >
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm tabular-nums">
                        {candidate.phone || (
                          <span className="text-gray-300 italic">Add phone</span>
                        )}
                      </span>
                      {candidate.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWhatsappOpen(true);
                          }}
                          className="shrink-0 text-green-500 hover:text-green-700"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </button>
                      )}
                      {candidate.phone && <CopyButton value={candidate.phone} />}
                    </span>
                  </PropertyItem>

                  <PropertyItem
                    icon={<FaInstagram className="h-3.5 w-3.5" />}
                    label="Instagram"
                    value={candidate.instagram}
                    hasData={!!candidate.instagram}
                    isActive={activeProperty === "instagram"}
                    onClick={() => setActiveProperty("instagram")}
                  />

                  <PropertyItem
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Portfolio"
                    value={candidate.portfolioUrl}
                    hasData={!!candidate.portfolioUrl}
                    isActive={activeProperty === "portfolio"}
                    onClick={() => setActiveProperty("portfolio")}
                  />

                  <PropertyItem
                    icon={<FaLinkedinIn className="h-3.5 w-3.5" />}
                    label="LinkedIn"
                    value={candidate.linkedinUrl}
                    hasData={!!candidate.linkedinUrl}
                    isActive={activeProperty === "linkedin"}
                    onClick={() => setActiveProperty("linkedin")}
                  />

                  <div className="my-1 mx-3 border-t border-gray-100" />

                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    Attachments
                  </p>

                  <PropertyItem
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label="Resume / CV"
                    value={candidate.resumeFileName ?? candidate.resumeUrl}
                    hasData={!!candidate.resumeUrl}
                    isActive={activeProperty === "resume"}
                    onClick={() => handlePropertyClick("resume")}
                  >
                    <span className="truncate text-sm">
                      {candidate.resumeFileName ??
                        (candidate.resumeUrl ? "Attached" : (
                          <span className="text-purple-500 font-medium">
                            Upload CV
                          </span>
                        ))}
                    </span>
                  </PropertyItem>

                  {(candidate.location || candidate.experience) && (
                    <>
                      <div className="my-1 mx-3 border-t border-gray-100" />
                      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                        Details
                      </p>
                    </>
                  )}

                  {candidate.location !== null && (
                    <PropertyItem
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label="Location"
                      value={candidate.location}
                      hasData={!!candidate.location}
                      isActive={activeProperty === "location"}
                      onClick={() => setActiveProperty("location")}
                    />
                  )}

                  {candidate.experience !== null && (
                    <PropertyItem
                      icon={<Briefcase className="h-3.5 w-3.5" />}
                      label="Experience"
                      value={candidate.experience}
                      hasData={!!candidate.experience}
                      isActive={activeProperty === "experience"}
                      onClick={() => setActiveProperty("experience")}
                    />
                  )}
                </div>

                {/* Rejection details */}
                {candidate.status === "rejected" &&
                  candidate.rejectionReason && (
                    <section className="px-4 py-3 border-t border-gray-100">
                      <div className="rounded-lg border border-red-100 bg-red-50 p-2.5">
                        <p className="text-xs font-medium text-red-700">
                          {candidate.rejectionReason}
                        </p>
                        {candidate.rejectionMessage && (
                          <p className="mt-1 text-xs text-red-600">
                            {candidate.rejectionMessage}
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                {/* Footer metadata */}
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <p className="text-xs text-gray-400">
                    {candidate.source === "cv_upload" ? "CV Upload" : candidate.source}
                    {" · "}
                    {new Date(candidate.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* ── Right Panel ── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-100 px-5 pt-4 gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setRightPanel("comments");
                      setActiveProperty(null);
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      rightPanel === "comments"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Comments
                  </button>
                  <button
                    onClick={() => {
                      setRightPanel("history");
                      setActiveProperty(null);
                    }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      rightPanel === "history"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    History
                  </button>
                  {rightPanel === "resume" && (
                    <span className="px-4 py-2 text-sm font-medium border-b-2 -mb-px border-purple-500 text-purple-600 inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Resume
                    </span>
                  )}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {rightPanel === "comments" && (
                    <CommentThread candidateId={candidate.id} />
                  )}
                  {rightPanel === "history" && (
                    <StatusHistory events={events} />
                  )}
                  {rightPanel === "resume" && (
                    <ResumeViewer
                      candidateId={candidate.id}
                      resumeUrl={candidate.resumeUrl ?? null}
                      resumeFileName={candidate.resumeFileName ?? null}
                      onResumeChange={() => {
                        if (candidateId) loadProfile(candidateId);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp modal */}
      {candidate?.phone && (
        <WhatsAppMessageModal
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          candidateName={candidate.name}
          phone={candidate.phone}
          roleName={roleName}
        />
      )}
    </>
  );
}
