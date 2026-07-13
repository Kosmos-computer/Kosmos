/**
 * Renders HTML email in a sandboxed iframe (layouts + images, no scripts).
 */
import { useEffect, useRef, useState } from "react";

const FRAME_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: #1a1a1a;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    word-break: break-word;
  }
  img, video { max-width: 100%; height: auto; }
  table { max-width: 100% !important; }
  a { color: #1a73e8; }
`;

function buildSrcDoc(html: string): string {
  const hasHtmlTag = /<html[\s>]/i.test(html);
  if (hasHtmlTag) {
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `<style>${FRAME_CSS}</style></head>`);
    }
    return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head><style>${FRAME_CSS}</style></head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${FRAME_CSS}</style></head><body>${html}</body></html>`;
}

export function EmailHtmlBody({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        const next = Math.max(
          doc?.documentElement?.scrollHeight ?? 0,
          doc?.body?.scrollHeight ?? 0,
          160,
        );
        setHeight(Math.min(next + 8, 4000));
      } catch {
        // cross-origin shouldn't happen with srcDoc
      }
    };

    iframe.addEventListener("load", resize);
    // Images loading later can change height
    const timer = window.setInterval(resize, 500);
    const stop = window.setTimeout(() => window.clearInterval(timer), 8000);
    return () => {
      iframe.removeEventListener("load", resize);
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className="arco-email__html-frame"
      title="Email message"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={buildSrcDoc(html)}
      style={{ height }}
    />
  );
}
