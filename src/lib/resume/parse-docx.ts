import mammoth from "mammoth";
import { RESUME_TEXT_TRUNCATE_LENGTH } from "./constants";

/**
 * Extracts raw text content from a DOCX buffer.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.trim();
    return rawText.slice(0, RESUME_TEXT_TRUNCATE_LENGTH);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse DOCX: ${message}`);
  }
}
