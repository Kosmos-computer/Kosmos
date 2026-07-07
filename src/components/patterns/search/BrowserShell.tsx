/**
 * BrowserShell — reusable browser chrome + iframe preview extracted from Studio's
 * Browser tab. Apps like Search use this to browse result URLs in-shell.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { browseFrameSrc } from "./browseFrameSrc";
import { BrowserAddressBar } from "./BrowserAddressBar";

export interface BrowserShellProps {
  url: string;
  onNavigate?: (url: string) => void;
  /** Called when Back is pressed but there is no in-session history. */
  onFallbackBack?: () => void;
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

interface NavState {
  entries: string[];
  index: number;
}

export function BrowserShell({
  url,
  onNavigate,
  onFallbackBack,
  placeholder = "Enter a URL or search term",
  title = "Page preview",
  className = "",
  toolbarExtra,
}: BrowserShellProps) {
  const [draft, setDraft] = useState(url);
  const [frameTick, setFrameTick] = useState(0);
  const [nav, setNav] = useState<NavState>(() =>
    url ? { entries: [url], index: 0 } : { entries: [], index: -1 },
  );

  useEffect(() => setDraft(url), [url]);

  useEffect(() => {
    if (!url) {
      setNav({ entries: [], index: -1 });
      return;
    }
    setNav((current) => {
      if (current.index >= 0 && current.entries[current.index] === url) return current;
      const entries = [...current.entries.slice(0, current.index + 1), url];
      return { entries, index: entries.length - 1 };
    });
  }, [url]);

  const go = useCallback(
    (nextUrl?: string) => {
      const next = normalizeBrowserUrl(nextUrl ?? draft);
      if (!next) return;
      onNavigate?.(next);
      setFrameTick((t) => t + 1);
    },
    [draft, onNavigate],
  );

  const canGoBack = nav.index > 0 || Boolean(onFallbackBack);
  const canGoForward = nav.index >= 0 && nav.index < nav.entries.length - 1;

  const handleBack = useCallback(() => {
    if (nav.index > 0) {
      onNavigate?.(nav.entries[nav.index - 1]!);
      return;
    }
    onFallbackBack?.();
  }, [nav, onFallbackBack, onNavigate]);

  const handleForward = useCallback(() => {
    if (nav.index < nav.entries.length - 1) {
      onNavigate?.(nav.entries[nav.index + 1]!);
    }
  }, [nav, onNavigate]);

  const frameSrc = useMemo(() => browseFrameSrc(url), [url]);
  const secure = !url || url.startsWith("https://");

  return (
    <div className={`arco-browser ${className}`.trim()}>
      <BrowserAddressBar
        value={draft}
        onChange={setDraft}
        onSubmit={() => go()}
        placeholder={placeholder}
        showNav
        onBack={handleBack}
        onForward={handleForward}
        onReload={() => setFrameTick((t) => t + 1)}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        secure={secure}
        openUrl={url}
        toolbarExtra={toolbarExtra}
      />

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
