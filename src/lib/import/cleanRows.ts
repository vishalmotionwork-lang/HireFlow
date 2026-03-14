/**
 * Deterministic data cleaning for import rows.
 * Replaces AI cleaning for 90%+ of cases — instant, no API calls.
 *
 * Handles: name casing, email normalization, phone cleanup,
 * Instagram handle extraction, URL prefix normalization,
 * LinkedIn URL normalization, and cross-field data rescue
 * (e.g., email found in name field).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CleanedImportRow {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  experience: string | null;
  resumeUrl: string | null;
  _rowIndex: number;
  fixes: string[];
}

interface RawImportRow {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  experience: string | null;
  resumeUrl: string | null;
  _rowIndex: number;
}

// ---------------------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d[\d\s\-().]{6,}\d)/;
const URL_RE = /https?:\/\/[^\s]+/i;
const INSTAGRAM_URL_RE = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i;
const LINKEDIN_URL_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i;

// ---------------------------------------------------------------------------
// Individual field cleaners (pure functions)
// ---------------------------------------------------------------------------

function fixNameCasing(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return trimmed;

  // Already mixed case — leave it
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  if (hasUpper && hasLower) return trimmed;

  // All upper or all lower — title case it
  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  if (digits.length >= 7) return digits;

  return null;
}

function normalizeInstagram(raw: string): string {
  // Extract from URL
  const urlMatch = raw.match(INSTAGRAM_URL_RE);
  if (urlMatch) return urlMatch[1];

  // Strip @ prefix
  const trimmed = raw.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function ensureHttps(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeLinkedIn(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return trimmed;

  // Already a full URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Partial linkedin.com URL
  if (/linkedin\.com/i.test(trimmed)) return `https://${trimmed}`;

  // Just a slug — wrap it
  const match = trimmed.match(LINKEDIN_URL_RE);
  if (match) return `https://linkedin.com/in/${match[1]}`;

  return `https://linkedin.com/in/${trimmed}`;
}

function normalizeLocation(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return trimmed;

  // Title case city/country names if all lower or all upper
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  if (hasUpper && hasLower) return trimmed;

  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Cross-field data rescue
// ---------------------------------------------------------------------------

interface FieldExtractions {
  email: string | null;
  phone: string | null;
  remainingText: string;
}

/**
 * Scan a text value for emails/phones that might be in the wrong field.
 * Returns extracted values and the remaining text after removal.
 */
function extractMisplacedData(text: string): FieldExtractions {
  let remaining = text;
  let email: string | null = null;
  let phone: string | null = null;

  const emailMatch = remaining.match(EMAIL_RE);
  if (emailMatch) {
    email = emailMatch[0];
    remaining = remaining.replace(emailMatch[0], "").trim();
    // Clean up separators left behind
    remaining = remaining.replace(/^[\/|,;\s-]+|[\/|,;\s-]+$/g, "").trim();
  }

  const phoneMatch = remaining.match(PHONE_RE);
  if (phoneMatch) {
    phone = phoneMatch[0];
    remaining = remaining.replace(phoneMatch[0], "").trim();
    remaining = remaining.replace(/^[\/|,;\s-]+|[\/|,;\s-]+$/g, "").trim();
  }

  return { email, phone, remainingText: remaining };
}

// ---------------------------------------------------------------------------
// Main cleaning function
// ---------------------------------------------------------------------------

/**
 * Clean a single import row using deterministic heuristics.
 * Returns a new cleaned row (never mutates the input).
 */
function cleanSingleRow(row: RawImportRow): CleanedImportRow {
  const fixes: string[] = [];

  let name = row.name;
  let email = row.email;
  let phone = row.phone;
  let instagram = row.instagram;
  let portfolioUrl = row.portfolioUrl;
  let linkedinUrl = row.linkedinUrl;
  let location = row.location;
  const experience = row.experience;
  let resumeUrl = row.resumeUrl;

  // 1. Cross-field rescue: check if name field contains email/phone
  if (name) {
    const extracted = extractMisplacedData(name);
    if (extracted.email && !email) {
      email = extracted.email;
      name = extracted.remainingText || name;
      fixes.push("Extracted email from name field");
    }
    if (extracted.phone && !phone) {
      phone = extracted.phone;
      name = extracted.remainingText || name;
      fixes.push("Extracted phone from name field");
    }
  }

  // 2. Name casing
  if (name) {
    const fixed = fixNameCasing(name);
    if (fixed !== name) {
      name = fixed;
      fixes.push("Fixed name casing");
    }
  }

  // 3. Email normalization
  if (email) {
    const normalized = normalizeEmail(email);
    if (normalized !== email) {
      email = normalized;
      fixes.push("Normalized email");
    }
  }

  // 4. Phone normalization
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized !== phone) {
      phone = normalized;
      fixes.push("Normalized phone number");
    }
  }

  // 5. Instagram handle
  if (instagram) {
    const normalized = normalizeInstagram(instagram);
    if (normalized !== instagram) {
      instagram = normalized;
      fixes.push("Cleaned Instagram handle");
    }
  }

  // 6. Portfolio URL
  if (portfolioUrl) {
    const normalized = ensureHttps(portfolioUrl);
    if (normalized !== portfolioUrl) {
      portfolioUrl = normalized;
      fixes.push("Added https:// to portfolio URL");
    }
  }

  // 7. LinkedIn URL
  if (linkedinUrl) {
    const normalized = normalizeLinkedIn(linkedinUrl);
    if (normalized !== linkedinUrl) {
      linkedinUrl = normalized;
      fixes.push("Normalized LinkedIn URL");
    }
  }

  // 8. Location casing
  if (location) {
    const normalized = normalizeLocation(location);
    if (normalized !== location) {
      location = normalized;
      fixes.push("Fixed location casing");
    }
  }

  // 9. Resume URL
  if (resumeUrl) {
    const normalized = ensureHttps(resumeUrl);
    if (normalized !== resumeUrl) {
      resumeUrl = normalized;
      fixes.push("Added https:// to resume URL");
    }
  }

  return {
    name,
    email,
    phone,
    instagram,
    portfolioUrl,
    linkedinUrl,
    location,
    experience,
    resumeUrl,
    _rowIndex: row._rowIndex,
    fixes,
  };
}

/**
 * Clean all import rows using fast deterministic heuristics.
 * No AI calls — processes thousands of rows instantly.
 */
export function cleanRows(rows: ReadonlyArray<RawImportRow>): CleanedImportRow[] {
  return rows.map(cleanSingleRow);
}
