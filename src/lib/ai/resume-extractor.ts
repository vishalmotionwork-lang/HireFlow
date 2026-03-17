import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

// ── Schema ──────────────────────────────────────────────────────────────────

const ResumeExtractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  linkedin: z.string().nullable(),
  portfolio: z.string().nullable(),
  instagram: z.string().nullable(),
  location: z.string().nullable(),
  skills: z.array(z.string()),
  experience: z.string().nullable(),
  education: z.string().nullable(),
  suggestedRole: z.string().nullable(),
  confidence: z.record(z.string(), z.number()),
});

export type ResumeExtractionResult = z.infer<typeof ResumeExtractionSchema>;

// ── Prompt ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(availableRoles?: string[]): string {
  const roleSection = availableRoles?.length
    ? `\n- suggestedRole: Based on skills and experience, pick the BEST matching role from this list: [${availableRoles.join(", ")}]. Use exact role name. If no clear match, use null.`
    : `\n- suggestedRole: Suggest a job role title that best fits this candidate's skills and experience. Use null if unclear.`;

  return `You are an expert resume/CV parser. Extract structured data from the resume text below.

Rules:
- Extract only what you find explicit evidence for. Use null for missing fields.
- phone: include country code if present, normalize to digits only (e.g., "919876543210")
- linkedin/portfolio/instagram: extract full URLs or handles if present
- skills: up to 10 most relevant technical/professional skills, ordered by prominence
- experience: one-line summary like "5 years in frontend development at startups"
- education: highest degree + institution, e.g., "B.Tech Computer Science, IIT Delhi"${roleSection}
- confidence: score each extracted field 0.0-1.0 (1.0=explicitly stated, 0.7=strongly implied, 0.4=inferred)

Return valid JSON matching this exact schema:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "linkedin": "string or null",
  "portfolio": "string or null",
  "instagram": "string or null",
  "location": "string or null",
  "skills": ["string"],
  "experience": "string or null",
  "education": "string or null",
  "suggestedRole": "string or null",
  "confidence": { "field": 0.0 }
}`;
}

// ── Extractor ───────────────────────────────────────────────────────────────

/**
 * Sends resume text to the AI model and returns structured extraction.
 * Uses OpenRouter-compatible model selection.
 */
export async function extractResumeData(
  resumeText: string,
  availableRoles?: string[],
): Promise<ResumeExtractionResult> {
  if (!resumeText.trim()) {
    throw new Error("Cannot extract data from empty resume text");
  }

  const model = process.env.OPENAI_BASE_URL?.includes("openrouter")
    ? "openai/gpt-4o-mini"
    : "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 1000,
    messages: [
      { role: "system", content: buildSystemPrompt(availableRoles) },
      { role: "user", content: `Resume text:\n${resumeText}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from AI during resume extraction");
  }

  try {
    const parsed = ResumeExtractionSchema.parse(JSON.parse(content));
    return parsed;
  } catch (parseError) {
    const message =
      parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(
      `Failed to parse AI response for resume extraction: ${message}`,
    );
  }
}
