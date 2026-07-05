/**
 * WebAppSurface — a dock-launched user project in a window. On mount it
 * probes /launch: if the app's dev server is down and a start command is
 * registered, the server spawns it and we poll until the URL responds, then
 * embed it. The toolbar mirrors the Studio Browser tab's essentials.
 */
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe, RotateCw } from "lucide-react";
import type { WebApp } from "@shared/types";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";

type Phase = "probing" | "starting" | "ready" | "failed";

const POLL_MS = 1500;
/** Give a cold dev server ~30s before declaring failure. */
const MAX_POLLS = 20;

export function WebAppSurface({ webAppId }: { webAppId: string }) {
  const webApp: WebApp | undefined = useOsStore((s) => s.webApps.find((a) => a.id === webAppId));
  const [phase, setPhase] = useState<Phase>("probing");
  const [frameTick, setFrameTick] = useState(0);

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

  if (!webApp) return <div className="arco-empty">This app was removed from the registry.</div>;

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
          aria-label="Reload app"
        >
          <RotateCw size={12} />
        </button>
        <button
          className="arco-btn arco-btn--icon"
          onClick={() => window.open(webApp.url, "_blank", "noopener")}
          aria-label="Open in browser tab"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      {phase === "ready" ? (
        <iframe
          key={frameTick}
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
                {webApp.name} isn't responding at {webApp.url}
                {webApp.command ? " and its start command didn't come up in time." : " and no start command is registered."}
              </span>
              <button className="arco-btn arco-btn--primary" onClick={() => void launch()}>
                Try again
              </button>
            </>
          ) : (
            <span>{phase === "starting" ? `Starting ${webApp.name}…` : `Connecting to ${webApp.name}…`}</span>
          )}
        </div>
      )}
    </div>
  );
}
