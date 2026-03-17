import { supabaseAdmin } from "./admin";
import { RESUME_BUCKET } from "../resume/constants";

/**
 * Ensures the "resumes" storage bucket exists.
 * Creates it if missing; silently ignores "already exists" errors.
 */
export async function ensureBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(RESUME_BUCKET, {
    public: false,
  });

  if (error && !error.message.includes("already exists")) {
    throw new Error(`Failed to create bucket "${RESUME_BUCKET}": ${error.message}`);
  }
}

/**
 * Uploads a resume file to the storage bucket.
 * @returns The storage path of the uploaded file.
 */
export async function uploadResume(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Failed to upload resume at "${path}": ${error.message}`);
  }

  return path;
}

/**
 * Generates a time-limited signed URL for a stored resume.
 * @param expiresIn Seconds until URL expires (default 3600).
 */
export async function getSignedResumeUrl(
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create signed URL for "${path}": ${error?.message ?? "No URL returned"}`,
    );
  }

  return data.signedUrl;
}

/**
 * Deletes a resume file from the storage bucket.
 */
export async function deleteResume(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete resume at "${path}": ${error.message}`);
  }
}

/**
 * Moves a resume file from one path to another.
 * Uses download → upload → delete since Supabase lacks native move.
 */
export async function moveResume(
  fromPath: string,
  toPath: string,
): Promise<void> {
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .download(fromPath);

  if (downloadError || !fileData) {
    throw new Error(
      `Failed to download resume from "${fromPath}": ${downloadError?.message ?? "No data returned"}`,
    );
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .upload(toPath, buffer, {
      contentType: fileData.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload resume to "${toPath}" during move: ${uploadError.message}`,
    );
  }

  const { error: deleteError } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .remove([fromPath]);

  if (deleteError) {
    throw new Error(
      `Move partially completed: file copied to "${toPath}" but failed to delete original at "${fromPath}": ${deleteError.message}`,
    );
  }
}
