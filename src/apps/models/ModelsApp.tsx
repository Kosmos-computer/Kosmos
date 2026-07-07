/**
 * Models — the hub for every model the OS uses (docs/model-hub-plan.md).
 *
 * Two levels: use-case slots on top (what 90% of users touch — "which model
 * answers chat"), the model library below (enable/disable, download/serve
 * local GGUFs, add custom endpoints). Built from shared arco-* primitives;
 * supersedes the legacy Tauri model-manager UI.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cloud, Cpu, Download, Play, Plus, Square, Trash2 } from "lucide-react";
import type { EngineStatus, RegisteredModel, UseCaseSlotState } from "@shared/models";
import {
  ModuleHeader,
  ModuleInner,
  ModuleList,
  ModulePage,
  ModuleSection,
} from "../../components/patterns/ModuleDashboard";
import { SettingsAlert } from "../../components/patterns";
import { Badge, Button, Input, Switch } from "../../components/ui";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";

const CAPABILITY_LABELS: Record<string, string> = {
  "text.chat": "chat",
  "text.embedding": "embeddings",
  "speech.stt": "speech-to-text",
  "speech.tts": "text-to-speech",
  "image.generate": "image",
  "music.generate": "music",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

function isLocalGguf(model: RegisteredModel): boolean {
  return model.manifest.runtime.kind === "llama-gguf";
}

const rowBody = { flex: 1, minWidth: 0 } as const;
const rowTitle = { fontWeight: 600, fontSize: "var(--arco-text-sm)" } as const;
const inlineActions = { display: "flex", alignItems: "center", gap: "var(--arco-space-s)" } as const;

// ── Use-case slots ───────────────────────────────────────────────────────────

function SlotRow({
  slot,
  onAssign,
}: {
  slot: UseCaseSlotState;
  onAssign: (slotId: string, modelId: string | null) => void;
}) {
  return (
    <div className="arco-listrow">
      <div style={rowBody}>
        <div style={rowTitle}>{slot.label}</div>
        <div className="arco-listrow__sub">{slot.description}</div>
      </div>
      {slot.assigned === null && slot.effective ? <Badge>via {slot.effective.name}</Badge> : null}
      <select
        className="arco-input arco-input--narrow"
        value={slot.assigned ?? ""}
        onChange={(e) => onAssign(slot.id, e.target.value || null)}
        aria-label={`Model for ${slot.label}`}
        disabled={slot.eligible.length === 0}
      >
        <option value="">
          {slot.eligible.length === 0
            ? "No eligible models"
            : slot.fallback
              ? "Default (inherit)"
              : "Not set"}
        </option>
        {slot.eligible.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Library rows ─────────────────────────────────────────────────────────────

function LocalModelControls({
  modelId,
  state,
  onDownload,
  onRemoveDownload,
}: {
  modelId: string;
  state: EngineStatus["models"][string] | undefined;
  onDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
}) {
  if (!state || state.state === "absent") {
    return (
      <Button onClick={() => onDownload(modelId)}>
        <Download size={14} /> Download
      </Button>
    );
  }
  if (state.state === "downloading") {
    const pct =
      state.totalBytes && state.totalBytes > 0
        ? Math.min(100, Math.round(((state.receivedBytes ?? 0) / state.totalBytes) * 100))
        : 0;
    return <Badge>downloading {pct}%</Badge>;
  }
  if (state.state === "error") {
    return (
      <span style={inlineActions}>
        <Badge tone="danger" title={state.error}>
          failed
        </Badge>
        <Button onClick={() => onDownload(modelId)}>Retry</Button>
      </span>
    );
  }
  return (
    <span style={inlineActions}>
      {state.routerState === "loaded" ? <Badge tone="success">serving</Badge> : <Badge>on disk</Badge>}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete downloaded model file"
        title="Delete downloaded model file"
        onClick={() => onRemoveDownload(modelId)}
      >
        <Trash2 size={14} />
      </Button>
    </span>
  );
}

function ModelRow({
  model,
  engine,
  onToggle,
  onRemove,
  onDownload,
  onRemoveDownload,
}: {
  model: RegisteredModel;
  engine: EngineStatus | null;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
}) {
  const { manifest } = model;
  const local = isLocalGguf(model);
  const sizeBytes = manifest.runtime.kind === "llama-gguf" ? manifest.runtime.sizeBytes : 0;
  const Icon = local ? Cpu : Cloud;

  return (
    <div className="arco-listrow" style={model.enabled ? undefined : { opacity: 0.55 }}>
      <Icon size={16} style={{ color: "var(--arco-accent)", flexShrink: 0 }} aria-hidden="true" />
      <div style={rowBody}>
        <div style={{ ...rowTitle, display: "flex", alignItems: "center", gap: "var(--arco-space-xs)" }}>
          {manifest.name}
          {manifest.meta?.experimental ? <Badge tone="warning">experimental</Badge> : null}
        </div>
        <div className="arco-listrow__sub" title={manifest.description}>
          {manifest.description}
        </div>
        <div style={{ ...inlineActions, marginTop: 4, flexWrap: "wrap" as const }}>
          {manifest.capabilities.map((cap) => (
            <Badge key={cap}>{CAPABILITY_LABELS[cap] ?? cap}</Badge>
          ))}
          {local && sizeBytes ? <Badge>{formatBytes(sizeBytes)}</Badge> : null}
        </div>
      </div>

      {local ? (
        <LocalModelControls
          modelId={manifest.id}
          state={engine?.models[manifest.id]}
          onDownload={onDownload}
          onRemoveDownload={onRemoveDownload}
        />
      ) : null}

      {model.source !== "seed" ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${manifest.name}`}
          title="Remove from registry"
          onClick={() => onRemove(manifest.id)}
        >
          <Trash2 size={14} />
        </Button>
      ) : null}
      <Switch
        checked={model.enabled}
        onChange={(e) => onToggle(manifest.id, e.target.checked)}
        aria-label={`${manifest.name} enabled`}
      />
    </div>
  );
}

// ── Add custom endpoint ──────────────────────────────────────────────────────

function AddModelForm({ onDone }: { onDone: () => void }) {
  const notify = useOsStore((s) => s.notify);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [manifestUrl, setManifestUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const addCustom = async () => {
    if (!name.trim() || !baseUrl.trim() || !modelName.trim()) {
      notify("Name, base URL, and model are required");
      return;
    }
    setBusy(true);
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await api.registerModel({
        manifest: {
          id: `user.${slug || "endpoint"}`,
          name: name.trim(),
          description: `Custom endpoint at ${baseUrl.trim()}`,
          capabilities: ["text.chat"],
          runtime: { kind: "openai-compatible", baseUrl: baseUrl.trim(), model: modelName.trim() },
        },
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      });
      setName("");
      setBaseUrl("");
      setModelName("");
      setApiKey("");
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not add model");
    } finally {
      setBusy(false);
    }
  };

  const addByUrl = async () => {
    if (!manifestUrl.trim()) return;
    setBusy(true);
    try {
      await api.registerModel({ url: manifestUrl.trim() });
      setManifestUrl("");
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not fetch manifest");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arco-form">
      <Input
        placeholder="Display name (e.g. My vLLM box)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Model display name"
      />
      <Input
        placeholder="Base URL ending in /v1"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        aria-label="Base URL"
      />
      <Input
        placeholder="Model id (as the endpoint expects it)"
        value={modelName}
        onChange={(e) => setModelName(e.target.value)}
        aria-label="Upstream model id"
      />
      <Input
        type="password"
        placeholder="API key (optional — stored masked in Settings)"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        aria-label="API key"
      />
      <div style={inlineActions}>
        <Button variant="primary" onClick={() => void addCustom()} disabled={busy}>
          <Plus size={14} /> Add endpoint
        </Button>
      </div>
      <div style={inlineActions}>
        <Input
          placeholder="…or a model manifest URL (model.json)"
          value={manifestUrl}
          onChange={(e) => setManifestUrl(e.target.value)}
          aria-label="Manifest URL"
        />
        <Button onClick={() => void addByUrl()} disabled={busy || !manifestUrl.trim()}>
          Fetch & register
        </Button>
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

export function ModelsApp() {
  const notify = useOsStore((s) => s.notify);
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [slots, setSlots] = useState<UseCaseSlotState[]>([]);
  const [engine, setEngine] = useState<EngineStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [registry, engineStatus] = await Promise.all([api.getModels(), api.getEngineStatus()]);
      setModels(registry.models);
      setSlots(registry.slots);
      setEngine(engineStatus);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not load models");
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while anything is in motion (downloads, engine starting).
  const busy =
    engine?.phase === "starting" ||
    Object.values(engine?.models ?? {}).some((m) => m.state === "downloading");
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => void refresh(), 1_500);
    return () => window.clearInterval(timer);
  }, [busy, refresh]);

  const act = useCallback(
    async (fn: () => Promise<unknown>, errorMessage: string) => {
      try {
        await fn();
      } catch (err) {
        notify(err instanceof Error ? `${errorMessage}: ${err.message}` : errorMessage);
      }
      await refresh();
    },
    [notify, refresh],
  );

  const onAssign = (slotId: string, modelId: string | null) =>
    void act(() => api.assignModelSlot(slotId, modelId), "Could not assign model");
  const onToggle = (id: string, enabled: boolean) =>
    void act(() => api.setModelEnabled(id, enabled), "Could not update model");
  const onRemove = (id: string) => void act(() => api.deleteModel(id), "Could not remove model");
  const onDownload = (id: string) => void act(() => api.downloadModel(id), "Download failed");
  const onRemoveDownload = (id: string) =>
    void act(() => api.removeModelDownload(id), "Could not delete files");

  const localModels = useMemo(() => models.filter(isLocalGguf), [models]);
  const cloudModels = useMemo(() => models.filter((m) => !isLocalGguf(m)), [models]);

  const engineBadge =
    engine?.phase === "running" ? (
      <Badge tone="success">engine running{engine.external ? " (external)" : ""}</Badge>
    ) : engine?.phase === "starting" ? (
      <Badge tone="warning">engine starting…</Badge>
    ) : engine?.phase === "error" ? (
      <Badge tone="danger" title={engine.detail}>
        engine error
      </Badge>
    ) : (
      <Badge>engine stopped</Badge>
    );

  return (
    <ModulePage>
      <ModuleInner>
        <ModuleHeader
          title="Models"
          subtitle="Every model the OS uses — assign use-cases, download local models, connect providers."
          actions={
            <div style={inlineActions}>
              {engineBadge}
              {engine?.phase === "running" && !engine.external ? (
                <Button onClick={() => void act(() => api.stopEngine(), "Could not stop engine")}>
                  <Square size={14} /> Stop engine
                </Button>
              ) : (
                <Button
                  disabled={engine?.phase === "starting"}
                  onClick={() => void act(() => api.startEngine(), "Could not start engine")}
                  title="Serve downloaded models locally via llama-server"
                >
                  <Play size={14} /> Start engine
                </Button>
              )}
            </div>
          }
        />

        {engine?.phase === "error" && engine.detail ? (
          <SettingsAlert tone="error">{engine.detail}</SettingsAlert>
        ) : null}

        <ModuleSection title="Use cases" count={slots.length}>
          <ModuleList>
            {slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onAssign={onAssign} />
            ))}
          </ModuleList>
        </ModuleSection>

        <ModuleSection title="Local models" count={localModels.length}>
          <ModuleList>
            {localModels.map((m) => (
              <ModelRow
                key={m.manifest.id}
                model={m}
                engine={engine}
                onToggle={onToggle}
                onRemove={onRemove}
                onDownload={onDownload}
                onRemoveDownload={onRemoveDownload}
              />
            ))}
          </ModuleList>
        </ModuleSection>

        <ModuleSection title="Cloud & remote models" count={cloudModels.length}>
          <ModuleList>
            {cloudModels.map((m) => (
              <ModelRow
                key={m.manifest.id}
                model={m}
                engine={engine}
                onToggle={onToggle}
                onRemove={onRemove}
                onDownload={onDownload}
                onRemoveDownload={onRemoveDownload}
              />
            ))}
          </ModuleList>
        </ModuleSection>

        <ModuleSection title="Add a model" count={1}>
          <AddModelForm onDone={() => void refresh()} />
        </ModuleSection>
      </ModuleInner>
    </ModulePage>
  );
}
