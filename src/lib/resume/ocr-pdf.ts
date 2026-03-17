import { extractText } from "unpdf";
import { RESUME_TEXT_TRUNCATE_LENGTH } from "./constants";

export interface OcrResult {
  readonly text: string;
  readonly pageCount: number;
  readonly isPartial: boolean;
}

/**
 * Attempts to extract text from a scanned/image-based PDF.
 *
 * Current implementation: re-runs unpdf extraction and returns whatever text
 * is available. Truly empty scanned PDFs will return an empty string — the
 * caller (AI extractor) handles incomplete text gracefully.
 *
 * Future enhancement: integrate an external OCR service (Google Cloud Vision,
 * AWS Textract) for proper image-to-text conversion in serverless environments.
 */
export async function ocrPdfPages(buffer: Buffer): Promise<OcrResult> {
  try {
    const { text: rawText, totalPages } = await extractText(
      new Uint8Array(buffer),
      { mergePages: true },
    );
    const trimmed = String(rawText).trim();
    const text = trimmed.slice(0, RESUME_TEXT_TRUNCATE_LENGTH);
    const isPartial = trimmed.length < 50;

    return { text, pageCount: totalPages ?? 0, isPartial };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OCR PDF extraction failed: ${message}`);
  }
}
