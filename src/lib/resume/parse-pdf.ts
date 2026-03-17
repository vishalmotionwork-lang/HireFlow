import { extractText } from "unpdf";
import { RESUME_TEXT_TRUNCATE_LENGTH } from "./constants";

export interface PdfParseResult {
  readonly text: string;
  readonly isScanned: boolean;
}

/**
 * Extracts text content from a PDF buffer.
 * Marks the PDF as "scanned" when extracted text is too short to be meaningful.
 */
export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<PdfParseResult> {
  try {
    const { text: rawText } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    const trimmed = String(rawText).trim();
    const isScanned = trimmed.length < 50;
    const text = trimmed.slice(0, RESUME_TEXT_TRUNCATE_LENGTH);

    return { text, isScanned };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse PDF: ${message}`);
  }
}
