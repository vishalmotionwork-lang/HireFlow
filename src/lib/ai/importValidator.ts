"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export interface ImportSuggestion {
  rowIndex: number;
  field: string;
  issue: string; // e.g. "email_in_name", "swap_columns", "fix_casing"
  suggestion: string; // human readable
  fixedValue?: string; // auto-corrected value if applicable
}

interface ImportRowInput {
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
}

const SYSTEM_PROMPT = `You are a data quality checker for candidate import data. Analyze the rows and find issues:
1. Email addresses in wrong fields (e.g., email in name column)
2. Phone numbers in wrong fields
3. Swapped columns (name contains email, email contains name)
4. Names that need casing fix (all lowercase/uppercase)
5. Invalid email formats
6. Instagram handles with wrong format

Return a JSON object: { "suggestions": [...] }
Each suggestion: { "rowIndex": number, "field": string, "issue": string, "suggestion": string, "fixedValue": string|null }
Only return rows with issues. If no issues found, return { "suggestions": [] }`;

/** AI validation timeout — returns empty suggestions if exceeded */
const AI_VALIDATION_TIMEOUT_MS = 6000;

/**
 * Validate import data using AI. Batches all rows into a single API call
 * for speed. Returns suggestions per row.
 *
 * Only sends first 50 rows to keep token usage and latency low.
 * Has a 6s timeout — returns empty on timeout (non-blocking).
 */
export async function validateImportWithAI(
  rows: ReadonlyArray<ImportRowInput>,
): Promise<ImportSuggestion[]> {
  if (rows.length === 0) return [];

  // Limit to first 50 rows (reduced from 100 for speed)
  const batch = rows.slice(0, 50);

  const rowsPayload = batch.map((r) => ({
    rowIndex: r.rowIndex,
    name: r.name,
    email: r.email,
    phone: r.phone,
    instagram: r.instagram,
    portfolioUrl: r.portfolioUrl,
  }));

  const model = process.env.OPENAI_BASE_URL?.includes("openrouter")
    ? "openai/gpt-4o-mini"
    : "gpt-4o-mini";

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    AI_VALIDATION_TIMEOUT_MS,
  );

  try {
    const completion = await openai.chat.completions.create(
      {
        model,
        temperature: 0.1,
        max_tokens: 1000, // Reduced from 1500
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Check these ${batch.length} rows for data quality issues:\n${JSON.stringify(rowsPayload)}`,
          },
        ],
        response_format: { type: "json_object" },
      },
      { signal: controller.signal },
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed: unknown = JSON.parse(content);

    // Validate the response shape defensively
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).suggestions)
    ) {
      return [];
    }

    const raw = (parsed as { suggestions: unknown[] }).suggestions;

    // Filter and type-check each suggestion
    const suggestions: ImportSuggestion[] = raw
      .filter(
        (s): s is Record<string, unknown> =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as Record<string, unknown>).rowIndex === "number" &&
          typeof (s as Record<string, unknown>).field === "string" &&
          typeof (s as Record<string, unknown>).issue === "string" &&
          typeof (s as Record<string, unknown>).suggestion === "string",
      )
      .map((s) => ({
        rowIndex: s.rowIndex as number,
        field: s.field as string,
        issue: s.issue as string,
        suggestion: s.suggestion as string,
        fixedValue: typeof s.fixedValue === "string" ? s.fixedValue : undefined,
      }));

    return suggestions;
  } catch {
    // Timeout or API failure — silently return no suggestions
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
