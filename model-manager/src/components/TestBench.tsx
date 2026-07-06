/**
 * Test bench — race models head-to-head. Sends one completion and reports
 * llama-server's own timings: time-to-first-token (prompt eval) and decode
 * tokens/sec, which is the honest speed number for comparing models.
 */
import { useState } from "react";
import { Gauge } from "lucide-react";
import { Button } from "@arco/components/ui/Button";
import { SettingsAlert, SettingsPanelBody, SettingsPanelHeader } from "@arco/components/patterns/SettingsLayout";
import { useStore } from "../state/store";
import { benchChat, type BenchResult } from "../lib/bridge";

const DEFAULT_PROMPT =
  "Reply with a JSON object listing three todo items for a weekend project, each with a title and an estimated_minutes field.";

export function TestBench() {
  const models = useStore((s) => s.models);
  const engineRunning = useStore((s) => s.engine?.running ?? false);
  const loaded = models.filter((m) => (m.phase === "running" || m.phase === "stopped") && !m.isDraft);

  const [target, setTarget] = useState<string>("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BenchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = target || loaded.find((m) => m.phase === "running")?.routerId || loaded[0]?.routerId || "";

  const runBench = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await benchChat(selected, prompt));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="arco-card">
      <SettingsPanelHeader>
        <span className="arco-settings-panel__title">
          <Gauge size={13} className="arco-icon arco-icon--secondary" />
          Test bench
        </span>
      </SettingsPanelHeader>

      <SettingsPanelBody>
        <div className="arco-row">
          <select
            className="arco-input arco-input--auto"
            value={selected}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Model to benchmark"
          >
            {loaded.length === 0 && <option value="">No models on disk</option>}
            {loaded.map((m) => (
              <option key={m.file} value={m.routerId ?? ""}>
                {m.catalog?.label ?? m.file}
                {m.phase === "running" ? " (loaded)" : ""}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            onClick={() => void runBench()}
            disabled={busy || !engineRunning || !selected}
            title={engineRunning ? "" : "Start the engine first"}
          >
            {busy ? "Running…" : "Run"}
          </Button>
        </div>

        <textarea
          className="arco-input"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="Bench prompt"
        />

        {error && <SettingsAlert tone="error">{error}</SettingsAlert>}

        {result && (
          <>
            <div className="arco-models-bench__stats">
              <Stat
                value={result.tokensPerSecond != null ? result.tokensPerSecond.toFixed(1) : "—"}
                label="tokens / sec"
              />
              <Stat
                value={result.ttftMs != null ? `${(result.ttftMs / 1000).toFixed(2)}s` : "—"}
                label="prompt eval (TTFT)"
              />
              <Stat value={result.generatedTokens?.toString() ?? "—"} label="tokens out" />
              <Stat value={`${(result.totalMs / 1000).toFixed(2)}s`} label="wall clock" />
            </div>
            <div className="arco-models-bench__result">{result.text}</div>
          </>
        )}

        {!result && !error && (
          <p className="arco-settings-panel__desc">
            First run on a cold model includes load time. Run twice for honest numbers — the second
            run also shows prefix-cache savings on TTFT.
          </p>
        )}
      </SettingsPanelBody>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="arco-models-stat">
      <span className="arco-models-stat__value">{value}</span>
      <span className="arco-models-stat__label">{label}</span>
    </div>
  );
}
