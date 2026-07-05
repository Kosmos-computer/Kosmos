/**
 * Arco Models — window layout.
 * Left column: engine control + model list. Right column: test bench + logs.
 */
import { useEffect } from "react";
import { useStore } from "./state/store";
import { bridge } from "./lib/bridge";
import { EngineBar } from "./components/EngineBar";
import { ModelList } from "./components/ModelList";
import { TestBench } from "./components/TestBench";
import { LogsPane } from "./components/LogsPane";
import { X } from "lucide-react";

const POLL_MS = 3000;

export function App() {
  const { refresh, applyDownloadProgress, pushLog, error, clearError } = useStore();

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), POLL_MS);

    const unlisteners: Promise<() => void>[] = [
      bridge.onDownloadProgress(applyDownloadProgress),
      bridge.onEngineLog(pushLog),
    ];
    return () => {
      clearInterval(poll);
      for (const u of unlisteners) void u.then((fn) => fn());
    };
  }, [refresh, applyDownloadProgress, pushLog]);

  return (
    <>
      <div className="mm-titlebar">Arco Models</div>
      <div className="mm-shell">
        <div className="mm-col">
          <EngineBar />
          {error && (
            <div className="mm-error" role="alert">
              <span>{error}</span>
              <button onClick={clearError} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="mm-scroll mm-col" style={{ flex: 1 }}>
            <ModelList />
          </div>
        </div>
        <div className="mm-col">
          <TestBench />
          <LogsPane />
        </div>
      </div>
    </>
  );
}
