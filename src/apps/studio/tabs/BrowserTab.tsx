/**
 * BrowserTab — run and preview the open project (the agent-canvas browser
 * pane): a runs strip starts/stops long-lived dev servers through the run
 * manager, and an iframe previews any URL — typically the dev server that
 * was just started. The agent can point this tab at a URL via
 * os_ui open_workspace_tab { tab: "browser", path: "http://..." }.
 */
import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, Check, Play, ScrollText, Square } from "lucide-react";
import type { RunEntry } from "@shared/types";
import { BrowserShell } from "../../../components/patterns/search";
import { api } from "../../../lib/api";
import { useOsStore } from "../../../os/osStore";
import { useStudioStore } from "../studioStore";

export function BrowserTab() {
  const browserUrl = useStudioStore((s) => s.browserUrl);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [command, setCommand] = useState("");
  const [logFor, setLogFor] = useState<{ id: string; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const projectsInfo = useStudioStore((s) => s.projectsInfo);
  const refreshApps = useOsStore((s) => s.refreshApps);

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

  const navigate = useCallback((url: string) => {
    useStudioStore.setState({ browserUrl: url });
  }, []);

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
      setTimeout(() => navigate(`http://localhost:${port}`), 1200);
    }
  }, [command, browserUrl, navigate, refreshRuns]);

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

      <BrowserShell
        url={browserUrl}
        onNavigate={navigate}
        placeholder="http://localhost:5173 (or just a port number)"
        title="Project preview"
        toolbarExtra={
          <button
            className="arco-btn"
            disabled={!browserUrl}
            onClick={() => void addToDock()}
            aria-label="Add this app to the dock"
          >
            {mounted ? <Check size={13} /> : <BookmarkPlus size={13} />}
            {mounted ? "Added" : "Add to Dock"}
          </button>
        }
      />
    </div>
  );
}
