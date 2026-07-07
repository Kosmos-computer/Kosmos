/**
 * Map a user-entered URL to the iframe src BrowserShell should load.
 * External pages go through the server browse proxy; localhost stays direct.
 */
export function browseFrameSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return trimmed;
  }

  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local");

  if (isLocal) return parsed.href;
  return `/api/search/browse?url=${encodeURIComponent(parsed.href)}`;
}
