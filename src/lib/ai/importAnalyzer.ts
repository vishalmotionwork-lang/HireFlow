"use server";

import OpenAI from "openai";
import { detectMapping } from "@/lib/import/columnHeuristics";
import { cleanRows } from "@/lib/import/cleanRows";
import type { ColumnMapping } from "@/lib/import/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AIColumnMapping {
  /** Column index -> candidate field mapping */
  mapping: Record<number, string>;
  /** Confidence score 0-1 for the overall mapping */
  confidence: number;
  /** Whether heuristics were sufficient (no AI call needed) */
  usedHeuristics: boolean;
}

export interface AICleanedRow {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  location: string | null;
  experience: string | null;
  resumeUrl: string | null;
  /** Original row index for reference */
  _rowIndex: number;
  /** Issues found and fixed in this row */
  fixes: string[];
}

export interface AIAnalysisResult {
  /** Detected column mapping */
  mapping: Record<number, string>;
  /** Cleaned and normalized rows */
  cleanedRows: AICleanedRow[];
  /** Summary of what was done */
  summary: {
    totalRows: number;
    fixesApplied: number;
    columnsDetected: string[];
    issues: string[];
    /** Whether the fast path (heuristics only) was used */
    usedFastPath: boolean;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum mapped fields for heuristics to be considered confident */
const HEURISTIC_CONFIDENCE_THRESHOLD = 2;

/** AI call timeout in milliseconds */
const AI_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// AI column detection prompt (fallback only)
// ---------------------------------------------------------------------------

const ANALYSIS_PROMPT = `You are an expert data analyst. You receive spreadsheet headers and sample rows from a candidate/applicant tracking sheet.

Your job:
1. DETECT what each column contains — regardless of header names. Look at the actual data.
2. MAP columns to these fields: name, email, phone, instagram, portfolioUrl, linkedinUrl, location, experience, resumeUrl, role
3. IGNORE columns that don't map to any of these (status, ratings, salary, etc.)

Rules for detection:
- "WhatsApp", "Mobile", "Contact", "Ph" → phone
- "Portfolio", "Website", "Behance", "Link", "URL" → portfolioUrl
- "LinkedIn", "Linked In" → linkedinUrl
- "Location", "City", "Country", "Address" → location
- "Experience", "Years", "Work Experience" → experience
- "Resume", "CV", "Resume Link", "CV Link" → resumeUrl
- Look at DATA not just headers. If a column has @gmail.com values, it's email even if header says "Contact"
- If a column has 10-digit numbers, it's phone even if header says "WhatsApp"
- Instagram: look for @handles or instagram.com links
- LinkedIn: look for linkedin.com URLs
- IMPORTANT — Role/Position detection: Any column about what role, position, job, or department the person is applying for MUST be mapped to "role".

Return JSON:
{
  "mapping": { "0": "name", "2": "email", "4": "role", ... }
}

Only map columns to: name, email, phone, instagram, portfolioUrl, linkedinUrl, location, experience, resumeUrl, role. Skip everything else.
Column indices are 0-based.`;

// ---------------------------------------------------------------------------
// Data-based column detection (no AI — scans actual cell values)
// ---------------------------------------------------------------------------

/**
 * Scan sample data to detect column types by content patterns.
 * Catches cases where headers are misleading but data is clear.
 */
function detectColumnsByData(
  headers: string[],
  sampleRows: unknown[][],
  existingMapping: ColumnMapping,
): ColumnMapping {
  const mapping = { ...existingMapping };
  const assignedIndices = new Set(
    Object.values(mapping).filter((v): v is number => v !== undefined),
  );

  for (let col = 0; col < headers.length; col++) {
    if (assignedIndices.has(col)) continue;

    const values = sampleRows
      .slice(0, 10)
      .map((row) => {
        const cell = row[col];
        return cell !== undefined && cell !== null ? String(cell).trim() : "";
      })
      .filter(Boolean);

    if (values.length === 0) continue;

    // Check for email pattern in data
    if (mapping.email === undefined) {
      const emailCount = values.filter((v) =>
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v),
      ).length;
      if (emailCount >= values.length * 0.6) {
        mapping.email = col;
        assignedIndices.add(col);
        continue;
      }
    }

    // Check for phone pattern in data
    if (mapping.phone === undefined) {
      const phoneCount = values.filter((v) => {
        const digits = v.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      }).length;
      const emailLike = values.filter((v) => v.includes("@")).length;
      if (phoneCount >= values.length * 0.6 && emailLike === 0) {
        mapping.phone = col;
        assignedIndices.add(col);
        continue;
      }
    }

    // Check for Instagram handles (need header hint)
    if (mapping.instagram === undefined) {
      const header = headers[col].toLowerCase();
      if (
        header.includes("instagram") ||
        header.includes("insta") ||
        header.includes("ig")
      ) {
        const igCount = values.filter(
          (v) =>
            v.startsWith("@") ||
            /instagram\.com\//i.test(v) ||
            /^[a-zA-Z0-9_.]{2,30}$/.test(v),
        ).length;
        if (igCount >= values.length * 0.4) {
          mapping.instagram = col;
          assignedIndices.add(col);
          continue;
        }
      }
    }

    // Check for LinkedIn URLs
    if (mapping.linkedinUrl === undefined) {
      const linkedinCount = values.filter((v) =>
        /linkedin\.com/i.test(v),
      ).length;
      if (linkedinCount >= values.length * 0.4) {
        mapping.linkedinUrl = col;
        assignedIndices.add(col);
        continue;
      }
    }

    // Check for general URLs (portfolio candidates)
    if (mapping.portfolioUrl === undefined) {
      const urlCount = values.filter(
        (v) =>
          /^https?:\/\//i.test(v) ||
          /\.(com|io|dev|design|art|me|co)\b/i.test(v),
      ).length;
      if (urlCount >= values.length * 0.4) {
        mapping.portfolioUrl = col;
        assignedIndices.add(col);
        continue;
      }
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// Helper: convert ColumnMapping to Record<number, string>
// ---------------------------------------------------------------------------

function columnMappingToRecord(cm: ColumnMapping): Record<number, string> {
  const result: Record<number, string> = {};
  for (const [field, idx] of Object.entries(cm)) {
    if (idx !== undefined) {
      result[idx] = field;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Step 1: Analyze columns — heuristics first, AI fallback
// ---------------------------------------------------------------------------

export async function analyzeSheetColumns(
  headers: string[],
  sampleRows: unknown[][],
): Promise<AIColumnMapping> {
  // Phase 1: Keyword-based heuristics (instant)
  const { mapping: heuristicMapping } = detectMapping(headers);

  // Phase 2: Data-based pattern detection (instant)
  const enrichedMapping = detectColumnsByData(
    headers,
    sampleRows,
    heuristicMapping,
  );

  // Count mapped fields
  const mappedFieldCount = Object.keys(enrichedMapping).length;
  const hasName = enrichedMapping.name !== undefined;

  // If heuristics mapped name + enough other fields, skip AI entirely
  if (hasName && mappedFieldCount >= HEURISTIC_CONFIDENCE_THRESHOLD) {
    return {
      mapping: columnMappingToRecord(enrichedMapping),
      confidence: 0.85,
      usedHeuristics: true,
    };
  }

  // Phase 3: AI fallback (only for ambiguous/unmapped columns)
  try {
    const aiMapping = await callAIColumnDetection(headers, sampleRows);

    // Merge: prefer heuristic mappings, fill gaps with AI
    const merged: Record<number, string> = {};

    // Start with AI mapping
    for (const [idx, field] of Object.entries(aiMapping)) {
      merged[parseInt(idx, 10)] = field;
    }

    // Override with heuristic mappings (higher trust)
    for (const [field, idx] of Object.entries(enrichedMapping)) {
      if (idx !== undefined) {
        // Remove conflicting AI mappings for this field
        for (const [aiIdx, aiField] of Object.entries(merged)) {
          if (aiField === field) {
            delete merged[parseInt(aiIdx, 10)];
          }
        }
        merged[idx] = field;
      }
    }

    return { mapping: merged, confidence: 0.9, usedHeuristics: false };
  } catch {
    // AI failed — fall back to heuristics only
    return {
      mapping: columnMappingToRecord(enrichedMapping),
      confidence: 0.6,
      usedHeuristics: true,
    };
  }
}

// ---------------------------------------------------------------------------
// AI column detection with timeout
// ---------------------------------------------------------------------------

async function callAIColumnDetection(
  headers: string[],
  sampleRows: unknown[][],
): Promise<Record<string, string>> {
  const model = process.env.OPENAI_BASE_URL?.includes("openrouter")
    ? "openai/gpt-4o-mini"
    : "gpt-4o-mini";

  const payload = {
    headers,
    sampleData: sampleRows
      .slice(0, 5) // Reduced from 10 to 5 — faster, still enough signal
      .map((row) =>
        row.map((cell) =>
          cell !== undefined && cell !== null ? String(cell) : "",
        ),
      ),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model,
        temperature: 0,
        max_tokens: 400, // Reduced from 600 — mapping JSON is small
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          {
            role: "user",
            content: `Analyze this sheet:\n${JSON.stringify(payload)}`,
          },
        ],
        response_format: { type: "json_object" },
      },
      { signal: controller.signal },
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return {};

    const parsed = JSON.parse(content) as {
      mapping?: Record<string, string>;
    };

    return parsed.mapping ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Step 2: Clean data using fast heuristics (no AI calls)
// ---------------------------------------------------------------------------

/**
 * Clean import data using deterministic heuristics.
 * Processes thousands of rows instantly — no API calls.
 */
function cleanImportData(
  rawRows: unknown[][],
  mapping: Record<number, string>,
): AICleanedRow[] {
  const fieldIndices: Record<string, number> = {};
  for (const [idx, field] of Object.entries(mapping)) {
    fieldIndices[field] = parseInt(idx, 10);
  }

  const extractedRows = rawRows.map((row, i) => ({
    name: getCellValue(row, fieldIndices.name),
    email: getCellValue(row, fieldIndices.email),
    phone: getCellValue(row, fieldIndices.phone),
    instagram: getCellValue(row, fieldIndices.instagram),
    portfolioUrl: getCellValue(row, fieldIndices.portfolioUrl),
    linkedinUrl: getCellValue(row, fieldIndices.linkedinUrl),
    location: getCellValue(row, fieldIndices.location),
    experience: getCellValue(row, fieldIndices.experience),
    resumeUrl: getCellValue(row, fieldIndices.resumeUrl),
    customFields: {},
    _rowIndex: i,
  }));

  return cleanRows(extractedRows);
}

// ---------------------------------------------------------------------------
// Full pipeline: analyze + clean
// ---------------------------------------------------------------------------

export async function analyzeAndCleanSheet(
  headers: string[],
  rawRows: unknown[][],
): Promise<AIAnalysisResult> {
  // Step 1: Detect columns (heuristics first, AI fallback)
  const { mapping, usedHeuristics } = await analyzeSheetColumns(
    headers,
    rawRows,
  );

  // Step 2: Clean using deterministic heuristics (instant, no AI)
  const cleanedRows = cleanImportData(rawRows, mapping);

  // Build summary
  const totalFixes = cleanedRows.reduce((sum, r) => sum + r.fixes.length, 0);
  const detectedColumns = Object.values(mapping);
  const issues: string[] = [];

  if (!detectedColumns.includes("name")) {
    issues.push("Could not detect a Name column");
  }
  if (!detectedColumns.includes("email")) {
    issues.push("No Email column detected");
  }

  return {
    mapping,
    cleanedRows,
    summary: {
      totalRows: rawRows.length,
      fixesApplied: totalFixes,
      columnsDetected: detectedColumns,
      issues,
      usedFastPath: usedHeuristics,
    },
  };
}

// ---------------------------------------------------------------------------
// Legacy exports (kept for backward compat with StepAIProcessing)
// ---------------------------------------------------------------------------

const CLEANING_PROMPT = `You are a data cleaner for candidate records. Clean and normalize these rows.

Rules:
1. Names: Fix casing (john doe -> John Doe), remove emails/phones from name fields
2. Emails: Lowercase, validate format. If email is in wrong field, move it.
3. Phones: Keep digits only, add country code if missing (assume +91 for 10-digit Indian numbers)
4. Instagram: Remove @ prefix, remove instagram.com/. Just the handle.
5. Portfolio URLs: Ensure https:// prefix if missing
6. LinkedIn URLs: Ensure https:// prefix, normalize to linkedin.com/in/ format if possible
7. Resume/CV URLs: Ensure https:// prefix if missing
8. Location: Normalize city/country names, fix casing
9. Experience: Keep as-is (free text)
10. If a cell contains multiple data types, SPLIT them into correct fields
11. If a field is clearly in the wrong column, move it to the right one

Return JSON:
{
  "rows": [
    {
      "rowIndex": 0,
      "name": "...",
      "email": "...",
      "phone": "...",
      "instagram": "...",
      "portfolioUrl": "...",
      "linkedinUrl": "...",
      "location": "...",
      "experience": "...",
      "resumeUrl": "...",
      "fixes": ["Fixed name casing", "Moved email from name field"]
    }
  ]
}

For null/empty fields, use null. Only include "fixes" array for rows where you changed something.`;

/**
 * @deprecated Use cleanImportData() instead. Kept for backward compatibility.
 * AI-based batch cleaning with timeout — only used if explicitly called.
 */
export async function cleanImportBatch(
  rows: Array<{
    rowIndex: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    instagram: string | null;
    portfolioUrl: string | null;
    linkedinUrl?: string | null;
    location?: string | null;
    experience?: string | null;
    resumeUrl?: string | null;
  }>,
): Promise<AICleanedRow[]> {
  if (rows.length === 0) return [];

  // Use fast heuristic cleaning instead of AI
  const asImportRows = rows.map((r) => ({
    name: r.name,
    email: r.email,
    phone: r.phone,
    instagram: r.instagram,
    portfolioUrl: r.portfolioUrl,
    linkedinUrl: r.linkedinUrl ?? null,
    location: r.location ?? null,
    experience: r.experience ?? null,
    resumeUrl: r.resumeUrl ?? null,
    customFields: {},
    _rowIndex: r.rowIndex,
  }));

  return cleanRows(asImportRows);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCellValue(
  row: unknown[],
  colIndex: number | undefined,
): string | null {
  if (colIndex === undefined || colIndex < 0) return null;
  const cell = row[colIndex];
  if (cell === undefined || cell === null) return null;
  const str = String(cell).trim();
  return str === "" ? null : str;
}
