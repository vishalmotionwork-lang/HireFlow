/**
 * Extract the spreadsheet ID from a Google Sheet URL.
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  // Fallback: if it looks like a raw ID (no slashes, alphanumeric)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) return url.trim();

  return null;
}

/**
 * Extract the GID from a Google Sheet URL hash (#gid=123).
 */
export function extractGid(url: string): string | null {
  const match = url.match(/[#&?]gid=(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch a Google Sheet as CSV text via the public export endpoint.
 * Throws with a user-friendly message if the sheet is not accessible.
 */
export async function fetchSheetCsv(
  sheetId: string,
  gid: string | null,
): Promise<string> {
  const gidParam = gid ? `&gid=${gid}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;

  const response = await fetch(url, {
    headers: { Accept: "text/csv" },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Sheet not found. Check that the URL is correct and the sheet exists.",
      );
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error(
        "Sheet is not publicly accessible. Go to Share > Anyone with the link > Viewer.",
      );
    }
    throw new Error(
      `Failed to fetch sheet (HTTP ${response.status}). Ensure it is shared as public.`,
    );
  }

  const text = await response.text();

  if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
    throw new Error(
      "Sheet is not publicly accessible. Go to Share > Anyone with the link > Viewer.",
    );
  }

  return text;
}
