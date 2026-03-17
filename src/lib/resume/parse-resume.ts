import { extractTextFromPdf } from "./parse-pdf";
import { extractTextFromDocx } from "./parse-docx";
import { ALLOWED_RESUME_MIMES } from "./constants";

export interface ResumeParseResult {
  readonly text: string;
  readonly isScanned: boolean;
}

/**
 * Detects file type by MIME and dispatches to the correct parser.
 * Returns extracted text and a flag indicating if the source was a scanned PDF.
 */
export async function extractTextFromResume(
  buffer: Buffer,
  mimeType: string,
): Promise<ResumeParseResult> {
  const PDF_MIME = ALLOWED_RESUME_MIMES[0];
  const DOCX_MIME = ALLOWED_RESUME_MIMES[1];

  if (mimeType === PDF_MIME) {
    return extractTextFromPdf(buffer);
  }

  if (mimeType === DOCX_MIME) {
    const text = await extractTextFromDocx(buffer);
    return { text, isScanned: false };
  }

  throw new Error(
    `Unsupported file type: "${mimeType}". Accepted types: PDF, DOCX.`,
  );
}
