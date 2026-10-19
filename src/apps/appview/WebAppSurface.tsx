import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * WebAppSurface — a dock-launched user project in a window. On mount it
 * probes /launch: if the app's dev server is down and a start command is
 * registered, the server spawns it and we poll until the URL responds, then
 * embed it. The toolbar mirrors the Studio Browser tab's essentials.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Globe, RotateCw } from "lucide-react";
import type { WebApp } from "@shared/types";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import {
  registerIframeUiDriver,
  unregisterIframeUiDriver,
  type GuestUiCommand,
  type GuestUiSnapshot,
} from "../../os/cursor/iframeUiBridge";

type Phase = "probing" | "starting" | "ready" | "failed";

const POLL_MS = 1500;
/** Give a cold dev server ~30s before declaring failure. */
const MAX_POLLS = 20;

export function WebAppSurface({ webAppId }: { webAppId: string }) {
  const webApp: WebApp | undefined = useOsStore((s) => s.webApps.find((a) => a.id === webAppId));
  const [phase, setPhase] = useState<Phase>("probing");
  const [frameTick, setFrameTick] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const uiSeq = useRef(0);
  const uiPending = useRef(new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>());

  const launch = useCallback(async () => {
    setPhase("probing");
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      try {
        const status = await api.launchWebApp(webAppId);
        if (status.running) {
          setPhase("ready");
          return;
        }
        setPhase(status.starting ? "starting" : "failed");
        if (!status.starting) return;
      } catch {
        setPhase("failed");
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    setPhase("failed");
  }, [webAppId]);

  useEffect(() => {
    void launch();
  }, [launch]);

  // The Kosmos stream (and any other same-origin web window) answers
  // ui.command. Without this registration the agent cursor treats the iframe
  // as opaque and cannot change the target or the camera.
  useEffect(() => {
    if (phase !== "ready" || !webApp?.url.startsWith("/")) return;
    const windowId = `web:${webAppId}`;
    const origin = window.location.origin;
    const send = (command: GuestUiCommand) =>
      new Promise<unknown>((resolve, reject) => {
        const frame = iframeRef.current?.contentWindow;
        if (!frame) {
          reject(new Error("The iframe is not mounted"));
          return;
        }
        const id = ++uiSeq.current;
        uiPending.current.set(id, { resolve, reject });
        frame.postMessage({ appBridge: true, type: "ui.command", id, command }, origin);
        window.setTimeout(() => {
          if (!uiPending.current.has(id)) return;
          uiPending.current.delete(id);
          reject(new Error("App UI bridge timed out"));
        }, 4_000);
      });
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const msg = event.data as { appBridge?: boolean; type?: string; id?: number; ok?: boolean; result?: unknown; error?: string };
      if (!msg || msg.appBridge !== true || msg.type !== "ui.result" || msg.id == null) return;
      const pending = uiPending.current.get(msg.id);
      if (!pending) return;
      uiPending.current.delete(msg.id);
      if (msg.ok) pending.resolve(msg.result);
      else pending.reject(new Error(msg.error || "UI command failed"));
    };
    window.addEventListener("message", onMessage);
    registerIframeUiDriver(windowId, async (command) => {
      try {
        const result = await send(command);
        if (command.kind === "snapshot") {
          const snap = result as GuestUiSnapshot;
          const box = iframeRef.current?.getBoundingClientRect();
          const ox = box?.x ?? 0;
          const oy = box?.y ?? 0;
          return {
            elements: (snap.elements ?? []).map((el) => ({
              ...el,
              rect: { ...el.rect, x: Math.round(el.rect.x + ox), y: Math.round(el.rect.y + oy) },
            })),
          };
        }
        return { ok: true as const };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    });
    return () => {
      window.removeEventListener("message", onMessage);
      unregisterIframeUiDriver(windowId);
    };
  }, [phase, webAppId, webApp?.url, frameTick]);

  if (!webApp) return <div className="arco-empty"><T k={I18nKey.APPS$APPVIEW_THIS_APP_WAS_REMOVED_FROM_THE_REGISTRY} /></div>;

  return (
    <div className="arco-appsurface">
      <div className="arco-appsurface__toolbar">
        <Globe size={13} style={{ color: "var(--arco-text-tertiary)" }} />
        <span className="arco-studio__editorpath" style={{ flex: 1 }}>
          {webApp.url}
        </span>
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => (phase === "ready" ? setFrameTick((t) => t + 1) : void launch())}
          aria-label={i18n.t(I18nKey.APPS$APPVIEW_RELOAD_APP)}
        >
          <RotateCw size={12} />
        </button>
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => window.open(webApp.url, "_blank", "noopener")}
          aria-label={i18n.t(I18nKey.APPS$APPVIEW_OPEN_IN_BROWSER_TAB)}
        >
          <ExternalLink size={12} />
        </button>
      </div>

      {phase === "ready" ? (
        <iframe
          key={frameTick}
          ref={iframeRef}
          className="arco-studio__frame"
          src={webApp.url}
          title={webApp.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      ) : (
        <div className="arco-empty">
          {phase === "failed" ? (
            <>
              <span>
                {webApp.name}<T k={I18nKey.APPS$APPVIEW_ISN_T_RESPONDING_AT} />{webApp.url}
                {webApp.command ? " and its start command didn't come up in time." : " and no start command is registered."}
              </span>
              <button className="arco-btn arco-btn--primary" onClick={() => void launch()}><T k={I18nKey.APPS$APPVIEW_TRY_AGAIN} /></button>
            </>
          ) : (
            <span>{phase === "starting" ? `Starting ${webApp.name}…` : `Connecting to ${webApp.name}…`}</span>
          )}
        </div>
      )}
    </div>
  );
}
