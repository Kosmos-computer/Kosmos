/**
 * Engine control card: start/stop llama-server, health badge, and the
 * OpenAI-compatible endpoint Arco (or anything else) should point at.
 */
import { useState } from "react";
import { Copy, Check, Power, RotateCw } from "lucide-react";
import { useStore } from "../state/store";

export function EngineBar() {
  const { engine, engineBusy, startEngine, stopEngine } = useStore();
  const [copied, setCopied] = useState(false);

  const running = engine?.running ?? false;
  const endpoint = `http://127.0.0.1:${engine?.port ?? 4650}/v1`;

  const copy = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mm-card">
      <div className="mm-card__title">
        <span>Engine — llama-server (router mode)</span>
        <span className={`mm-badge ${running ? "mm-badge--running" : ""}`}>
          {running ? `running · pid ${engine?.pid}` : "stopped"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {running ? (
          <button className="mm-btn" onClick={() => void stopEngine()} disabled={engineBusy}>
            <Power size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Stop engine
          </button>
        ) : (
          <button
            className="mm-btn mm-btn--primary"
            onClick={() => void startEngine()}
            disabled={engineBusy}
          >
            <Power size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Start engine
          </button>
        )}
        {running && (
          <button
            className="mm-btn mm-btn--ghost"
            onClick={() => void stopEngine().then(() => startEngine())}
            disabled={engineBusy}
            title="Restart (re-reads presets, picks up new downloads)"
          >
            <RotateCw size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
            Restart
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="mm-code" style={{ flex: 1 }}>
          {endpoint}
        </span>
        <button className="mm-btn mm-btn--ghost" onClick={() => void copy()} aria-label="Copy endpoint">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="mm-hint">
        Tuned for Apple Silicon: full Metal offload, Flash Attention, q8_0 KV cache. Models load
        on first request and evict LRU beyond 2 resident. Restart the engine after downloading new
        models.
      </div>
    </div>
  );
}
