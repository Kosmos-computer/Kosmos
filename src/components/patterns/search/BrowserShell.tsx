/**
 * BrowserShell — reusable URL bar + iframe preview extracted from Studio's
 * Browser tab. Apps like Search use this to browse result URLs in-shell.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink, Globe, RotateCw } from "lucide-react";
import { Button } from "../../ui";
import { browseFrameSrc } from "./browseFrameSrc";

export interface BrowserShellProps {
  url: string;
  onNavigate?: (url: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  /** Extra controls rendered after the URL bar actions. */
  toolbarExtra?: ReactNode;
}

/** "5173" → localhost URL; bare hosts get http:// */
export function normalizeBrowserUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) return `http://localhost:${t}`;
  if (!/^https?:\/\//.test(t)) return `http://${t}`;
  return t;
}

export function BrowserShell({
  url,
  onNavigate,
  placeholder = "Enter a URL or search term",
  title = "Page preview",
  className = "",
  toolbarExtra,
}: BrowserShellProps) {
  const [draft, setDraft] = useState(url);
  const [frameTick, setFrameTick] = useState(0);

  useEffect(() => setDraft(url), [url]);

  const go = useCallback(
    (nextUrl?: string) => {
      const next = normalizeBrowserUrl(nextUrl ?? draft);
      onNavigate?.(next);
      setFrameTick((t) => t + 1);
    },
    [draft, onNavigate],
  );

  const frameSrc = useMemo(() => browseFrameSrc(url), [url]);

  return (
    <div className={`arco-browser ${className}`.trim()}>
      <div className="arco-browser__urlbar">
        <Globe size={13} className="arco-icon--tertiary" aria-hidden />
        <input
          className="arco-browser__urlinput"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          aria-label="Address bar"
        />
        <Button variant="ghost" className="arco-btn--icon" onClick={() => setFrameTick((t) => t + 1)} aria-label="Reload page">
          <RotateCw size={12} />
        </Button>
        <Button
          variant="ghost"
          className="arco-btn--icon"
          disabled={!url}
          onClick={() => window.open(url, "_blank", "noopener")}
          aria-label="Open in new tab"
        >
          <ExternalLink size={12} />
        </Button>
        {toolbarExtra}
      </div>

      {url ? (
        <iframe
          key={frameTick}
          className="arco-browser__frame"
          src={frameSrc}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <div className="arco-empty arco-browser__empty">
          <Globe size={18} />
          <span>Enter a URL above to preview a page.</span>
        </div>
      )}
    </div>
  );
}
