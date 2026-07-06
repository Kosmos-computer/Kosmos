/**
 * Model list — merges catalog, disk, and router state into actionable cards.
 */
import { Download, Play, Square, Trash2, Zap, Send } from "lucide-react";
import { Badge } from "@arco/components/ui/Badge";
import { Button } from "@arco/components/ui/Button";
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
    <div className="arco-models-stack">
      {models
        .filter((m) => !m.isDraft || m.phase !== "available")
        .map((m) => (
          <ModelCard key={m.file} row={m} />
        ))}
    </div>
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
    <article
      className={[
        "arco-models-card",
        row.phase === "running" ? "arco-models-card--running" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="arco-models-card__head">
        <span className="arco-models-card__name">{c?.label ?? row.file}</span>
        {c && <Badge>{TIER_LABEL[c.speedTier]}</Badge>}
        {c?.presetExtras?.["model-draft"] && (
          <Badge title="Speculative decoding with draft model">
            <Zap size={10} /> turbo
          </Badge>
        )}
        {c?.experimental && <Badge tone="warning">experimental</Badge>}
        {row.isDraft && <Badge>draft</Badge>}
        <PhaseBadge row={row} />
      </div>

      {c && <p className="arco-settings-panel__desc">{c.description}</p>}
      <div className="arco-models-card__meta">
        {row.file}
        {row.sizeBytes != null && ` · ${formatBytes(row.sizeBytes)}`}
      </div>

      {row.phase === "downloading" && (
        <>
          <div className="arco-widget__progress-track">
            <div className="arco-widget__progress-fill" style={{ width: `${pct ?? 5}%` }} />
          </div>
          <p className="arco-settings-panel__meta">
            {formatBytes(row.download?.received ?? 0)}
            {row.download?.total ? ` of ${formatBytes(row.download.total)}` : ""}
            {pct != null && ` · ${pct}%`}
          </p>
        </>
      )}

      <div className="arco-models-card__actions">
        {row.phase === "available" && c && (
          <Button variant="primary" onClick={() => void download(c)}>
            <Download size={13} />
            Download
          </Button>
        )}

        {(row.phase === "stopped" || row.phase === "failed") && !row.isDraft && (
          <Button
            variant="primary"
            onClick={() => void run(row)}
            disabled={!engineRunning}
            title={engineRunning ? "" : "Start the engine first"}
          >
            <Play size={13} />
            Run
          </Button>
        )}

        {row.phase === "loading" && (
          <span className="arco-settings-panel__meta">Loading into memory…</span>
        )}

        {row.phase === "running" && (
          <>
            <Button onClick={() => void stop(row)}>
              <Square size={13} />
              Stop
            </Button>
            <Button
              onClick={() => void configureArco(row)}
              title="Point Arco OS at this model (writes data/settings.json)"
            >
              <Send size={13} />
              Use in Arco
            </Button>
          </>
        )}

        {(row.phase === "stopped" || row.phase === "failed") && (
          <Button
            variant="ghost"
            className="arco-btn--danger"
            onClick={() => void remove(row.file)}
            title="Delete the GGUF from disk"
          >
            <Trash2 size={13} />
            Delete
          </Button>
        )}

        {row.phase === "running" && arcoConfiguredPath && (
          <span className="arco-settings-panel__meta">Arco configured ✓</span>
        )}
      </div>
    </article>
  );
}

function PhaseBadge({ row }: { row: ModelRow }) {
  switch (row.phase) {
    case "running":
      return <Badge tone="success">running</Badge>;
    case "loading":
      return <Badge>loading</Badge>;
    case "downloading":
      return <Badge>downloading</Badge>;
    case "failed":
      return <Badge tone="danger">failed</Badge>;
    case "stopped":
      return <Badge>on disk</Badge>;
    default:
      return <Badge>not downloaded</Badge>;
  }
}
