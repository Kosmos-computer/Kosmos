/**
 * BrowserShell — reusable browser chrome + preview. Studio can enable Design
 * Mode: Electron webview on desktop, same-origin project preview proxy in
 * browser/cloud (not the open web).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Globe, MousePointer2 } from "lucide-react";
import type { BrowserGrabPayload } from "@shared/browserGrab";
import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
import { primeComposer } from "../../../apps/chat/composerBus";
import { BrowserAddressBar } from "./BrowserAddressBar";
import { DesignModeEditModule } from "../../../apps/studio/browser/DesignModeEditModule";
import { StudioBrowserView } from "../../../apps/studio/browser/StudioBrowserView";

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
  /** When true, show Design Mode toggle (Studio — desktop webview or browser/cloud preview proxy). */
  enableDesignMode?: boolean;
  /** Preferred over primeComposer when Studio owns the draft. */
  onInsertDraft?: (text: string) => void;
  /** Submit Design Mode edit into the active chat feed. */
  onSubmitMessage?: (text: string) => void;
}

/** "5173" → localhost URL; bare hosts get http://; local:5173 → localhost */
export function normalizeBrowserUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) return `http://localhost:${t}`;
  // Common shorthand people type instead of localhost:5173
  const localPort = /^local:(\d+)$/i.exec(t);
  if (localPort) return `http://localhost:${localPort[1]}`;
  if (/^localhost:\d+$/i.test(t)) return `http://${t}`;
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
  enableDesignMode = false,
  onInsertDraft,
  onSubmitMessage,
}: BrowserShellProps) {
  const [draft, setDraft] = useState(url);
  const [frameTick, setFrameTick] = useState(0);
  const [nav, setNav] = useState<NavState>(() =>
    url ? { entries: [url], index: 0 } : { entries: [], index: -1 },
  );
  const [designMode, setDesignMode] = useState(false);
  const [pendingGrab, setPendingGrab] = useState<BrowserGrabPayload | null>(null);
  const [grabError, setGrabError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const showDesignMode = enableDesignMode;

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

  useEffect(() => {
    if (!url) setDesignMode(false);
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

  const secure = !url || url.startsWith("https://");

  const onGrab = useCallback((payload: BrowserGrabPayload) => {
    setPendingGrab(payload);
    setDesignMode(false);
    setGrabError(null);
  }, []);

  const seedComposer = useCallback(
    (text: string) => {
      if (onInsertDraft) onInsertDraft(text);
      else primeComposer({ text, submit: false });
    },
    [onInsertDraft],
  );

  const submitToFeed = useCallback(
    (text: string) => {
      if (onSubmitMessage) onSubmitMessage(text);
      else primeComposer({ text, submit: true });
    },
    [onSubmitMessage],
  );

  const designModeExtra = showDesignMode ? (
    <button
      type="button"
      className={`arco-btn${designMode ? " arco-btn--primary" : ""}`}
      disabled={!url}
      aria-pressed={designMode}
      title="Design Mode — click an element to suggest an edit"
      onClick={() => {
        setGrabError(null);
        setDesignMode((v) => !v);
      }}
    >
      <MousePointer2 size={13} />
      {designMode ? "Picking…" : "Design Mode"}
    </button>
  ) : null;

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
        toolbarExtra={
          <>
            {designModeExtra}
            {toolbarExtra}
          </>
        }
      />

      {grabError && (
        <div className="arco-browser__design-banner arco-browser__design-banner--error" role="alert">
          {grabError}
        </div>
      )}

      <div className="arco-browser__stage" ref={stageRef}>
        {url ? (
          <StudioBrowserView
            url={url}
            frameTick={frameTick}
            title={title}
            designMode={designMode}
            onGrab={onGrab}
            onGrabError={(message) => {
              setGrabError(message);
              setDesignMode(false);
            }}
          />
        ) : (
          <div className="arco-empty arco-browser__empty">
            <Globe size={18} />
            <span>
              <T k={I18nKey.COMPONENTS$PATTERNS_ENTER_A_URL_ABOVE_TO_PREVIEW_A_PAGE} />
            </span>
          </div>
        )}

        {pendingGrab && (
          <DesignModeEditModule
            payload={pendingGrab}
            containerRef={stageRef}
            onDismiss={() => setPendingGrab(null)}
            onSubmitToFeed={submitToFeed}
            onSendToAgent={seedComposer}
          />
        )}
      </div>
    </div>
  );
}
