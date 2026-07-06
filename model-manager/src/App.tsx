/**
 * Arco Models — window layout.
 * Top: engine bar. Main: model list (left) + test bench / logs (right).
 */
import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@arco/components/ui/Button";
import { useStore } from "./state/store";
import { bridge } from "./lib/bridge";
import { EngineBar } from "./components/EngineBar";
import { ModelList } from "./components/ModelList";
import { TestBench } from "./components/TestBench";
import { LogsPane } from "./components/LogsPane";

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
    <div className="arco-models-app">
      <header className="arco-models-titlebar">Arco Models</header>
      <EngineBar />
      {error && (
        <div className="arco-models-error" role="alert">
          <span>{error}</span>
          <Button variant="ghost" size="icon" onClick={clearError} aria-label="Dismiss error">
            <X size={14} />
          </Button>
        </div>
      )}
      <div className="arco-models-shell">
        <div className="arco-models-scroll arco-models-col">
          <ModelList />
        </div>
        <div className="arco-models-col">
          <TestBench />
          <LogsPane />
        </div>
      </div>
    </div>
  );
}
