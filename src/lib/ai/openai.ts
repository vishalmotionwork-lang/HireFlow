import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

export interface ExtractionResult {
  name: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  portfolioLinks: Array<{
    url: string;
    sourceType: string;
    label: string;
  }>;
  socialHandles: Array<{
    platform: string;
    handle: string;
    url: string;
  }>;
  bio: string | null;
  location: string | null;
  followerCount: number | null;
  contentNiche: string | null;
  confidence: Record<string, number>;
}

// Zod schema matching ExtractionResult — used for guaranteed structured output
const PortfolioLinkSchema = z.object({
  url: z.string(),
  sourceType: z.string(),
  label: z.string(),
});

const SocialHandleSchema = z.object({
  platform: z.string(),
  handle: z.string(),
  url: z.string(),
});

const CandidateExtractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  instagram: z.string().nullable(),
  portfolioLinks: z.array(PortfolioLinkSchema),
  socialHandles: z.array(SocialHandleSchema),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  followerCount: z.number().nullable(),
  contentNiche: z.string().nullable(),
  confidence: z.record(z.string(), z.number()),
});

const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting structured profile information from raw text scraped from social media profiles, portfolio sites, and creator pages.

Extract all available profile data. Rules:
- Only include fields you actually find evidence for. Set missing fields to null.
- For confidence scores: 1.0 = explicitly stated, 0.7 = strongly implied, 0.4 = inferred/guessed, 0.0 = not found.
- Normalize phone numbers to include country code if possible.
- Instagram handles should NOT include the @ prefix.
- Deduplicate links — same URL should appear only once.
- portfolioLinks sourceType: one of behance|dribbble|website|youtube|vimeo|other
- socialHandles platform: one of instagram|linkedin|twitter|youtube|tiktok|other`;

export async function extractProfileData(
  rawText: string,
  sourceUrl?: string,
): Promise<ExtractionResult> {
  const context = sourceUrl ? `\nSource URL: ${sourceUrl}` : "";

  const jsonSchema = `Respond with ONLY valid JSON matching this schema:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "instagram": string | null,
  "portfolioLinks": [{ "url": string, "sourceType": string, "label": string }],
  "socialHandles": [{ "platform": string, "handle": string, "url": string }],
  "bio": string | null,
  "location": string | null,
  "followerCount": number | null,
  "contentNiche": string | null,
  "confidence": { [field: string]: number }
}`;

  const model = process.env.OPENAI_BASE_URL?.includes("openrouter")
    ? "openai/gpt-4o-mini"
    : "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `${EXTRACTION_SYSTEM_PROMPT}\n\n${jsonSchema}`,
      },
      { role: "user", content: `${context}\n\nRaw text:\n${rawText}` },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from AI");
  }

  const parsed = CandidateExtractionSchema.parse(JSON.parse(content));

  return {
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
    instagram: parsed.instagram,
    portfolioLinks: parsed.portfolioLinks,
    socialHandles: parsed.socialHandles,
    bio: parsed.bio,
    location: parsed.location,
    followerCount: parsed.followerCount,
    contentNiche: parsed.contentNiche,
    confidence: parsed.confidence,
  };
}
