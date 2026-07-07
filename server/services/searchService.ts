/**
 * Web search — proxied server-side (DuckDuckGo HTML endpoint) to avoid
 * browser CORS limits and keep scraping logic in one place for the agent +
 * Search app.
 */

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

/** Minimal HTML-entity decode + tag strip for scraped titles/snippets. */
function cleanHtmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x?\d+;|&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Scrape DuckDuckGo's no-JS HTML endpoint — the pragmatic keyless option.
 * Result links are redirect-wrapped (/l/?uddg=<encoded-url>), so unwrap
 * before returning. If DDG blocks or changes markup this degrades to an
 * empty list, which callers report as "no results".
 */
export async function webSearch(query: string, max = 10): Promise<WebSearchHit[]> {
  const limit = Math.min(Math.max(max, 1), 20);
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Search request failed with status ${res.status}`);
  const html = await res.text();

  const results: WebSearchHit[] = [];
  const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  const snippets = [...html.matchAll(snippetRe)].map((m) => cleanHtmlText(m[1]));

  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null && results.length < limit) {
    let url = match[1];
    const uddg = /[?&]uddg=([^&]+)/.exec(url);
    if (uddg) url = decodeURIComponent(uddg[1]);
    if (url.startsWith("//")) url = `https:${url}`;
    if (url.includes("duckduckgo.com/y.js")) continue;
    results.push({
      title: cleanHtmlText(match[2]),
      url,
      snippet: snippets[results.length] ?? "",
    });
  }
  return results;
}
