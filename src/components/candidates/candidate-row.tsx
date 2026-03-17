"use client";

import { forwardRef } from "react";
import {
  ExternalLink,
  FileText,
  Phone as PhoneIcon,
  TriangleAlert,
} from "lucide-react";
import {
  FaWhatsapp,
  FaInstagram,
  FaLinkedinIn,
  FaBehance,
  FaYoutube,
  FaGithub,
  FaGoogleDrive,
} from "react-icons/fa";
import { StatusBadge } from "@/components/candidates/status-badge";
import { TierBadge } from "@/components/candidates/tier-badge";
import { STALE_REVIEW_DAYS } from "@/lib/constants/pipeline";
import type { Candidate, PortfolioLink } from "@/types";

export interface CandidateRowProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  showRoleColumn?: boolean;
  rolesMap?: Record<string, string>;
  isChecked?: boolean;
  onCheckboxToggle?: (candidateId: string) => void;
  isDragOverlay?: boolean;
  dragHandle?: React.ReactNode;
  onWhatsAppClick?: (candidate: Candidate) => void;
  style?: React.CSSProperties;
  className?: string;
}

function emailName(email: string): string {
  return email.split("@")[0] ?? email;
}

function shortDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Link";
  }
}

/** Classify a URL into a link type for icon display */
function classifyUrl(url: string): {
  type:
    | "instagram"
    | "linkedin"
    | "behance"
    | "youtube"
    | "drive"
    | "github"
    | "portfolio"
    | "resume";
  label: string;
} {
  const domain = shortDomain(url).toLowerCase();
  if (domain.includes("instagram.com"))
    return { type: "instagram", label: "Instagram" };
  if (domain.includes("linkedin.com"))
    return { type: "linkedin", label: "LinkedIn" };
  if (domain.includes("behance.net"))
    return { type: "behance", label: "Behance" };
  if (domain.includes("youtube.com") || domain.includes("youtu.be"))
    return { type: "youtube", label: "YouTube" };
  if (domain.includes("drive.google.com") || domain.includes("docs.google.com"))
    return { type: "drive", label: "Google Drive" };
  if (domain.includes("github.com")) return { type: "github", label: "GitHub" };
  // Map common domains to friendly names instead of raw hostnames
  const FRIENDLY: Record<string, string> = {
    "rebrand.ly": "Portfolio",
    "bit.ly": "Portfolio",
    "t.co": "Portfolio",
    "tinyurl.com": "Portfolio",
  };
  const friendly = FRIENDLY[domain] ?? domain;
  return { type: "portfolio", label: friendly };
}

const LINK_ICONS = {
  instagram: FaInstagram,
  linkedin: FaLinkedinIn,
  behance: FaBehance,
  youtube: FaYoutube,
  drive: FaGoogleDrive,
  github: FaGithub,
  portfolio: ExternalLink,
  resume: FileText,
} as const;

const LINK_COLORS = {
  instagram: "text-pink-500 hover:text-pink-700 hover:bg-pink-50",
  linkedin: "text-[#0A66C2] hover:text-blue-900 hover:bg-blue-50",
  behance: "text-[#1769FF] hover:text-blue-800 hover:bg-blue-50",
  youtube: "text-[#FF0000] hover:text-red-700 hover:bg-red-50",
  drive: "text-amber-600 hover:text-amber-800 hover:bg-amber-50",
  github: "text-gray-800 hover:text-black hover:bg-gray-100",
  portfolio: "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
  resume: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
} as const;

interface LinkItem {
  type: keyof typeof LINK_ICONS;
  url: string;
  label: string;
}

/** Collect all unique links from candidate data */
function collectLinks(candidate: Candidate): LinkItem[] {
  const seen = new Set<string>();
  const links: LinkItem[] = [];

  const addLink = (url: string | null | undefined) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    const classified = classifyUrl(url);
    links.push({ ...classified, url });
  };

  // Primary fields first
  addLink(candidate.portfolioUrl);
  if (candidate.instagram) {
    const handle = candidate.instagram.replace("@", "");
    const url = `https://instagram.com/${handle}`;
    if (!seen.has(url)) {
      seen.add(url);
      links.push({ type: "instagram", url, label: `@${handle}` });
    }
  }
  addLink(candidate.linkedinUrl);

  // Resume link — detect storage paths vs external URLs
  if (candidate.resumeUrl) {
    const isStorage =
      candidate.resumeUrl.startsWith("resumes/") ||
      candidate.resumeUrl.startsWith("temp/");
    const url = isStorage
      ? `/api/resume/download/${candidate.id}`
      : candidate.resumeUrl;
    if (!seen.has("resume")) {
      seen.add("resume");
      links.push({
        type: "resume",
        url,
        label: candidate.resumeFileName ?? "Resume",
      });
    }
  }

  // Portfolio links array
  const portfolioLinks = (candidate.portfolioLinks ?? []) as PortfolioLink[];
  for (const pl of portfolioLinks) {
    addLink(pl.url);
  }

  return links;
}

