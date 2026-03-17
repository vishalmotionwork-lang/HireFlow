export const RESUME_BUCKET = "resumes";
export const RESUME_TEMP_PREFIX = "temp";
export const MAX_RESUME_SIZE_MB = 10;
export const MAX_RESUME_SIZE_BYTES = MAX_RESUME_SIZE_MB * 1024 * 1024;
export const ALLOWED_RESUME_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const RESUME_TEXT_TRUNCATE_LENGTH = 15000;
