/**
 * Studio project preview frame src — always same-origin via /api/studio/preview
 * so browser/cloud Design Mode can talk to the page (postMessage bridge).
 */
export function studioPreviewFrameSrc(url: string): string {
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

  return `/api/studio/preview?url=${encodeURIComponent(parsed.href)}`;
}
