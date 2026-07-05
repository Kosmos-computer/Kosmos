/**
 * Model list — merges catalog, disk, and router state into actionable cards.
 */
import { Download, Play, Square, Trash2, Zap, Send } from "lucide-react";
import { useStore, type ModelRow } from "../state/store";

function formatBytes(n: number | null): string {
  if (n == null) return "";
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  return `${(n / 1e6).toFixed(0)} MB`;
}

const TIER_LABEL: Record<string, string> = {
  fastest: "fastest",
  fast: "fast",
  balanced: "balanced",
  big: "big + smart",
};

export function ModelList() {
  const models = useStore((s) => s.models);
  return (
    <>
      {models
        .filter((m) => !m.isDraft || m.phase !== "available")
        .map((m) => (
          <ModelCard key={m.file} row={m} />
        ))}
    </>
  );
}

function ModelCard({ row }: { row: ModelRow }) {
  const { engine, download, remove, run, stop, configureArco, arcoConfiguredPath } = useStore();
  const engineRunning = engine?.running ?? false;
  const c = row.catalog;

  const pct =
    row.download && row.download.total
      ? Math.round((row.download.received / row.download.total) * 100)
      : null;

  return (
    <div className={`mm-model ${row.phase === "running" ? "mm-model--running" : ""}`}>
      <div className="mm-model__head">
        <span className="mm-model__name">{c?.label ?? row.file}</span>
        {c && <span className="mm-badge mm-badge--accent">{TIER_LABEL[c.speedTier]}</span>}
        {c?.presetExtras?.["model-draft"] && (
          <span className="mm-badge mm-badge--accent" title="Speculative decoding with draft model">
            <Zap size={10} style={{ verticalAlign: -1 }} /> turbo
          </span>
        )}
        {c?.experimental && <span className="mm-badge mm-badge--warn">experimental</span>}
        {row.isDraft && <span className="mm-badge">draft</span>}
        <PhaseBadge row={row} />
      </div>

      {c && <div className="mm-model__desc">{c.description}</div>}
      <div className="mm-model__meta">
        {row.file}
        {row.sizeBytes != null && ` · ${formatBytes(row.sizeBytes)}`}
      </div>

      {row.phase === "downloading" && (
        <>
          <div className="mm-progress">
            <div className="mm-progress__fill" style={{ width: `${pct ?? 5}%` }} />
          </div>
          <div className="mm-hint">
            {formatBytes(row.download?.received ?? 0)}
            {row.download?.total ? ` of ${formatBytes(row.download.total)}` : ""} {pct != null && `· ${pct}%`}
          </div>
        </>
      )}

      <div className="mm-model__actions">
        {row.phase === "available" && c && (
          <button className="mm-btn mm-btn--primary" onClick={() => void download(c)}>
            <Download size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Download
          </button>
        )}

        {(row.phase === "stopped" || row.phase === "failed") && !row.isDraft && (
          <button
            className="mm-btn mm-btn--primary"
            onClick={() => void run(row)}
            disabled={!engineRunning}
            title={engineRunning ? "" : "Start the engine first"}
          >
            <Play size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Run
          </button>
        )}

        {row.phase === "loading" && (
          <span className="mm-hint">Loading into memory…</span>
        )}

        {row.phase === "running" && (
          <>
            <button className="mm-btn" onClick={() => void stop(row)}>
              <Square size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Stop
            </button>
            <button
              className="mm-btn"
              onClick={() => void configureArco(row)}
              title="Point Arco OS at this model (writes data/settings.json)"
            >
              <Send size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Use in Arco
            </button>
          </>
        )}

        {(row.phase === "stopped" || row.phase === "failed") && (
          <button
            className="mm-btn mm-btn--ghost mm-btn--danger"
            onClick={() => void remove(row.file)}
            title="Delete the GGUF from disk"
          >
            <Trash2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Delete
          </button>
        )}

        {row.phase === "running" && arcoConfiguredPath && (
          <span className="mm-hint">Arco configured ✓</span>
        )}
      </div>
    </div>
  );
}

function PhaseBadge({ row }: { row: ModelRow }) {
  switch (row.phase) {
    case "running":
      return <span className="mm-badge mm-badge--running">running</span>;
    case "loading":
      return <span className="mm-badge mm-badge--accent">loading</span>;
    case "downloading":
      return <span className="mm-badge mm-badge--accent">downloading</span>;
    case "failed":
      return <span className="mm-badge mm-badge--danger">failed</span>;
    case "stopped":
      return <span className="mm-badge">on disk</span>;
    default:
      return <span className="mm-badge">not downloaded</span>;
  }
}
