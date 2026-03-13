"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Instagram,
  User,
  MapPin,
  FileText,
  Link as LinkIcon,
  ClipboardPaste,
} from "lucide-react";
import {
  getConfidenceLabel,
  getConfidenceColor,
} from "@/lib/ai/confidence";
import { confirmExtraction, skipExtraction } from "@/lib/actions/extraction";
import type { ExtractionDraft } from "@/types";
import type { ConfidenceScore } from "@/lib/ai/confidence";
import { ContactParseField } from "@/components/import/ContactParseField";
import type { ParsedContacts } from "@/lib/ai/textParser";

// ---------------------------------------------------------------------------
// Field definitions for rendering
// ---------------------------------------------------------------------------

interface FieldDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  multiline?: boolean;
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", icon: <User size={14} /> },
  { key: "email", label: "Email", icon: <Mail size={14} /> },
  { key: "phone", label: "Phone", icon: <Phone size={14} /> },
  { key: "instagram", label: "Instagram", icon: <Instagram size={14} /> },
  { key: "location", label: "Location", icon: <MapPin size={14} /> },
  { key: "bio", label: "Bio", icon: <FileText size={14} />, multiline: true },
];

// ---------------------------------------------------------------------------
// Confidence badge
// ---------------------------------------------------------------------------

interface ConfidenceBadgeProps {
  score: number | undefined;
}

function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score === undefined || score === null) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getConfidenceColor(score)}`}
    >
      {getConfidenceLabel(score)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ExtractionReviewModal
// ---------------------------------------------------------------------------

export interface ExtractionReviewModalProps {
  draft: ExtractionDraft;
  onConfirm: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ExtractionReviewModal({
  draft,
  onConfirm,
  onSkip,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: ExtractionReviewModalProps) {
  // Parse stored jsonb fields
  const extractedData = (draft.extractedData ?? {}) as Record<string, unknown>;
  const fieldConfidenceRaw = (draft.fieldConfidence ?? []) as ConfidenceScore[];

  // Build confidence lookup: field -> 0.0-1.0
  const confidenceByField: Record<string, number> = {};
  for (const score of fieldConfidenceRaw) {
    confidenceByField[score.field] = score.value;
  }

  // Local editable state (initialized from extractedData)
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const fd of FIELDS) {
      initial[fd.key] = (extractedData[fd.key] as string) ?? "";
    }
    return initial;
  });

  // Re-initialize fields when draft changes
  useEffect(() => {
    const updated: Record<string, string> = {};
    const data = (draft.extractedData ?? {}) as Record<string, unknown>;
    for (const fd of FIELDS) {
      updated[fd.key] = (data[fd.key] as string) ?? "";
    }
    setFields(updated);
  }, [draft.id, draft.extractedData]);

  const [isPending, startTransition] = useTransition();
  const [showContactParse, setShowContactParse] = useState(false);

  // Overall confidence: 0-100 stored in DB, convert to 0.0-1.0
  const overallConfidence =
    draft.overallConfidence !== null && draft.overallConfidence !== undefined
      ? draft.overallConfidence / 100
      : null;

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        // Only pass non-empty field values as edits
        const edits: Record<string, string> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v.trim()) edits[k] = v.trim();
        }
        await confirmExtraction(draft.id, edits);
        onConfirm();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to confirm extraction";
        toast.error(message);
      }
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      try {
        await skipExtraction(draft.id);
        onSkip();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to skip extraction";
        toast.error(message);
      }
    });
  };

  const handleContactParsed = (parsed: ParsedContacts) => {
    setFields((prev) => {
      const next = { ...prev };
      // Apply first detected values only if field is currently empty
      if (!next.email && parsed.emails[0]) next.email = parsed.emails[0];
      if (!next.phone && parsed.phones[0]) next.phone = parsed.phones[0];
      if (!next.instagram && parsed.instagrams[0])
        next.instagram = parsed.instagrams[0];
      return next;
    });
    setShowContactParse(false);
  };

  const portfolioLinks = (extractedData.portfolioLinks as Array<{
    url: string;
    label?: string;
  }>) ?? [];
  const socialHandles = (extractedData.socialHandles as Array<{
    platform: string;
    handle: string;
  }>) ?? [];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          {draft.sourceUrl ? (
            <a
              href={draft.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium truncate max-w-full"
            >
              <span className="truncate">{draft.sourceUrl}</span>
              <ExternalLink size={12} className="flex-shrink-0" />
            </a>
          ) : (
            <p className="text-sm text-gray-500">No source URL</p>
          )}

          {/* Overall confidence */}
          {overallConfidence !== null && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">Overall confidence:</span>
              <ConfidenceBadge score={overallConfidence} />
            </div>
          )}
        </div>

        {/* Navigation */}
        {(hasPrev || hasNext) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onPrev}
              disabled={!hasPrev || isPending}
              className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext || isPending}
              className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {FIELDS.map((fd) => {
          const value = fields[fd.key] ?? "";
          const isEmpty = !value.trim();
          const confidence = confidenceByField[fd.key];

          return (
            <div key={fd.key} className="space-y-1">
              {/* Label row */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  {fd.icon}
                  {fd.label}
                </label>
                <ConfidenceBadge score={confidence} />
              </div>

              {/* Input */}
              {fd.multiline ? (
                <textarea
                  value={value}
                  onChange={(e) => handleFieldChange(fd.key, e.target.value)}
                  rows={3}
                  placeholder={isEmpty ? "Not found" : undefined}
                  className={[
                    "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-red-400 focus:outline-none focus:ring-2 transition-colors resize-none",
                    isEmpty
                      ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 bg-gray-50/50 focus:border-blue-400 focus:ring-blue-100",
                  ].join(" ")}
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(fd.key, e.target.value)}
                  placeholder={isEmpty ? "Not found" : undefined}
                  className={[
                    "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-red-400 focus:outline-none focus:ring-2 transition-colors",
                    isEmpty
                      ? "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 bg-gray-50/50 focus:border-blue-400 focus:ring-blue-100",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}

        {/* Portfolio links (read-only chips) */}
        {portfolioLinks.length > 0 && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <LinkIcon size={14} />
              Portfolio Links
            </label>
            <div className="flex flex-wrap gap-1.5">
              {portfolioLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {link.label || link.url.replace(/^https?:\/\//, "").slice(0, 30)}
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social handles (read-only chips) */}
        {socialHandles.length > 0 && (
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <User size={14} />
              Social Handles
            </label>
            <div className="flex flex-wrap gap-1.5">
              {socialHandles.map((handle, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
                >
                  <span className="font-medium text-gray-500">
                    {handle.platform}
                  </span>
                  {handle.handle}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact paste expander */}
        <div className="pt-1 border-t border-gray-100">
          <button
            onClick={() => setShowContactParse((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ClipboardPaste size={13} />
            {showContactParse ? "Hide" : "Paste raw contact info to fill fields"}
          </button>
          {showContactParse && (
            <div className="mt-2">
              <ContactParseField onParsed={handleContactParsed} />
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={handleSkip}
          disabled={isPending}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Skipping..." : "Skip"}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="rounded-lg bg-blue-500 px-5 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving..." : "Confirm and Save"}
        </button>
      </div>
    </div>
  );
}
