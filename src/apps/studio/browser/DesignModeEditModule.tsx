/**
 * DesignModeEditModule — floating edit composer anchored near the selected
 * element after a Design Mode pick. Primary submit lands in the chat feed;
 * secondary "Send to agent" seeds the main composer without sending.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Send, X } from "lucide-react";
import type { BrowserGrabPayload, BrowserGrabRect } from "@shared/browserGrab";
import { formatGrabPayloadAsText } from "@shared/browserGrab";
import { api } from "../../../lib/api";

const PANEL_GAP = 10;
const PANEL_WIDTH = 320;
const PANEL_EST_HEIGHT = 200;

export interface DesignModeEditModuleProps {
  payload: BrowserGrabPayload;
  /** Preview stage that hosts the frame — used to clamp the floating panel. */
  containerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  /** Submit into the Studio/chat feed (conversation continues there). */
  onSubmitToFeed: (text: string) => void;
  /** Seed the main composer without sending. */
  onSendToAgent: (text: string) => void;
}

export function buildDesignModeEditMessage(
  payload: BrowserGrabPayload,
  suggestion: string,
  driveAttach?: string | null,
): string {
  const base = formatGrabPayloadAsText(payload).replace(
    /\nPlease update this UI element as requested\.\s*$/,
    "",
  );
  const trimmed = suggestion.trim();
  const request = trimmed
    ? `\n\n### Requested edit\n${trimmed}`
    : "\n\nPlease update this UI element as requested.";
  const attach = driveAttach ? `\n\nAttached screenshot: @drive/${driveAttach}` : "";
  return `${base}${request}${attach}`;
}

async function withScreenshotAttach(
  payload: BrowserGrabPayload,
  suggestion: string,
): Promise<string> {
  if (!payload.screenshot?.dataUrl) {
    return buildDesignModeEditMessage(payload, suggestion);
  }
  try {
    const res = await fetch(payload.screenshot.dataUrl);
    const blob = await res.blob();
    const file = new File([blob], "design-mode-selection.png", { type: "image/png" });
    const entry = await api.uploadDriveFile(file);
    return buildDesignModeEditMessage(payload, suggestion, entry.name);
  } catch {
    return buildDesignModeEditMessage(payload, suggestion);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Place the panel near the selection, preferring below-right, clamped to the stage. */
function placeNearSelection(
  rect: BrowserGrabRect,
  stage: { width: number; height: number },
  panel: { width: number; height: number },
): { top: number; left: number } {
  const pad = 8;
  let top = rect.y + rect.height + PANEL_GAP;
  let left = rect.x;

  if (top + panel.height > stage.height - pad) {
    top = rect.y - panel.height - PANEL_GAP;
  }
  if (top < pad) {
    top = clamp(rect.y, pad, Math.max(pad, stage.height - panel.height - pad));
  }

  if (left + panel.width > stage.width - pad) {
    left = stage.width - panel.width - pad;
  }
  left = clamp(left, pad, Math.max(pad, stage.width - panel.width - pad));
  top = clamp(top, pad, Math.max(pad, stage.height - panel.height - pad));

  return { top, left };
}

export function DesignModeEditModule({
  payload,
  containerRef,
  onDismiss,
  onSubmitToFeed,
  onSendToAgent,
}: DesignModeEditModuleProps) {
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 12, left: 12 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rect = payload.target.rectViewport;

  useEffect(() => {
    setSuggestion("");
    setBusy(false);
    const id = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [payload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  useLayoutEffect(() => {
    const stage = containerRef.current;
    const panel = panelRef.current;
    if (!stage) return;

    const update = () => {
      const stageBox = { width: stage.clientWidth, height: stage.clientHeight };
      const panelBox = {
        width: panel?.offsetWidth || PANEL_WIDTH,
        height: panel?.offsetHeight || PANEL_EST_HEIGHT,
      };
      setPos(placeNearSelection(rect, stageBox, panelBox));
    };

    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(stage);
    if (panel) ro?.observe(panel);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, rect.x, rect.y, rect.width, rect.height, payload]);

  const label = `<${payload.target.tagName}> — ${payload.target.selector}`;
  const snippet =
    payload.target.textSnippet.slice(0, 80) || payload.page.sanitizedUrl || payload.page.title;

  const submitToFeed = async () => {
    const text = suggestion.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const message = await withScreenshotAttach(payload, text);
      onSubmitToFeed(message);
      onDismiss();
    } finally {
      setBusy(false);
    }
  };

  const sendToAgent = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const message = await withScreenshotAttach(payload, suggestion);
      onSendToAgent(message);
      onDismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arco-design-edit-layer" aria-hidden={false}>
      <div
        className="arco-design-edit__highlight"
        style={{
          top: rect.y,
          left: rect.x,
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
        }}
      />
      <div
        ref={panelRef}
        className="arco-design-edit arco-design-edit--float"
        role="dialog"
        aria-label="Design Mode edit"
        style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
      >
        <div className="arco-design-edit__header">
          <div className="arco-design-edit__meta">
            <strong className="arco-design-edit__title">{label}</strong>
            <span className="arco-muted">{snippet}</span>
          </div>
          {payload.screenshot && (
            <img
              className="arco-design-edit__thumb"
              src={payload.screenshot.dataUrl}
              alt="Selected element"
            />
          )}
          <button
            type="button"
            className="arco-btn arco-btn--icon"
            aria-label="Dismiss"
            disabled={busy}
            onClick={onDismiss}
          >
            <X size={14} />
          </button>
        </div>

        <div className="arco-design-edit__composer">
          <textarea
            ref={textareaRef}
            className="arco-design-edit__input"
            rows={3}
            aria-label="Suggest an edit"
            placeholder="Suggest an edit for this element…"
            value={suggestion}
            disabled={busy}
            onChange={(e) => setSuggestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submitToFeed();
              }
            }}
          />
        </div>

        <div className="arco-design-edit__actions">
          <button
            type="button"
            className="arco-btn arco-btn--primary"
            disabled={busy || !suggestion.trim()}
            onClick={() => void submitToFeed()}
          >
            <Send size={13} />
            {busy ? "Sending…" : "Submit"}
          </button>
          <button
            type="button"
            className="arco-btn"
            disabled={busy}
            title="Put selection in the main composer without sending"
            onClick={() => void sendToAgent()}
          >
            Send to agent
          </button>
        </div>
      </div>
    </div>
  );
}
