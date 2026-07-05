/**
 * BrowserTab — run and preview the open project (the agent-canvas browser
 * pane): a runs strip starts/stops long-lived dev servers through the run
 * manager, and an iframe previews any URL — typically the dev server that
 * was just started. The agent can point this tab at a URL via
 * os_ui open_workspace_tab { tab: "browser", path: "http://..." }.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, ExternalLink, Globe, Play, RotateCw, ScrollText, Square } from "lucide-react";
import type { RunEntry } from "@shared/types";
import { api } from "../../../lib/api";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore } from "../studioStore";

/** "5173" → localhost URL; bare hosts get http:// — small affordances. */
function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) return `http://localhost:${t}`;
  if (!/^https?:\/\//.test(t)) return `http://${t}`;
  return t;
}

export function BrowserTab() {
  const browserUrl = useStudioStore((s) => s.browserUrl);
  const [draft, setDraft] = useState(browserUrl);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [command, setCommand] = useState("");
  const [logFor, setLogFor] = useState<{ id: string; text: string } | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const refreshApps = useOsStore((s) => s.refreshApps);

  // The agent (or a run start) may change the URL from outside.
  useEffect(() => setDraft(browserUrl), [browserUrl]);

  const refreshRuns = useCallback(async () => {
    try {
      setRuns(await api.listRuns());
    } catch {
      // Server unreachable — keep stale list.
    }
  }, []);

  useEffect(() => {
    void refreshRuns();
    // Dev servers die and start outside our control — poll while visible.
    const timer = setInterval(() => void refreshRuns(), 5000);
    return () => clearInterval(timer);
  }, [refreshRuns]);

  const go = useCallback(
    (url?: string) => {
      const next = normalizeUrl(url ?? draft);
      useStudioStore.setState({ browserUrl: next });
      setFrameTick((t) => t + 1);
    },
    [draft],
  );

  const start = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setCommand("");
    await api.startRun(cmd);
    void refreshRuns();
    // Auto-point at a port if the command names one (vite defaults etc. are
    // on the user — but ":5173" or "port 3000" style commands are common).
    const port = /(?::|port\s+)(\d{4,5})/.exec(cmd)?.[1];
    if (port && !browserUrl) {
      // Give the server a beat to bind before first load.
      setTimeout(() => go(`http://localhost:${port}`), 1200);
    }
  }, [command, browserUrl, go, refreshRuns]);

  // Register the current URL as a dock web app. The active project supplies
  // the name and path; the newest alive run supplies the start command, so
  // future launches can boot the dev server themselves.
  const addToDock = useCallback(async () => {
    if (!browserUrl) return;
    const project = projectsInfo.projects.find((p) => p.id === projectsInfo.activeId);
    const aliveRun = [...runs].reverse().find((r) => r.alive);
    await api.addWebApp({
      name: project?.name ?? new URL(browserUrl).host,
      url: browserUrl,
      ...(aliveRun ? { command: aliveRun.command } : {}),
      ...(project ? { projectPath: project.path } : {}),
    });
    await refreshApps();
    setMounted(true);
    setTimeout(() => setMounted(false), 2500);
  }, [browserUrl, projectsInfo, runs, refreshApps]);

  const toggleLog = useCallback(
    async (id: string) => {
      if (logFor?.id === id) {
        setLogFor(null);
      } else {
        const { log } = await api.runLog(id);
        setLogFor({ id, text: log || "(no output yet)" });
      }
    },
    [logFor],
  );

  return (
    <div className="arco-studio__browser">
      {/* ── Runs strip ─────────────────────────────────────────────────── */}
      <div className="arco-studio__runsbar">
        <input
          className="arco-studio__commitmsg"
          placeholder="Start a dev server… e.g. npm start"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void start();
          }}
        />
        <button className="arco-btn arco-btn--primary" disabled={!command.trim()} onClick={() => void start()}>
          <Play size={13} /> Run
        </button>
      </div>
      {runs.length > 0 && (
        <div className="arco-studio__runs">
          {runs.map((run) => (
            <div key={run.id} className="arco-studio__run">
              <span className={`arco-toolcard__status arco-toolcard__status--${run.alive ? "running" : "error"}`} />
              <code className="arco-studio__runcmd">{run.command}</code>
              <button className="arco-btn arco-btn--icon" onClick={() => void toggleLog(run.id)} aria-label="Show log">
                <ScrollText size={12} />
              </button>
              <button
                className="arco-btn arco-btn--icon"
                onClick={() => void api.stopRun(run.id).then(refreshRuns)}
                aria-label="Stop run"
              >
                <Square size={12} />
              </button>
            </div>
          ))}
          {logFor && <pre className="arco-studio__runlog arco-scroll">{logFor.text}</pre>}
        </div>
      )}

      {/* ── URL bar ────────────────────────────────────────────────────── */}
      <div className="arco-studio__urlbar">
        <Globe size={13} style={{ color: "var(--arco-text-tertiary)", flexShrink: 0 }} />
        <input
          className="arco-studio__urlinput"
          placeholder="http://localhost:5173 (or just a port number)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
        />
        <button className="arco-btn arco-btn--icon" onClick={() => setFrameTick((t) => t + 1)} aria-label="Reload page">
          <RotateCw size={12} />
        </button>
        <button
          className="arco-btn arco-btn--icon"
          disabled={!browserUrl}
          onClick={() => window.open(browserUrl, "_blank", "noopener")}
          aria-label="Open in new tab"
        >
          <ExternalLink size={12} />
        </button>
        <button
          className="arco-btn"
          disabled={!browserUrl}
          onClick={() => void addToDock()}
          aria-label="Add this app to the dock"
        >
          {mounted ? <Check size={13} /> : <BookmarkPlus size={13} />}
          {mounted ? "Added" : "Add to Dock"}
        </button>
      </div>

      {/* ── Preview frame ──────────────────────────────────────────────── */}
      {browserUrl ? (
        <iframe
          key={frameTick}
          ref={iframeRef}
          className="arco-studio__frame"
          src={browserUrl}
          title="Project preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        />
      ) : (
        <div className="arco-empty">
          <Globe size={18} />
          <span>Start your app above, then enter its URL (or just the port).</span>
        </div>
      )}
    </div>
  );
}
