/**
 * StudioBrowserView — project preview host for Design Mode.
 *
 * Desktop: Electron <webview> + main-process grab IPC.
 * Browser/cloud: same-origin iframe via /api/studio/preview; picker is injected
 * directly into contentDocument (no postMessage ready-race).
 */
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import type { BrowserGrabPayload } from "@shared/browserGrab";
import { getPlatformBridge } from "@arco/platform-bridge";
import { isArcoDesktop } from "../../../lib/desktopBridge";
import { grabAwaitClickScript, grabTeardownScript } from "./grabGuestScript";
import { studioPreviewFrameSrc } from "./studioPreviewSrc";

/** Minimal Electron webview element surface we rely on. */
interface ElectronWebviewElement extends HTMLElement {
  src: string;
  executeJavaScript: <T>(code: string, userGesture?: boolean) => Promise<T>;
  capturePage: (rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<{ toDataURL: () => string; getSize: () => { width: number; height: number } }>;
  getWebContentsId?: () => number;
  addEventListener: HTMLElement["addEventListener"];
  removeEventListener: HTMLElement["removeEventListener"];
}

export interface StudioBrowserViewProps {
  url: string;
  frameTick: number;
  title?: string;
  designMode: boolean;
  onGrab: (payload: BrowserGrabPayload) => void;
  onGrabError?: (message: string) => void;
}

async function cropViaWebview(
  webview: ElectronWebviewElement,
  rect: { x: number; y: number; width: number; height: number },
): Promise<BrowserGrabPayload["screenshot"]> {
  try {
    await webview.executeJavaScript(grabTeardownScript()).catch(() => undefined);
    const pad = 4;
    const x = Math.max(0, Math.floor(rect.x - pad));
    const y = Math.max(0, Math.floor(rect.y - pad));
    const width = Math.max(1, Math.ceil(rect.width + pad * 2));
    const height = Math.max(1, Math.ceil(rect.height + pad * 2));
    const image = await webview.capturePage({ x, y, width, height });
    const size = image.getSize();
    return {
      mimeType: "image/png",
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
    };
  } catch {
    return null;
  }
}

/** Run an expression in a same-origin iframe; supports returned Promises. */
function runInIframe<T>(iframe: HTMLIFrameElement, source: string): Promise<T> {
  const win = iframe.contentWindow;
  if (!win || !iframe.contentDocument) {
    return Promise.reject(
      new Error(
        "Preview frame is not accessible. Use http://localhost:5173 (or just 5173) so Kosmos can proxy it.",
      ),
    );
  }

  // Execute in the guest realm (avoids Window.eval typing; same-origin only).
  try {
    const guestFunction = (win as unknown as { Function: typeof Function }).Function;
    const result = guestFunction(`"use strict"; return (${source});`)() as T | Promise<T>;
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

function previewLooksLikeError(doc: Document | null): string | null {
  if (!doc) return "Preview did not load.";
  const title = (doc.title || "").toLowerCase();
  const bodyText = (doc.body?.innerText || "").slice(0, 400);
  if (title.includes("preview error") || title.includes("browse error")) {
    return bodyText.split("\n").find((l) => l.trim()) || "Preview failed to load.";
  }
  if (bodyText.includes("Authentication required") || bodyText.includes("unauthenticated")) {
    return "Preview needs you to be signed in. Refresh Kosmos and try again.";
  }
  if (bodyText.includes("Could not load project preview")) {
    return bodyText.split("\n").find((l) => l.trim()) || "Preview failed to load.";
  }
  return null;
}

export function StudioBrowserView({
  url,
  frameTick,
  title = "Page preview",
  designMode,
  onGrab,
  onGrabError,
}: StudioBrowserViewProps) {
  const desktop = isArcoDesktop();
  const webviewRef = useRef<ElectronWebviewElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [webContentsId, setWebContentsId] = useState<number | null>(null);
  const grabGen = useRef(0);

  const frameSrc = studioPreviewFrameSrc(url);

  useEffect(() => {
    setIframeLoaded(false);
  }, [frameSrc, frameTick]);

  // Desktop webview ready + webContents id
  useEffect(() => {
    if (!desktop) return;
    const el = webviewRef.current;
    if (!el) return;
    const onDom = () => {
      setReady(true);
      try {
        const id = el.getWebContentsId?.();
        setWebContentsId(typeof id === "number" ? id : null);
      } catch {
        setWebContentsId(null);
      }
    };
    el.addEventListener("dom-ready", onDom);
    return () => el.removeEventListener("dom-ready", onDom);
  }, [desktop, url, frameTick]);

  // Browser/cloud: inject picker into same-origin preview when Design Mode is on
  useEffect(() => {
    if (desktop || !designMode || !iframeLoaded) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const gen = ++grabGen.current;
    let cancelled = false;

    void (async () => {
      try {
        // Wait a beat for proxied HTML + Vite client to settle.
        await new Promise((r) => setTimeout(r, 100));
        if (cancelled || gen !== grabGen.current) return;

        const errMsg = previewLooksLikeError(iframe.contentDocument);
        if (errMsg) {
          onGrabError?.(errMsg);
          return;
        }

        const payload = await runInIframe<BrowserGrabPayload | null>(
          iframe,
          grabAwaitClickScript(),
        );
        if (cancelled || gen !== grabGen.current || !payload) return;
        onGrab(payload);
      } catch (err) {
        if (cancelled || gen !== grabGen.current) return;
        const message = err instanceof Error ? err.message : String(err);
        onGrabError?.(
          /fetch|Failed|ECONNREFUSED|network/i.test(message)
            ? `Could not reach the project preview (${message}). Is something listening on that port?`
            : message,
        );
      }
    })();

    return () => {
      cancelled = true;
      const frame = iframeRef.current;
      if (frame?.contentDocument) {
        void runInIframe(frame, grabTeardownScript()).catch(() => undefined);
      }
    };
  }, [desktop, designMode, iframeLoaded, url, frameTick, onGrab, onGrabError]);

  // Desktop Design Mode grab loop
  useEffect(() => {
    if (!desktop || !designMode || !ready) return;
    const webview = webviewRef.current;
    if (!webview) return;

    const gen = ++grabGen.current;
    let cancelled = false;
    const grabApi = getPlatformBridge().browserGrab;

    void (async () => {
      try {
        let payload: BrowserGrabPayload | null = null;
        let screenshot: BrowserGrabPayload["screenshot"] = null;

        if (grabApi && webContentsId != null) {
          payload = (await grabApi.awaitGrab(webContentsId)) as BrowserGrabPayload | null;
          if (cancelled || gen !== grabGen.current || !payload) return;
          try {
            screenshot = await grabApi.captureCrop(webContentsId, payload.target.rectViewport);
          } catch {
            screenshot = await cropViaWebview(webview, payload.target.rectViewport);
          }
        } else {
          payload = await webview.executeJavaScript<BrowserGrabPayload | null>(
            grabAwaitClickScript(),
            true,
          );
          if (cancelled || gen !== grabGen.current || !payload) return;
          screenshot = await cropViaWebview(webview, payload.target.rectViewport);
        }

        if (cancelled || gen !== grabGen.current || !payload) return;
        onGrab({ ...payload, screenshot });
      } catch (err) {
        if (cancelled || gen !== grabGen.current) return;
        onGrabError?.(err instanceof Error ? err.message : "Design Mode grab failed");
      }
    })();

    return () => {
      cancelled = true;
      if (grabApi && webContentsId != null) {
        void grabApi.setGrabMode(webContentsId, false).catch(() => undefined);
      } else {
        void webview.executeJavaScript(grabTeardownScript()).catch(() => undefined);
      }
    };
  }, [desktop, designMode, ready, url, frameTick, webContentsId, onGrab, onGrabError]);

  const setWebviewRef = useCallback((node: HTMLElement | null) => {
    webviewRef.current = node as ElectronWebviewElement | null;
    setReady(false);
    setWebContentsId(null);
    void import("./browserAutomation").then(({ registerStudioBrowserWebview }) => {
      registerStudioBrowserWebview(webviewRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      void import("./browserAutomation").then(({ registerStudioBrowserWebview }) => {
        registerStudioBrowserWebview(null);
      });
    };
  }, []);

  if (!url) return null;

  if (!desktop) {
    return (
      <iframe
        key={frameTick}
        ref={iframeRef}
        className="arco-browser__frame"
        src={frameSrc}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setIframeLoaded(true)}
      />
    );
  }

  return createElement("webview", {
    key: `${url}:${frameTick}`,
    ref: setWebviewRef,
    className: "arco-browser__frame",
    src: url,
    allowpopups: "true",
    webpreferences: "contextIsolation=yes, nativeWindowOpen=yes",
    title,
  });
}

export type { ElectronWebviewElement };
