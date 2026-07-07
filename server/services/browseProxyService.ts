/**
 * In-shell browse proxy — fetches public HTML pages server-side so Search
 * (and Studio) can embed them despite X-Frame-Options / frame-ancestors blocks.
 * Localhost URLs are rejected here; BrowserShell loads those directly.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const PROXY_NAV_SCRIPT = `<script>(function(){var P="/api/search/browse?url=";function px(h){try{var u=new URL(h,document.baseURI);if(u.protocol!=="http:"&&u.protocol!=="https:")return h;var host=u.hostname;if(host==="localhost"||host==="127.0.0.1"||host==="[::1]"||host.endsWith(".local"))return u.href;return P+encodeURIComponent(u.href);}catch(e){return h;}}document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a)return;var href=a.getAttribute("href");if(!href||href.charAt(0)==="#"||href.indexOf("javascript:")===0)return;e.preventDefault();window.location.href=px(a.href);},true);}())</script>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return true;
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "metadata.google.internal" || host === "169.254.169.254") return true;

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;

  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((part) => part > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function parseBrowseTarget(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Missing url");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("This URL cannot be browsed through the proxy");
  }
  return parsed;
}

function stripFrameBlockingMeta(html: string): string {
  return html
    .replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");
}

function injectBrowseHelpers(html: string, pageUrl: string): string {
  const cleaned = stripFrameBlockingMeta(html);
  const baseTag = `<base href="${escapeHtml(pageUrl)}">`;
  const injection = `${baseTag}${PROXY_NAV_SCRIPT}`;

  if (/<head\b[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<head\b[^>]*>/i, (head) => `${head}${injection}`);
  }
  if (/<html\b[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<html\b[^>]*>/i, (html) => `${html}<head>${injection}</head>`);
  }
  return `<!DOCTYPE html><html><head>${injection}</head><body>${cleaned}</body></html>`;
}

export function browseErrorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Browse error</title></head><body style="font:14px/1.5 system-ui,sans-serif;padding:24px;color:#444"><h1 style="font-size:16px;margin:0 0 8px">Could not load page</h1><p style="margin:0">${escapeHtml(message)}</p></body></html>`;
}

export async function fetchBrowsePage(rawUrl: string): Promise<{ html: string; contentType: string }> {
  const target = parseBrowseTarget(rawUrl);
  const res = await fetch(target.href, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`Page request failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "text/html";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Only HTML pages can be previewed in-shell");
  }

  const html = injectBrowseHelpers(await res.text(), res.url || target.href);
  return { html, contentType: "text/html; charset=utf-8" };
}

/** True when BrowserShell should load a URL through /api/search/browse. */
export function shouldProxyBrowseUrl(url: string): boolean {
  try {
    parseBrowseTarget(url);
    return true;
  } catch {
    return false;
  }
}

export function browseFrameSrc(url: string): string {
  if (!url.trim()) return "";
  if (!shouldProxyBrowseUrl(url)) return url;
  return `/api/search/browse?url=${encodeURIComponent(url)}`;
}
