/**
 * Compute a SHA-256 hex hash of arbitrary content.
 * Works in the browser via the Web Crypto API.
 */
export async function hashContent(content: ArrayBuffer | string): Promise<string> {
  const data =
    typeof content === "string"
      ? new TextEncoder().encode(content)
      : new Uint8Array(content);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash a File object using its ArrayBuffer content.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return hashContent(buffer);
}

/**
 * Hash a URL string (for URL-based imports).
 */
export async function hashUrl(url: string): Promise<string> {
  return hashContent(url.trim().toLowerCase());
}
