import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Models — the hub for every model the OS uses (docs/model-hub-plan.md).
 *
 * Two levels: use-case slots on top (what 90% of users touch — "which model
 * answers chat"), the model library below (enable/disable, download/serve
 * local GGUFs, add custom endpoints). Built from shared arco-* primitives;
 * supersedes the legacy Tauri model-manager UI.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  CalendarClock,
  Cloud,
  Cpu,
  Download,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Mic,
  Music,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import type {
  CreateUseCaseSlotInput,
  EngineStatus,
  ModelCapability,
  RegisteredModel,
  UseCaseSlotState,
} from "@shared/models";
import {
  ModuleHeader,
  ModuleInner,
  ModuleList,
  ModulePage,
  ModuleSection,
} from "../../components/patterns/ModuleDashboard";
import { SettingsAlert } from "../../components/patterns";
import { Badge, Button, Input, Switch } from "../../components/ui";
import { defaultSafety } from "@shared/profiles";
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

const CAPABILITY_OPTIONS: ModelCapability[] = [
  "text.chat",
  "text.embedding",
  "speech.stt",
  "speech.tts",
  "image.generate",
  "music.generate",
];

const CAPABILITY_ICONS: Record<ModelCapability, LucideIcon> = {
  "text.chat": MessageSquare,
  "text.embedding": Layers,
  "speech.stt": Mic,
  "speech.tts": Volume2,
  "image.generate": ImageIcon,
  "music.generate": Music,
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
const rowIcon = { color: "var(--arco-accent)", flexShrink: 0 } as const;
const inlineActions = { display: "flex", alignItems: "center", gap: "var(--arco-space-s)" } as const;

const SLOT_ICONS: Record<string, LucideIcon> = {
  "agent.chat": MessageSquare,
  "automations.chat": CalendarClock,
  "voice.brain": Brain,
  "voice.stt": Mic,
  "voice.tts": Volume2,
  "image.generate": ImageIcon,
  "music.generate": Music,
};

// ── Use-case slots ───────────────────────────────────────────────────────────

function SlotRow({
  slot,
  onAssign,
  onRemove,
}: {
  slot: UseCaseSlotState;
  onAssign: (slotId: string, modelId: string | null) => void;
  onRemove?: (slotId: string) => void;
}) {
  const Icon = SLOT_ICONS[slot.id] ?? CAPABILITY_ICONS[slot.requires];

  return (
    <div className="arco-listrow">
      <Icon size={16} style={rowIcon} aria-hidden="true" />
      <div style={rowBody}>
        <div style={{ ...rowTitle, display: "flex", alignItems: "center", gap: "var(--arco-space-xs)" }}>
          {slot.label}
          {slot.source === "user" ? <Badge><T k={I18nKey.APPS$MODELS_CUSTOM} /></Badge> : null}
        </div>
        <div className="arco-listrow__sub">{slot.description}</div>
      </div>
      {slot.assigned === null && slot.effective ? <Badge><T k={I18nKey.APPS$MODELS_VIA} />{slot.effective.name}</Badge> : null}
      {slot.source === "user" && onRemove ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${slot.label}`}
          title={i18n.t(I18nKey.APPS$MODELS_REMOVE_USE_CASE)}
          onClick={() => onRemove(slot.id)}
        >
          <Trash2 size={14} />
        </Button>
      ) : null}
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
        <Download size={14} /><T k={I18nKey.APPS$MODELS_DOWNLOAD} /></Button>
    );
  }
  if (state.state === "downloading") {
    const pct =
      state.totalBytes && state.totalBytes > 0
        ? Math.min(100, Math.round(((state.receivedBytes ?? 0) / state.totalBytes) * 100))
        : 0;
    return <Badge><T k={I18nKey.APPS$MODELS_DOWNLOADING} />{pct}%</Badge>;
  }
  if (state.state === "error") {
    return (
      <span style={inlineActions}>
        <Badge tone="danger" title={state.error}><T k={I18nKey.APPS$MODELS_FAILED} /></Badge>
        <Button onClick={() => onDownload(modelId)}><T k={I18nKey.COMMON$RETRY} /></Button>
      </span>
    );
  }
  return (
    <span style={inlineActions}>
      {state.routerState === "loaded" ? <Badge tone="success"><T k={I18nKey.APPS$MODELS_SERVING} /></Badge> : <Badge><T k={I18nKey.APPS$MODELS_ON_DISK} /></Badge>}
      <Button
        variant="ghost"
        size="icon"
        aria-label={i18n.t(I18nKey.APPS$MODELS_DELETE_DOWNLOADED_MODEL_FILE)}
        title={i18n.t(I18nKey.APPS$MODELS_DELETE_DOWNLOADED_MODEL_FILE)}
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
      <Icon size={16} style={rowIcon} aria-hidden="true" />
      <div style={rowBody}>
        <div style={{ ...rowTitle, display: "flex", alignItems: "center", gap: "var(--arco-space-xs)" }}>
          {manifest.name}
          {manifest.meta?.experimental ? <Badge tone="warning"><T k={I18nKey.APPS$MODELS_EXPERIMENTAL} /></Badge> : null}
        </div>
        <div className="arco-listrow__sub" title={manifest.description}>
          {manifest.description}
        </div>
        <div style={{ ...inlineActions, marginTop: 4, flexWrap: "wrap" as const }}>
          {manifest.capabilities.map((cap) => (
            <Badge key={cap}>{CAPABILITY_LABELS[cap] ?? cap}</Badge>
          ))}
          <Badge>
            {(manifest.safety ?? defaultSafety("standard")).level}
          </Badge>
          {manifest.audience?.age ? <Badge>{manifest.audience.age}</Badge> : null}
          {manifest.certification?.status && manifest.certification.status !== "unevaluated" ? (
            <Badge tone={manifest.certification.status === "pass" ? "success" : "warning"}>
              {manifest.certification.status}
            </Badge>
          ) : (
            <Badge>unevaluated</Badge>
          )}
          {manifest.trust ? <Badge>{manifest.trust}</Badge> : null}
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
          title={i18n.t(I18nKey.APPS$MODELS_REMOVE_FROM_REGISTRY)}
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

// ── Add use case ─────────────────────────────────────────────────────────────

function AddUseCaseForm({
  slots,
  onDone,
}: {
  slots: UseCaseSlotState[];
  onDone: () => void;
}) {
  const notify = useOsStore((s) => s.notify);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [requires, setRequires] = useState<ModelCapability>("text.chat");
  const [fallback, setFallback] = useState("");
  const [busy, setBusy] = useState(false);

  const fallbackOptions = useMemo(
    () => slots.filter((slot) => slot.requires === requires),
    [slots, requires],
  );

  const addUseCase = async () => {
    if (!label.trim()) {
      notify("Name is required");
      return;
    }
    setBusy(true);
    try {
      const body: CreateUseCaseSlotInput = {
        label: label.trim(),
        requires,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(fallback ? { fallback } : {}),
      };
      await api.addUseCaseSlot(body);
      setLabel("");
      setDescription("");
      setRequires("text.chat");
      setFallback("");
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not add use case");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arco-form">
      <Input
        placeholder={i18n.t(I18nKey.APPS$MODELS_NAME_E_G_NIGHTLY_REPORTS)}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$MODELS_USE_CASE_NAME)}
      />
      <Input
        placeholder={i18n.t(I18nKey.APPS$TASKS_DESCRIPTION_OPTIONAL)}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$MODELS_USE_CASE_DESCRIPTION)}
      />
      <select
        className="arco-input"
        value={requires}
        onChange={(e) => {
          setRequires(e.target.value as ModelCapability);
          setFallback("");
        }}
        aria-label={i18n.t(I18nKey.APPS$MODELS_REQUIRED_CAPABILITY)}
      >
        {CAPABILITY_OPTIONS.map((cap) => (
          <option key={cap} value={cap}>
            {CAPABILITY_LABELS[cap] ?? cap}
          </option>
        ))}
      </select>
      {fallbackOptions.length > 0 ? (
        <select
          className="arco-input"
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          aria-label={i18n.t(I18nKey.APPS$MODELS_INHERIT_FROM)}
        >
          <option value=""><T k={I18nKey.APPS$MODELS_NO_INHERITANCE} /></option>
          {fallbackOptions.map((slot) => (
            <option key={slot.id} value={slot.id}><T k={I18nKey.APPS$MODELS_INHERIT_FROM} />{slot.label}
            </option>
          ))}
        </select>
      ) : null}
      <div style={inlineActions}>
        <Button variant="primary" onClick={() => void addUseCase()} disabled={busy}>
          <Plus size={14} /><T k={I18nKey.APPS$MODELS_ADD_USE_CASE} /></Button>
      </div>
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
        placeholder={i18n.t(I18nKey.APPS$MODELS_DISPLAY_NAME_E_G_MY_VLLM_BOX)}
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$MODELS_MODEL_DISPLAY_NAME)}
      />
      <Input
        placeholder={i18n.t(I18nKey.APPS$MODELS_BASE_URL_ENDING_IN_V1)}
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$MODELS_BASE_URL)}
      />
      <Input
        placeholder={i18n.t(I18nKey.APPS$MODELS_MODEL_ID_AS_THE_ENDPOINT_EXPECTS_IT)}
        value={modelName}
        onChange={(e) => setModelName(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$MODELS_UPSTREAM_MODEL_ID)}
      />
      <Input
        type="password"
        placeholder={i18n.t(I18nKey.APPS$MODELS_API_KEY_OPTIONAL_STORED_MASKED_IN_SETTINGS)}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        aria-label={i18n.t(I18nKey.APPS$STARTUP_API_KEY)}
      />
      <div style={inlineActions}>
        <Button variant="primary" onClick={() => void addCustom()} disabled={busy}>
          <Plus size={14} /><T k={I18nKey.APPS$MODELS_ADD_ENDPOINT} /></Button>
      </div>
      <div style={inlineActions}>
        <Input
          placeholder={i18n.t(I18nKey.APPS$MODELS_OR_A_MODEL_MANIFEST_URL_MODEL_JSON)}
          value={manifestUrl}
          onChange={(e) => setManifestUrl(e.target.value)}
          aria-label={i18n.t(I18nKey.APPS$MODELS_MANIFEST_URL)}
        />
        <Button onClick={() => void addByUrl()} disabled={busy || !manifestUrl.trim()}><T k={I18nKey.APPS$MODELS_FETCH_REGISTER} /></Button>
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
  const onRemoveSlot = (slotId: string) =>
    void act(() => api.removeUseCaseSlot(slotId), "Could not remove use case");
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
      <Badge tone="success"><T k={I18nKey.APPS$MODELS_ENGINE_RUNNING} />{engine.external ? " (external)" : ""}</Badge>
    ) : engine?.phase === "starting" ? (
      <Badge tone="warning"><T k={I18nKey.APPS$MODELS_ENGINE_STARTING} /></Badge>
    ) : engine?.phase === "error" ? (
      <Badge tone="danger" title={engine.detail}><T k={I18nKey.APPS$MODELS_ENGINE_ERROR} /></Badge>
    ) : (
      <Badge><T k={I18nKey.APPS$MODELS_ENGINE_STOPPED} /></Badge>
    );

  return (
    <ModulePage>
      <ModuleInner>
        <ModuleHeader
          title={i18n.t(I18nKey.OS$APP_MODELS)}
          subtitle={i18n.t(I18nKey.APPS$MODELS_EVERY_MODEL_THE_OS_USES_ASSIGN_USE_CASES_DOWNLOAD_LOCAL_)}
          actions={
            <div style={inlineActions}>
              {engineBadge}
              {engine?.phase === "running" && !engine.external ? (
                <Button onClick={() => void act(() => api.stopEngine(), "Could not stop engine")}>
                  <Square size={14} /><T k={I18nKey.APPS$MODELS_STOP_ENGINE} /></Button>
              ) : (
                <Button
                  disabled={engine?.phase === "starting"}
                  onClick={() => void act(() => api.startEngine(), "Could not start engine")}
                  title={i18n.t(I18nKey.APPS$MODELS_SERVE_DOWNLOADED_MODELS_LOCALLY_VIA_LLAMA_SERVER)}
                >
                  <Play size={14} /><T k={I18nKey.APPS$MODELS_START_ENGINE} /></Button>
              )}
            </div>
          }
        />

        {engine?.phase === "error" && engine.detail ? (
          <SettingsAlert tone="error">{engine.detail}</SettingsAlert>
        ) : null}

        <ModuleSection title={i18n.t(I18nKey.APPS$MODELS_USE_CASES)} count={slots.length}>
          <ModuleList>
            {slots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} onAssign={onAssign} onRemove={onRemoveSlot} />
            ))}
          </ModuleList>
          <AddUseCaseForm slots={slots} onDone={() => void refresh()} />
        </ModuleSection>

        <ModuleSection title={i18n.t(I18nKey.INSTALL$MODEL_PATH_LOCAL_LABEL)} count={localModels.length}>
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

        <ModuleSection title={i18n.t(I18nKey.APPS$MODELS_CLOUD_REMOTE_MODELS)} count={cloudModels.length}>
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

        <ModuleSection title={i18n.t(I18nKey.APPS$MODELS_ADD_A_MODEL)} count={1}>
          <AddModelForm onDone={() => void refresh()} />
        </ModuleSection>
      </ModuleInner>
    </ModulePage>
  );
}