export const CandidateRow = forwardRef<HTMLTableRowElement, CandidateRowProps>(
  function CandidateRow(
    {
      candidate,
      onSelect,
      showRoleColumn = false,
      rolesMap = {},
      isChecked = false,
      onCheckboxToggle,
      isDragOverlay = false,
      dragHandle,
      onWhatsAppClick,
      style,
      className: extraClassName,
    },
    ref,
  ) {
    const handleRowClick = () => onSelect(candidate);

    const roleName = showRoleColumn
      ? (rolesMap[candidate.roleId] ?? "Unknown Role")
      : null;

    const staleCutoff = new Date();
    staleCutoff.setDate(staleCutoff.getDate() - STALE_REVIEW_DAYS);

    const isStale =
      candidate.status === "left_to_review" &&
      new Date(candidate.createdAt) < staleCutoff;

    const isPositive =
      candidate.status === "shortlisted" ||
      candidate.status === "assignment_passed" ||
      candidate.status === "hired";

    const isNegative =
      candidate.status === "rejected" ||
      candidate.status === "not_good" ||
      candidate.status === "assignment_failed";

    const baseRowClass = isStale
      ? "border-b border-gray-100 bg-amber-50/30 hover:bg-amber-100/40 cursor-pointer transition-colors border-l-4 border-l-amber-400"
      : isPositive
        ? "border-b border-gray-100 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer transition-colors border-l-4 border-l-emerald-500"
        : isNegative
          ? "border-b border-gray-100 bg-red-50 hover:bg-red-100/70 cursor-pointer transition-colors border-l-4 border-l-red-400"
          : "border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors";

    const overlayClass = isDragOverlay
      ? "shadow-lg ring-2 ring-blue-400/50 bg-white opacity-95"
      : "";

    const rowClass = [baseRowClass, overlayClass, extraClassName]
      .filter(Boolean)
      .join(" ");

    const links = collectLinks(candidate);

    return (
      <tr ref={ref} style={style} onClick={handleRowClick} className={rowClass}>
        {/* Checkbox + drag handle combined */}
        <td className="w-10 pl-2 pr-1 py-0.5">
          <div className="flex items-center gap-0.5">
            {dragHandle}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                onCheckboxToggle?.(candidate.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label={`Select ${candidate.name}`}
            />
          </div>
        </td>

        {/* Name */}
        <td className="px-2 py-0.5">
          <span className="font-medium text-[13px] text-gray-900 flex items-center gap-1 min-w-0 max-w-44">
            {candidate.isDuplicate && (
              <TriangleAlert
                size={12}
                className="text-amber-500 flex-shrink-0"
              />
            )}
            <span className="truncate">{candidate.name}</span>
          </span>
        </td>

        {/* Role -- only in master view */}
        {showRoleColumn && (
          <td className="px-2 py-0.5 overflow-hidden">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 truncate">
              {roleName}
            </span>
          </td>
        )}

        {/* Email */}
        <td className="hidden lg:table-cell px-2 py-0.5">
          {candidate.email ? (
            <span
              className="text-[13px] text-gray-500 truncate block"
              title={candidate.email}
            >
              {emailName(candidate.email)}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>

        {/* Phone + WhatsApp */}
        <td className="px-2 py-0.5 overflow-hidden">
          {candidate.phone ? (
            <span
              className="inline-flex items-center gap-1 text-[13px] text-gray-600 tabular-nums max-w-full"
              title={candidate.phone}
            >
              <span className="truncate">{candidate.phone}</span>
              {onWhatsAppClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsAppClick(candidate);
                  }}
                  title="Draft WhatsApp message"
                  aria-label={`Send WhatsApp message to ${candidate.name}`}
                  className="shrink-0 rounded p-0.5 text-[#25D366] hover:text-[#128C7E] hover:bg-green-50 transition-colors"
                >
                  <FaWhatsapp size={13} />
                </button>
              )}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>

        {/* Portfolio — primary link as text, secondary as icons */}
        <td className="hidden md:table-cell px-2 py-0.5">
          {links.length > 0 ? (
            <div className="flex items-center gap-1.5 max-w-40 overflow-hidden">
              {(() => {
                const primary =
                  links.find((l) => l.type === "portfolio") ?? links[0];
                const Icon = LINK_ICONS[primary.type];
                const colorClass = LINK_COLORS[primary.type];
                return (
                  <a
                    href={primary.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title={primary.url}
                    className={`inline-flex items-center gap-1 text-[12px] hover:underline truncate min-w-0 ${colorClass}`}
                  >
                    <Icon size={12} className="flex-shrink-0" />
                    <span className="truncate">{primary.label}</span>
                  </a>
                );
              })()}
              {links.length > 1 && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {links
                    .filter((l) => {
                      const primary =
                        links.find((x) => x.type === "portfolio") ?? links[0];
                      return l !== primary;
                    })
                    .slice(0, 2)
                    .map((link) => {
                      const Icon = LINK_ICONS[link.type];
                      const colorClass = LINK_COLORS[link.type];
                      return (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={link.label}
                          className={`inline-flex items-center justify-center rounded p-0.5 opacity-60 hover:opacity-100 hover:scale-110 transition-all ${colorClass}`}
                        >
                          <Icon size={11} />
                        </a>
                      );
                    })}
                  {links.length > 3 && (
                    <span className="text-[10px] text-gray-400">
                      +{links.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>

        {/* Status */}
        <td className="px-2 py-0.5" onClick={(e) => e.stopPropagation()}>
          <StatusBadge candidateId={candidate.id} status={candidate.status} />
        </td>

        {/* Tier */}
        <td
          className="hidden sm:table-cell px-2 py-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <TierBadge candidateId={candidate.id} tier={candidate.tier} />
        </td>
      </tr>
    );
  },
);
