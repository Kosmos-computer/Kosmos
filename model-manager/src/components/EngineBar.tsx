/**
 * Engine control bar: start/stop llama-server, health badge, and the
 * OpenAI-compatible endpoint Arco (or anything else) should point at.
 */
import { useState } from "react";
import { Copy, Check, Power, RotateCw } from "lucide-react";
import { Badge } from "@arco/components/ui/Badge";
import { Button } from "@arco/components/ui/Button";
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
    <header className="arco-models-engine-bar">
      <div className="arco-models-engine-bar__row">
        <div className="arco-models-engine-bar__brand">
          <span className="arco-models-engine-bar__title">Engine — llama-server (router mode)</span>
          <Badge tone={running ? "success" : "default"}>
            {running ? `running · pid ${engine?.pid}` : "stopped"}
          </Badge>
        </div>

        <div className="arco-models-engine-bar__actions">
          {running ? (
            <Button onClick={() => void stopEngine()} disabled={engineBusy}>
              <Power size={13} />
              Stop engine
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void startEngine()} disabled={engineBusy}>
              <Power size={13} />
              Start engine
            </Button>
          )}
          {running && (
            <Button
              variant="ghost"
              onClick={() => void stopEngine().then(() => startEngine())}
              disabled={engineBusy}
              title="Restart (re-reads presets, picks up new downloads)"
            >
              <RotateCw size={13} />
              Restart
            </Button>
          )}
        </div>

        <div className="arco-models-engine-bar__endpoint">
          <code className="arco-code arco-code--nowrap">{endpoint}</code>
          <Button variant="ghost" size="icon" onClick={() => void copy()} aria-label="Copy endpoint">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      </div>

      <p className="arco-models-engine-bar__hint">
        Tuned for Apple Silicon: full Metal offload, Flash Attention, q8_0 KV cache. Models load on
        first request and evict LRU beyond 2 resident. Restart the engine after downloading new models.
      </p>
    </header>
  );
}
