"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import { EditField } from "@/components/candidates/edit-field";
import { CopyButton } from "@/components/candidates/copy-button";

interface CandidateContactSectionProps {
  candidate: {
    email: string | null;
    phone: string | null;
    instagram: string | null;
    portfolioUrl: string | null;
    linkedinUrl: string | null;
    resumeUrl: string | null;
    name: string;
  };
  onFieldSave: (field: string, value: string) => Promise<void>;
  onWhatsAppClick: () => void;
}

export function CandidateContactSection({
  candidate,
  onFieldSave,
  onWhatsAppClick,
}: CandidateContactSectionProps) {
  return (
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
            onSave={(v) => onFieldSave("email", v)}
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
            onSave={(v) => onFieldSave("phone", v)}
            placeholder="Add phone / WhatsApp"
          />
          {candidate.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWhatsAppClick();
              }}
              title="Send WhatsApp message"
              aria-label="Send WhatsApp message"
              className="ml-1 shrink-0 rounded p-0.5 text-[#25D366] hover:text-[#128C7E] transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          )}
          <CopyButton value={candidate.phone} />
        </div>
      </div>

      {/* Instagram */}
      <div className="flex items-center gap-1 text-sm">
        <span className="w-20 shrink-0 text-xs text-gray-400">Instagram</span>
        <div className="flex flex-1 items-center min-w-0">
          <EditField
            value={candidate.instagram ?? ""}
            onSave={(v) => onFieldSave("instagram", v)}
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
              onSave={(v) => onFieldSave("portfolioUrl", v)}
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

      {/* LinkedIn URL */}
      <div className="flex items-center gap-1 text-sm">
        <span className="w-20 shrink-0 text-xs text-gray-400">LinkedIn</span>
        <div className="flex flex-1 items-center min-w-0">
          {candidate.linkedinUrl ? (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-blue-600 hover:underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {candidate.linkedinUrl}
            </a>
          ) : (
            <EditField
              value={candidate.linkedinUrl ?? ""}
              onSave={(v) => onFieldSave("linkedinUrl", v)}
              placeholder="Add LinkedIn URL"
            />
          )}
          {candidate.linkedinUrl && (
            <>
              <a
                href={candidate.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open LinkedIn profile"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <CopyButton value={candidate.linkedinUrl} />
            </>
          )}
        </div>
      </div>

      {/* Resume/CV Link */}
      <div className="flex items-center gap-1 text-sm">
        <span className="w-20 shrink-0 text-xs text-gray-400">Resume</span>
        <div className="flex flex-1 items-center min-w-0">
          {candidate.resumeUrl ? (
            <a
              href={candidate.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-blue-600 hover:underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {candidate.resumeUrl}
            </a>
          ) : (
            <EditField
              value={candidate.resumeUrl ?? ""}
              onSave={(v) => onFieldSave("resumeUrl", v)}
              placeholder="Add resume/CV link"
            />
          )}
          {candidate.resumeUrl && (
            <>
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open resume"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <CopyButton value={candidate.resumeUrl} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
