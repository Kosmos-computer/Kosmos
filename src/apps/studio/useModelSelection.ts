/**
 * useModelSelection — feeds the composer model picker (provider left-nav +
 * model list) from registry, Cursor, and ACP session models. Registry rows
 * get a secondary meta line (speed tier, experimental/turbo, size) when the
 * seed catalog provides it.
 *
 * Where (suppliers), grouped by connection:
 *   Local      → llama-gguf engine
 *   Ollama / OpenAI / Anthropic / OpenRouter → seeded openai-compatible
 *   Kosmos     → Kosmos Cloud gateway /v1/models (always a supplier tab)
 *   Custom     → user.custom when it is NOT the Kosmos gateway
 *
 * Who (external agents):
 *   Cursor / ACP presets
 *
 * Selecting a provider/model activates the matching agent profile when set.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACP_PRESETS,
  CURSOR_DEFAULT_MODEL,
  type AgentKind,
  type CursorModelInfo,
  type Settings,
} from "@shared/types";
import type { AgentProfile } from "@shared/agents";
import { BUILTIN_AGENT_ID } from "@shared/agents";
import type { ModelManifest, RegisteredModel, UseCaseSlotState } from "@shared/models";
import {
  customEndpointModelName,
  isKosmosCloudLlmEndpoint,
  KOSMOS_CLOUD_GATEWAY_URL,
} from "@shared/llmProviderLabels";
import type { KosmosDeployment } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import type { MenuItem } from "../../components/Menu";
import type {
  ModelPickerModel,
  ModelPickerProvider,
  ModelPickerSetup,
} from "../../components/composer/modelPickerTypes";
import { openSettingsApp, useSettingsStore } from "../settings/settingsStore";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";

const DEFAULT_MODEL_LABEL = "Local engine";
const LOCAL_PROVIDER_ID = "local";
const KOSMOS_PROVIDER_ID = "kosmos";
const CUSTOM_PROVIDER_ID = "custom";

/** Stable left-nav order for known Where tabs (after Local). */
const WHERE_TAB_ORDER = [
  "local",
  "ollama",
  "openai",
  "anthropic",
  "openrouter",
  "kosmos",
  "custom",
] as const;

const WHERE_TAB_LABELS: Record<string, string> = {
  local: "Local",
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  kosmos: "Kosmos",
  custom: "Custom",
  cloud: "Cloud",
  other: "Other",
};

type RemoteCatalog = {
  models: { id: string; name: string }[];
  loading: boolean;
  error: string | null;
  /** Gateway / endpoint rejected credentials — show connect UI instead of raw retry. */
  authRequired?: boolean;
};

const EMPTY_REMOTE: RemoteCatalog = { models: [], loading: false, error: null };

function isRemoteAuthError(message: string): boolean {
  return /credits key|authentication|invalid proxy|auth_required|401|403/i.test(message);
}

/** True when Settings already point at the Kosmos gateway with a saved key. */
function hasKosmosCreditsKey(settings: Settings | null, endpointBaseUrl: string): boolean {
  if (!settings?.apiKey?.trim()) return false;
  return (
    isKosmosCloudLlmEndpoint(endpointBaseUrl) || isKosmosCloudLlmEndpoint(settings.baseUrl ?? "")
  );
}

/** Enabled OpenAI-compatible user.custom registry row, if any. */
function customEndpointFromRegistry(
  models: RegisteredModel[],
): { baseUrl: string; model: string; name: string } | null {
  const record = models.find((m) => m.enabled && m.manifest.id === "user.custom");
  const rt = record?.manifest.runtime;
  if (!rt || rt.kind !== "openai-compatible") return null;
  const baseUrl = rt.baseUrl?.trim();
  if (!baseUrl) return null;
  return {
    baseUrl,
    model: rt.model?.trim() || "",
    name: record!.manifest.name,
  };
}

/** Left-nav Where tab for a registry manifest (connection / key, not brand name). */
function whereTabIdForManifest(manifest: ModelManifest): string {
  if (manifest.id === "user.custom") return CUSTOM_PROVIDER_ID;
  const rt = manifest.runtime;
  if (rt.kind === "llama-gguf" || rt.kind === "voice-engine") return LOCAL_PROVIDER_ID;
  if (rt.kind === "openai-compatible") {
    const provider =
      typeof manifest.meta?.provider === "string" ? manifest.meta.provider.trim().toLowerCase() : "";
    const keyRef = rt.apiKeyRef?.trim().toLowerCase() || "";
    const tab = keyRef || provider;
    if (tab === "local") return LOCAL_PROVIDER_ID;
    if (tab) return tab;
    return "cloud";
  }
  return "other";
}

function whereTabIdForModelId(
  modelId: string,
  registryById: Record<string, RegisteredModel>,
): string {
  const record = registryById[modelId];
  if (record) return whereTabIdForManifest(record.manifest);
  const prefix = modelId.split(".")[0]?.toLowerCase() || "";
  if (prefix === "local") return LOCAL_PROVIDER_ID;
  if (prefix === "user") return CUSTOM_PROVIDER_ID;
  if (prefix) return prefix;
  return LOCAL_PROVIDER_ID;
}

function whereTabLabel(tabId: string): string {
  return WHERE_TAB_LABELS[tabId] ?? tabId.charAt(0).toUpperCase() + tabId.slice(1);
}

function compareWhereTabIds(a: string, b: string): number {
  const ai = WHERE_TAB_ORDER.indexOf(a as (typeof WHERE_TAB_ORDER)[number]);
  const bi = WHERE_TAB_ORDER.indexOf(b as (typeof WHERE_TAB_ORDER)[number]);
  const aOrder = ai === -1 ? 100 : ai;
  const bOrder = bi === -1 ? 100 : bi;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.localeCompare(b);
}

export interface AcpModelState {
  availableModels: { modelId: string; name: string; description?: string | null }[];
  currentModelId: string;
}

export interface UseModelSelectionOptions {
  activeProfile?: AgentProfile | null;
  agents?: AgentProfile[];
  setProfileId?: (id: string) => void;
  /** Chat/Studio session id — used to warm/read ACP models. */
  sessionId?: string | null;
}

export interface UseModelSelectionResult {
  modelLabel: string;
  /** Flat items for overflow menus / backward compatibility. */
  modelItems: MenuItem[];
  /** True when the active provider has selectable models. */
  modelInteractive: boolean;
  providers: ModelPickerProvider[];
  activeProviderId: string;
  selectProvider: (providerId: string) => void;
}

function hasCursorKey(settings: Settings | null): boolean {
  return Boolean(settings?.cursorApiKey?.trim());
}

/** True when Settings has a usable key for a registry apiKeyRef (openai, …). */
function hasProviderKey(settings: Settings | null, keyRef: string): boolean {
  if (!settings) return false;
  if (settings.apiKeys?.[keyRef]?.trim()) return true;
  // Legacy single-key mirror: counts when Settings.provider matches the ref.
  if (settings.provider === keyRef && settings.apiKey?.trim()) return true;
  return false;
}

function isAcpAuthError(message: string): boolean {
  return /auth|api key|sign in|login|unauthenticated/i.test(message);
}

/** Cloud Where tabs that need an API key before models are usable. */
const KEYED_WHERE_SUPPLIERS: Record<
  string,
  { keyRef: string; keyLabel: string; blurb: string }
> = {
  openai: {
    keyRef: "openai",
    keyLabel: "OpenAI API key",
    blurb: "Paste an OpenAI API key to use GPT models from this picker.",
  },
  anthropic: {
    keyRef: "anthropic",
    keyLabel: "Anthropic API key",
    blurb: "Paste an Anthropic API key to use Claude models from this picker.",
  },
  openrouter: {
    keyRef: "openrouter",
    keyLabel: "OpenRouter API key",
    blurb: "Paste an OpenRouter API key to route many models through one account.",
  },
};

/** Always offer these Where tabs — empty ones get a configure screen. */
const ALWAYS_WHERE_TABS = ["local", "ollama", "openai", "anthropic", "openrouter"] as const;

/**
 * Copy + key wallet ref for each ACP preset. CLI login still works without a
 * key; the picker only forces the configure screen when handshake auth fails
 * (or the OpenAI key is clearly missing for Codex).
 */
function acpAuthHints(profile: AgentProfile): {
  keyRef: "openai" | "anthropic" | "gemini" | null;
  keyLabel: string;
  cliHint: string;
} {
  const presetId = profile.runtime.kind === "acp" ? profile.runtime.acpPresetId : undefined;
  switch (presetId) {
    case "codex":
      return { keyRef: "openai", keyLabel: "OpenAI API key", cliHint: "`codex login`" };
    case "claude-code":
      return { keyRef: "anthropic", keyLabel: "Anthropic API key", cliHint: "`claude /login`" };
    case "gemini":
      return { keyRef: "gemini", keyLabel: "Gemini API key", cliHint: "`gemini`" };
    default:
      return { keyRef: null, keyLabel: "API key", cliHint: "the provider CLI" };
  }
}

function resolveModelRuntime(
  profile: AgentProfile | null | undefined,
  settings: Settings | null,
): AgentKind {
  const fromProfile = profile?.runtime.kind;
  if (fromProfile) return fromProfile;
  return settings?.agent ?? "builtin";
}

function cursorLabel(settings: Settings, cursorModels: CursorModelInfo[]): string {
  const modelId = settings.cursorModel?.trim() || CURSOR_DEFAULT_MODEL;
  const display = cursorModels.find((m) => m.id === modelId)?.displayName ?? modelId;
  return `Cursor · ${display}`;
}

function acpProviderLabel(profile: AgentProfile): string {
  if (profile.runtime.kind === "acp") {
    const fromPreset = ACP_PRESETS.find((p) => p.id === profile.runtime.acpPresetId);
    return fromPreset?.label ?? profile.name;
  }
  return profile.name;
}

function registryModelLabel(
  model: { id: string; name: string },
  settings: Settings | null,
  deployment: KosmosDeployment | null,
): string {
  if (model.id !== "user.custom" && model.name !== "Custom endpoint") return model.name;
  return customEndpointModelName(settings?.baseUrl ?? "", deployment);
}

/** Human labels for curated `meta.speedTier` values (local GGUF catalog). */
const SPEED_TIER_LABEL: Record<string, string> = {
  fastest: "Fastest",
  fast: "Fast",
  balanced: "Balanced",
  big: "Big",
};

/** Compact download-size label for the picker secondary line. */
function formatModelSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

/**
 * Secondary picker line from registry editorial meta: speed tier, experimental /
 * turbo flags, and GGUF size (or Paid for cloud). Returns undefined when empty
 * so the menu stays single-line for models without curated metadata.
 */
function registryModelPickerDescription(record: RegisteredModel | undefined): string | undefined {
  if (!record) return undefined;
  const parts: string[] = [];
  const tier = record.manifest.meta?.speedTier;
  if (typeof tier === "string") {
    const label = SPEED_TIER_LABEL[tier];
    if (label) parts.push(label);
  }
  if (record.manifest.meta?.experimental === true) parts.push("Experimental");
  const rt = record.manifest.runtime;
  if (rt.kind === "llama-gguf" && rt.draft) parts.push("Turbo");
  if (rt.kind === "llama-gguf" && rt.sizeBytes > 0) {
    parts.push(formatModelSize(rt.sizeBytes));
  } else if (record.manifest.meta?.costTier === "paid") {
    parts.push("Paid");
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function providerIdForProfile(
  profile: AgentProfile,
  opts?: {
    settings?: Settings | null;
    deployment?: KosmosDeployment | null;
    endpointBaseUrl?: string | null;
    effectiveModelId?: string | null;
    registryById?: Record<string, RegisteredModel>;
  },
): string {
  if (profile.runtime.kind === "cursor") return "cursor";
  if (profile.runtime.kind === "acp") {
    return `acp:${profile.runtime.acpPresetId ?? profile.id}`;
  }
  if (profile.runtime.kind === "kosmos") return KOSMOS_PROVIDER_ID;
  if (profile.runtime.kind === "builtin") {
    const effectiveId = opts?.effectiveModelId ?? null;
    if (effectiveId === "user.custom" || (!effectiveId && opts?.settings?.provider === "custom")) {
      const baseUrl = opts?.endpointBaseUrl || opts?.settings?.baseUrl || "";
      // Kosmos supplier = gateway host only. Other baseUrls stay under Custom
      // even on billing-managed tenants (OpenRouter must not become "Kosmos").
      if (isKosmosCloudLlmEndpoint(baseUrl)) return KOSMOS_PROVIDER_ID;
      if (baseUrl.trim()) return CUSTOM_PROVIDER_ID;
      // No endpoint saved yet — default the chip to the Kosmos supplier tab.
      return KOSMOS_PROVIDER_ID;
    }
    if (effectiveId) {
      return whereTabIdForModelId(effectiveId, opts?.registryById ?? {});
    }
    return LOCAL_PROVIDER_ID;
  }
  return profile.runtime.kind;
}

function isEndpointModelId(id: string): boolean {
  return id === "user.custom";
}

function acpCommandForProfile(profile: AgentProfile, settings: Settings | null): string {
  const presetId = profile.runtime.acpPresetId;
  if (presetId) {
    const preset = ACP_PRESETS.find((p) => p.id === presetId);
    if (preset?.command) return preset.command;
  }
  return settings?.acpCommand ?? "";
}

function acpSessionKey(sessionId: string | null | undefined, providerId: string): string {
  return sessionId?.trim() || `probe:${providerId}`;
}

export function useModelSelection(
  activeProfileOrOpts?: AgentProfile | null | UseModelSelectionOptions,
  maybeAgents?: AgentProfile[],
  maybeSetProfileId?: (id: string) => void,
  maybeSessionId?: string | null,
): UseModelSelectionResult {
  // Support legacy call signature: useModelSelection(active)
  const opts: UseModelSelectionOptions =
    activeProfileOrOpts &&
    typeof activeProfileOrOpts === "object" &&
    ("activeProfile" in activeProfileOrOpts ||
      "agents" in activeProfileOrOpts ||
      "sessionId" in activeProfileOrOpts ||
      "setProfileId" in activeProfileOrOpts)
      ? activeProfileOrOpts
      : {
          activeProfile: (activeProfileOrOpts as AgentProfile | null | undefined) ?? null,
          agents: maybeAgents,
          setProfileId: maybeSetProfileId,
          sessionId: maybeSessionId,
        };

  const { activeProfile, agents = [], setProfileId, sessionId } = opts;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [cursorModels, setCursorModels] = useState<CursorModelInfo[]>([]);
  const [agentSlot, setAgentSlot] = useState<UseCaseSlotState | null>(null);
  const [registryById, setRegistryById] = useState<Record<string, RegisteredModel>>({});
  const [deployment, setDeployment] = useState<KosmosDeployment | null>(null);
  const [endpointConfig, setEndpointConfig] = useState<{
    baseUrl: string;
    model: string;
    name: string;
  } | null>(null);
  const [acpModelsByProvider, setAcpModelsByProvider] = useState<
    Record<string, AcpModelState | null>
  >({});
  const [acpErrorsByProvider, setAcpErrorsByProvider] = useState<Record<string, string>>({});
  const [acpLoading, setAcpLoading] = useState<string | null>(null);
  const [remoteByProvider, setRemoteByProvider] = useState<Record<string, RemoteCatalog>>({});

  const authPhase = useAuthStore((s) => s.phase);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);
  const bumpSettingsRevision = useSettingsStore((s) => s.bumpSettingsRevision);
  const notify = useOsStore((s) => s.notify);

  const runtime = resolveModelRuntime(activeProfile, settings);
  // Prefer the registered user.custom endpoint; fall back to Settings when the
  // active connection is already custom/Kosmos (even before registry loads).
  const endpointBaseUrl =
    endpointConfig?.baseUrl ||
    (settings?.provider === "custom" ? settings.baseUrl.trim() : "") ||
    "";
  const endpointIsKosmosGateway = isKosmosCloudLlmEndpoint(endpointBaseUrl);
  /** Non-Kosmos user.custom — own Where tab, never relabeled Kosmos. */
  const customBaseUrl = endpointBaseUrl && !endpointIsKosmosGateway ? endpointBaseUrl : "";
  /** Kosmos Cloud supplier always points at the gateway (or the saved gateway URL). */
  const kosmosBaseUrl = endpointIsKosmosGateway ? endpointBaseUrl : KOSMOS_CLOUD_GATEWAY_URL;
  const showCustomSupplier = Boolean(customBaseUrl);
  const activeOnKosmos =
    agentSlot?.effective?.modelId === "user.custom" && endpointIsKosmosGateway;
  const activeOnCustom =
    agentSlot?.effective?.modelId === "user.custom" && Boolean(customBaseUrl);
  const activeProviderId = activeProfile
    ? providerIdForProfile(activeProfile, {
        settings,
        deployment,
        endpointBaseUrl,
        effectiveModelId: agentSlot?.effective?.modelId ?? null,
        registryById,
      })
    : runtime === "cursor"
      ? "cursor"
      : runtime === "acp"
        ? "acp:default"
        : runtime === "kosmos" || activeOnKosmos
          ? KOSMOS_PROVIDER_ID
          : activeOnCustom
            ? CUSTOM_PROVIDER_ID
            : agentSlot?.effective?.modelId
              ? whereTabIdForModelId(agentSlot.effective.modelId, registryById)
              : LOCAL_PROVIDER_ID;

  useEffect(() => {
    if (authPhase !== "ready") return;
    let cancelled = false;
    void Promise.all([api.getSettings(), api.getModels(), api.workspaceFeatures()])
      .then(([loaded, registry, features]) => {
        if (cancelled) return;
        setSettings(loaded);
        setAgentSlot(registry.slots.find((s) => s.id === "agent.chat") ?? null);
        setRegistryById(
          Object.fromEntries(registry.models.map((m) => [m.manifest.id, m])),
        );
        setDeployment(features.kosmos ?? null);
        setEndpointConfig(customEndpointFromRegistry(registry.models));
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [authPhase, settingsRevision]);

  useEffect(() => {
    if (authPhase !== "ready" || !hasCursorKey(settings)) return;
    let cancelled = false;
    api
      .listCursorModels()
      .then((result) => {
        if (!cancelled) setCursorModels(result.models);
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, [authPhase, settings?.cursorApiKey]);

  const save = useCallback(
    async (patch: Partial<Settings>, errorMessage: string) => {
      try {
        const saved = await api.saveSettings(patch);
        setSettings(saved);
      } catch {
        notify(errorMessage);
      }
    },
    [notify],
  );

  const activateProfile = useCallback(
    (profileId: string | undefined) => {
      if (profileId && setProfileId) setProfileId(profileId);
    },
    [setProfileId],
  );

  const selectRegistryModel = useCallback(
    async (modelId: string, profileId?: string) => {
      try {
        activateProfile(profileId ?? BUILTIN_AGENT_ID);
        const { slots } = await api.assignModelSlot("agent.chat", modelId);
        setAgentSlot(slots.find((s) => s.id === "agent.chat") ?? null);
        if (settings?.agent !== "builtin") {
          await save({ agent: "builtin" }, "Could not switch agent");
        }
        bumpSettingsRevision();
      } catch {
        notify("Could not switch model — check Settings permissions");
      }
    },
    [activateProfile, bumpSettingsRevision, notify, save, settings?.agent],
  );

  const selectCursor = useCallback(
    (modelId?: string, profileId?: string) => {
      if (!hasCursorKey(settings)) {
        openSettingsApp("agent");
        notify("Add a Cursor API key in Settings → Agent");
        return;
      }
      activateProfile(profileId);
      void save(
        {
          agent: "cursor",
          cursorModel: modelId ?? (settings?.cursorModel?.trim() || CURSOR_DEFAULT_MODEL),
        },
        "Could not switch to Cursor — check Settings permissions",
      );
    },
    [activateProfile, notify, save, settings],
  );

  const selectEndpointModel = useCallback(
    async (modelId: string, baseUrl: string, profileId?: string) => {
      const trimmed = baseUrl.trim();
      if (!trimmed) {
        notify("No endpoint configured — connect Kosmos or set a custom base URL in Settings");
        return;
      }
      activateProfile(profileId ?? BUILTIN_AGENT_ID);
      try {
        await save(
          {
            agent: "builtin",
            provider: "custom",
            baseUrl: trimmed,
            model: modelId,
          },
          "Could not switch model — check Settings permissions",
        );
        const { slots } = await api.assignModelSlot("agent.chat", "user.custom");
        setAgentSlot(slots.find((s) => s.id === "agent.chat") ?? null);
        const name = isKosmosCloudLlmEndpoint(trimmed) ? "Kosmos" : "Custom endpoint";
        setEndpointConfig({ baseUrl: trimmed, model: modelId, name });
        bumpSettingsRevision();
      } catch {
        notify("Could not switch model — check Settings permissions");
      }
    },
    [activateProfile, bumpSettingsRevision, notify, save],
  );

  const loadRemoteModels = useCallback(
    async (providerId: string, baseUrl: string, opts?: { apiKey?: string }) => {
      const trimmed = baseUrl.trim();
      if (!trimmed) {
        setRemoteByProvider((prev) => ({
          ...prev,
          [providerId]: { models: [], loading: false, error: "No endpoint configured" },
        }));
        return;
      }
      setRemoteByProvider((prev) => ({
        ...prev,
        [providerId]: {
          models: prev[providerId]?.models ?? [],
          loading: true,
          error: null,
          authRequired: false,
        },
      }));
      try {
        const result = await api.listRemoteLlmModels({
          baseUrl: trimmed,
          ...(opts?.apiKey ? { apiKey: opts.apiKey } : {}),
        });
        setRemoteByProvider((prev) => ({
          ...prev,
          [providerId]: { models: result.models, loading: false, error: null, authRequired: false },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not list models";
        setRemoteByProvider((prev) => ({
          ...prev,
          [providerId]: {
            models: [],
            loading: false,
            error: message,
            authRequired: isRemoteAuthError(message),
          },
        }));
      }
    },
    [],
  );

  const kosmosReady = hasKosmosCreditsKey(settings, endpointBaseUrl);

  useEffect(() => {
    if (authPhase !== "ready") return;
    if (!kosmosReady) {
      setRemoteByProvider((prev) => ({
        ...prev,
        [KOSMOS_PROVIDER_ID]: {
          models: [],
          loading: false,
          error: null,
          authRequired: true,
        },
      }));
      return;
    }
    void loadRemoteModels(KOSMOS_PROVIDER_ID, kosmosBaseUrl);
  }, [authPhase, kosmosBaseUrl, kosmosReady, loadRemoteModels, settingsRevision]);

  useEffect(() => {
    if (authPhase !== "ready" || !showCustomSupplier || !customBaseUrl) return;
    void loadRemoteModels(CUSTOM_PROVIDER_ID, customBaseUrl);
  }, [authPhase, customBaseUrl, loadRemoteModels, settingsRevision, showCustomSupplier]);

  const loadAcpModels = useCallback(
    async (providerId: string, profile: AgentProfile) => {
      const command = acpCommandForProfile(profile, settings);
      if (!command.trim()) {
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: null }));
        setAcpErrorsByProvider((prev) => ({
          ...prev,
          [providerId]: "No ACP command configured for this provider",
        }));
        return;
      }
      const key = acpSessionKey(sessionId, providerId);
      setAcpLoading(providerId);
      try {
        const state = await api.ensureAcpModels({ sessionKey: key, acpCommand: command });
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: state.models }));
        setAcpErrorsByProvider((prev) => {
          const next = { ...prev };
          delete next[providerId];
          return next;
        });
      } catch (err) {
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: null }));
        const message = err instanceof Error ? err.message : "Could not load ACP models";
        setAcpErrorsByProvider((prev) => ({ ...prev, [providerId]: message }));
        // Auth failures get an inline configure screen — skip the toast noise.
        if (!isAcpAuthError(message)) notify(message);
      } finally {
        setAcpLoading((current) => (current === providerId ? null : current));
      }
    },
    [notify, sessionId, settings],
  );

  const selectAcpModel = useCallback(
    async (providerId: string, profile: AgentProfile, modelId: string) => {
      const command = acpCommandForProfile(profile, settings);
      if (!command.trim()) {
        notify("No ACP command configured for this provider");
        return;
      }
      activateProfile(profile.id);
      const key = acpSessionKey(sessionId, providerId);
      try {
        const state = await api.setAcpModel({
          sessionKey: key,
          acpCommand: command,
          modelId,
        });
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: state.models }));
        if (settings?.agent !== "acp") {
          await save(
            {
              agent: "acp",
              acpCommand: command,
            },
            "Could not switch agent",
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not switch ACP model";
        notify(message);
      }
    },
    [activateProfile, notify, save, sessionId, settings],
  );

  const acpProfiles = useMemo(
    () => agents.filter((a) => a.enabled && a.runtime.kind === "acp"),
    [agents],
  );

  // Warm ACP models for the active ACP profile (once per provider key).
  useEffect(() => {
    if (authPhase !== "ready" || !activeProfile || activeProfile.runtime.kind !== "acp") return;
    const providerId = providerIdForProfile(activeProfile, {
      settings,
      deployment,
      endpointBaseUrl,
      effectiveModelId: agentSlot?.effective?.modelId ?? null,
      registryById,
    });
    if (providerId in acpModelsByProvider || acpLoading === providerId) return;
    void loadAcpModels(providerId, activeProfile);
  }, [
    authPhase,
    activeProfile,
    acpModelsByProvider,
    acpLoading,
    loadAcpModels,
    settings,
    deployment,
    endpointBaseUrl,
    agentSlot?.effective?.modelId,
    registryById,
  ]);

  const providers = useMemo<ModelPickerProvider[]>(() => {
    const list: ModelPickerProvider[] = [];

    const builtinProfile =
      agents.find((a) => a.id === BUILTIN_AGENT_ID) ??
      agents.find((a) => a.runtime.kind === "builtin");
    const builtinProfileId = builtinProfile?.id ?? BUILTIN_AGENT_ID;
    const effectiveId = agentSlot?.effective?.modelId ?? null;

    // Group agent.chat eligible models into Where tabs by connection.
    const whereBuckets = new Map<string, { id: string; name: string }[]>();
    for (const m of agentSlot?.eligible ?? []) {
      if (isEndpointModelId(m.id)) continue;
      const tabId = whereTabIdForModelId(m.id, registryById);
      const bucket = whereBuckets.get(tabId) ?? [];
      bucket.push(m);
      whereBuckets.set(tabId, bucket);
    }

    const whereTabIds = new Set([
      ...ALWAYS_WHERE_TABS,
      ...whereBuckets.keys(),
    ]);
    // Kosmos / Custom are pushed separately as endpoint suppliers.
    whereTabIds.delete(KOSMOS_PROVIDER_ID);
    whereTabIds.delete(CUSTOM_PROVIDER_ID);

    const openModelsApp = () =>
      openShellWindow({ type: "system", app: "models" }, systemAppTitle("models"));

    for (const tabId of Array.from(whereTabIds).sort(compareWhereTabIds)) {
      const entries = whereBuckets.get(tabId) ?? [];
      const models: ModelPickerModel[] = entries.map((m) => ({
        id: `model-${m.id}`,
        label: registryModelLabel(m, settings, deployment),
        description: registryModelPickerDescription(registryById[m.id]),
        checked: effectiveId === m.id,
        onSelect: () => void selectRegistryModel(m.id, builtinProfileId),
      }));
      const label = whereTabLabel(tabId);
      const keyed = KEYED_WHERE_SUPPLIERS[tabId];
      let setup: ModelPickerSetup | undefined;

      if (keyed && !hasProviderKey(settings, keyed.keyRef)) {
        setup = {
          title: `Connect ${label}`,
          description: keyed.blurb,
          keyLabel: keyed.keyLabel,
          keyPlaceholder: `Paste ${keyed.keyLabel}`,
          onSaveKey: async (apiKey) => {
            const patch: Partial<Settings> = {
              apiKeys: { ...(settings?.apiKeys ?? {}), [keyed.keyRef]: apiKey },
            };
            // Keep the legacy mirror in sync when this is the active provider.
            if (!settings?.provider || settings.provider === keyed.keyRef) {
              patch.provider = keyed.keyRef as Settings["provider"];
              patch.apiKey = apiKey;
            }
            await save(patch, `Could not save ${keyed.keyLabel}`);
            bumpSettingsRevision();
          },
          primaryLabel: "Open Settings → Model",
          onPrimary: () => {
            openSettingsApp("model");
            notify(`Add a ${keyed.keyLabel} in Settings → Model`);
          },
        };
      } else if (tabId === LOCAL_PROVIDER_ID && models.length === 0) {
        setup = {
          title: "Add local models",
          description:
            "Download or enable a GGUF in the Models app to chat with the on-device engine.",
          primaryLabel: "Open Models",
          onPrimary: openModelsApp,
        };
      } else if (tabId === "ollama" && models.length === 0) {
        setup = {
          title: "Connect Ollama",
          description:
            "Start the Ollama app (or `ollama serve`), pull a model, then enable it in Models. No API key required.",
          primaryLabel: "Open Models",
          onPrimary: openModelsApp,
          secondaryLabel: "Open Settings → Model",
          onSecondary: () => openSettingsApp("model"),
        };
      } else if (keyed && models.length === 0) {
        setup = {
          title: `Enable ${label} models`,
          description: `Your ${keyed.keyLabel} is saved, but no ${label} models are enabled for chat yet.`,
          primaryLabel: "Open Models",
          onPrimary: openModelsApp,
        };
      } else if (models.length === 0) {
        // Unknown empty supplier — skip rather than show a blank tab.
        continue;
      }

      list.push({
        id: tabId,
        label,
        kind: "builtin",
        group: "where",
        profileId: builtinProfileId,
        models: setup ? [] : models,
        setup,
        inactive: Boolean(setup),
      });
    }

    const pushEndpointSupplier = (
      providerId: string,
      label: string,
      kind: "kosmos" | "custom",
      baseUrl: string,
      catalog: RemoteCatalog,
      setup?: ModelPickerSetup,
    ) => {
      const activeOnThisTab =
        effectiveId === "user.custom" &&
        (providerId === KOSMOS_PROVIDER_ID ? activeOnKosmos : activeOnCustom);
      const currentRemoteId = activeOnThisTab
        ? (settings?.model || endpointConfig?.model || null)
        : null;
      let endpointModels: ModelPickerModel[] = [];
      let emptyMessage: string | undefined;
      let inactive = false;

      if (setup) {
        inactive = true;
      } else if (catalog.loading) {
        inactive = true;
        emptyMessage = "Loading models…";
        endpointModels = [
          {
            id: `${providerId}-loading`,
            label: "Loading models…",
            disabled: true,
            onSelect: () => {},
          },
        ];
      } else if (catalog.models.length > 0) {
        endpointModels = catalog.models.map((m) => ({
          id: `${providerId}-${m.id}`,
          label: m.name,
          checked: currentRemoteId === m.id,
          onSelect: () => void selectEndpointModel(m.id, baseUrl, builtinProfileId),
        }));
      } else {
        // Never put upstream error text in the menu — providers may echo API keys.
        emptyMessage = catalog.error
          ? "Could not load models"
          : "No models returned by this endpoint";
        endpointModels = [
          {
            id: `${providerId}-retry`,
            label: catalog.error ? "Retry loading models" : "Load models",
            onSelect: () => void loadRemoteModels(providerId, baseUrl),
          },
        ];
      }

      list.push({
        id: providerId,
        label,
        kind,
        group: "where",
        profileId: builtinProfileId,
        models: endpointModels,
        emptyMessage,
        setup,
        inactive,
      });
    };

    const kosmosCatalog = remoteByProvider[KOSMOS_PROVIDER_ID] ?? EMPTY_REMOTE;
    const kosmosSetup: ModelPickerSetup | undefined =
      !kosmosCatalog.loading && (kosmosCatalog.authRequired || !kosmosReady)
        ? {
            title: "Connect Kosmos Cloud",
            description:
              "Kosmos models use a credits key from your Kosmos subscription — not an OpenAI or Anthropic API key. Paste your credits key to load the catalog.",
            keyLabel: "Kosmos credits key",
            keyPlaceholder: "Paste Kosmos credits key",
            onSaveKey: async (apiKey) => {
              await save(
                {
                  agent: "builtin",
                  provider: "custom",
                  baseUrl: KOSMOS_CLOUD_GATEWAY_URL,
                  apiKey,
                },
                "Could not save Kosmos credits key",
              );
              bumpSettingsRevision();
              await loadRemoteModels(KOSMOS_PROVIDER_ID, KOSMOS_CLOUD_GATEWAY_URL, { apiKey });
            },
            primaryLabel: "Open Settings → Usage",
            onPrimary: () => {
              openSettingsApp("usage");
              notify("Add a Kosmos credits key under Settings → Model, or buy credits under Usage");
            },
            secondaryLabel: "Retry",
            onSecondary: () => void loadRemoteModels(KOSMOS_PROVIDER_ID, kosmosBaseUrl),
          }
        : undefined;

    // Kosmos is always a supplier tab (gateway catalog), peer of OpenAI — not Custom.
    pushEndpointSupplier(
      KOSMOS_PROVIDER_ID,
      "Kosmos",
      "kosmos",
      kosmosBaseUrl,
      kosmosCatalog,
      kosmosSetup,
    );

    const customCatalog = remoteByProvider[CUSTOM_PROVIDER_ID] ?? EMPTY_REMOTE;
    if (showCustomSupplier && customBaseUrl) {
      const customSetup: ModelPickerSetup | undefined =
        !customCatalog.loading && customCatalog.authRequired
          ? {
              title: "Connect Custom endpoint",
              description:
                "This endpoint rejected the saved API key. Paste a valid key for your custom OpenAI-compatible base URL.",
              keyLabel: "API key",
              keyPlaceholder: "Paste API key",
              onSaveKey: async (apiKey) => {
                const patch: Partial<Settings> = {
                  apiKeys: { ...(settings?.apiKeys ?? {}), custom: apiKey },
                };
                if (settings?.provider === "custom") patch.apiKey = apiKey;
                await save(patch, "Could not save API key");
                bumpSettingsRevision();
                await loadRemoteModels(CUSTOM_PROVIDER_ID, customBaseUrl, { apiKey });
              },
              primaryLabel: "Open Settings → Model",
              onPrimary: () => {
                openSettingsApp("model");
                notify("Add a custom endpoint API key in Settings → Model");
              },
              secondaryLabel: "Retry",
              onSecondary: () => void loadRemoteModels(CUSTOM_PROVIDER_ID, customBaseUrl),
            }
          : undefined;
      pushEndpointSupplier(
        CUSTOM_PROVIDER_ID,
        "Custom",
        "custom",
        customBaseUrl,
        customCatalog,
        customSetup,
      );
    } else {
      const customSetup: ModelPickerSetup = {
        title: "Connect Custom endpoint",
        description:
          "Paste an OpenAI-compatible base URL and API key to load models from your own gateway or proxy.",
        urlLabel: "Base URL",
        urlPlaceholder: "https://api.example.com/v1",
        keyLabel: "API key",
        keyPlaceholder: "Paste API key",
        onSaveConnection: async ({ apiKey, baseUrl }) => {
          const trimmed = baseUrl?.trim() ?? "";
          if (!trimmed) {
            notify("Enter a base URL for the custom endpoint");
            return;
          }
          await save(
            {
              agent: "builtin",
              provider: "custom",
              baseUrl: trimmed,
              apiKey,
              apiKeys: { ...(settings?.apiKeys ?? {}), custom: apiKey },
            },
            "Could not save custom endpoint",
          );
          setEndpointConfig({ baseUrl: trimmed, model: "", name: "Custom endpoint" });
          bumpSettingsRevision();
          await loadRemoteModels(CUSTOM_PROVIDER_ID, trimmed, { apiKey });
        },
        primaryLabel: "Open Settings → Model",
        onPrimary: () => {
          openSettingsApp("model");
          notify("Configure a custom endpoint in Settings → Model");
        },
      };
      pushEndpointSupplier(
        CUSTOM_PROVIDER_ID,
        "Custom",
        "custom",
        "",
        EMPTY_REMOTE,
        customSetup,
      );
    }

    const cursorProfile = agents.find((a) => a.runtime.kind === "cursor");
    let cursorModelItems: ModelPickerModel[] = [];
    let cursorSetup: ModelPickerSetup | undefined;
    if (!hasCursorKey(settings)) {
      cursorSetup = {
        title: "Connect Cursor",
        description:
          "Add a Cursor API key to use Cursor models from this picker. You can paste it here or open Settings → Agent.",
        keyLabel: "Cursor API key",
        keyPlaceholder: "Paste Cursor API key",
        onSaveKey: async (apiKey) => {
          await save({ cursorApiKey: apiKey }, "Could not save Cursor API key");
          bumpSettingsRevision();
          selectCursor(undefined, cursorProfile?.id);
        },
        primaryLabel: "Open Settings → Agent",
        onPrimary: () => {
          openSettingsApp("agent");
          notify("Add a Cursor API key in Settings → Agent");
        },
      };
    } else if (cursorModels.length === 0) {
      cursorModelItems = [
        {
          id: "cursor-default",
          label: settings ? cursorLabel(settings, cursorModels) : "Cursor",
          checked: true,
          onSelect: () => selectCursor(undefined, cursorProfile?.id),
        },
      ];
    } else {
      cursorModelItems = cursorModels.map((model) => ({
        id: `cursor-${model.id}`,
        label: model.displayName,
        checked: (settings?.cursorModel || CURSOR_DEFAULT_MODEL) === model.id,
        onSelect: () => selectCursor(model.id, cursorProfile?.id),
      }));
    }
    list.push({
      id: "cursor",
      label: "Cursor",
      kind: "cursor",
      group: "who",
      profileId: cursorProfile?.id,
      models: cursorModelItems,
      setup: cursorSetup,
      inactive: Boolean(cursorSetup),
    });

    for (const profile of acpProfiles) {
      const providerId = providerIdForProfile(profile, {
        settings,
        deployment,
        endpointBaseUrl,
        effectiveModelId: agentSlot?.effective?.modelId ?? null,
        registryById,
      });
      const state = acpModelsByProvider[providerId];
      const loading = acpLoading === providerId;
      const error = acpErrorsByProvider[providerId];
      const label = acpProviderLabel(profile);
      const hints = acpAuthHints(profile);
      // Only after a failed handshake — CLI login can succeed without a saved key.
      const needsAuthSetup = Boolean(error && isAcpAuthError(error));
      let models: ModelPickerModel[] = [];
      let emptyMessage: string | undefined;
      let inactive = false;
      let setup: ModelPickerSetup | undefined;

      if (state?.availableModels?.length) {
        models = state.availableModels.map((m) => ({
          id: `acp-${providerId}-${m.modelId}`,
          label: m.name,
          description: m.description ?? undefined,
          checked: state.currentModelId === m.modelId,
          onSelect: () => void selectAcpModel(providerId, profile, m.modelId),
        }));
      } else if (loading) {
        emptyMessage = "Loading models…";
        inactive = true;
        models = [
          {
            id: `acp-loading-${providerId}`,
            label: "Loading models…",
            disabled: true,
            onSelect: () => {},
          },
        ];
      } else if (needsAuthSetup) {
        inactive = true;
        setup = {
          title: `Connect ${label}`,
          description:
            error && isAcpAuthError(error)
              ? `${label} needs authentication before it can list models. Paste an API key below, or sign in with ${hints.cliHint} in a terminal.`
              : `Add an API key for ${label}, or sign in with ${hints.cliHint} in a terminal. Then retry to load models.`,
          keyLabel: hints.keyLabel,
          keyPlaceholder: `Paste ${hints.keyLabel}`,
          onSaveKey: hints.keyRef
            ? async (apiKey) => {
                const patch: Partial<Settings> =
                  hints.keyRef === "openai"
                    ? { apiKey, apiKeys: { ...(settings?.apiKeys ?? {}), openai: apiKey } }
                    : { apiKeys: { ...(settings?.apiKeys ?? {}), [hints.keyRef!]: apiKey } };
                await save(patch, `Could not save ${hints.keyLabel}`);
                bumpSettingsRevision();
                await loadAcpModels(providerId, profile);
              }
            : undefined,
          primaryLabel: "Open Settings → Model",
          onPrimary: () => {
            openSettingsApp("model");
            notify(`Add a ${hints.keyLabel} in Settings → Model`);
          },
          secondaryLabel: "Retry",
          onSecondary: () => void loadAcpModels(providerId, profile),
        };
      } else {
        emptyMessage = sessionId
          ? "No models advertised — click to retry"
          : "Start a chat, then open this tab to load models";
        models = [
          {
            id: `acp-retry-${providerId}`,
            label: sessionId ? "Retry loading models" : "Load models",
            onSelect: () => void loadAcpModels(providerId, profile),
          },
        ];
      }

      list.push({
        id: providerId,
        label,
        kind: "acp",
        group: "who",
        profileId: profile.id,
        models,
        emptyMessage,
        setup,
        inactive,
      });
    }

    return list;
  }, [
    acpErrorsByProvider,
    acpLoading,
    acpModelsByProvider,
    acpProfiles,
    activeOnCustom,
    activeOnKosmos,
    agentSlot,
    agents,
    bumpSettingsRevision,
    cursorModels,
    customBaseUrl,
    endpointConfig?.model,
    kosmosBaseUrl,
    kosmosReady,
    loadAcpModels,
    loadRemoteModels,
    notify,
    registryById,
    remoteByProvider,
    save,
    selectAcpModel,
    selectCursor,
    selectEndpointModel,
    selectRegistryModel,
    sessionId,
    settings,
    showCustomSupplier,
  ]);

  const selectProvider = useCallback(
    (providerId: string) => {
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) return;
      if (provider.profileId) activateProfile(provider.profileId);
      if (provider.kind === "acp" && provider.profileId) {
        const profile = agents.find((a) => a.id === provider.profileId);
        if (profile && !(providerId in acpModelsByProvider) && acpLoading !== providerId) {
          void loadAcpModels(providerId, profile);
        }
      }
      if (provider.kind === "kosmos") {
        const catalog = remoteByProvider[KOSMOS_PROVIDER_ID];
        if (!catalog?.models.length && !catalog?.loading) {
          void loadRemoteModels(KOSMOS_PROVIDER_ID, kosmosBaseUrl);
        }
      }
      if (provider.kind === "custom" && customBaseUrl) {
        const catalog = remoteByProvider[CUSTOM_PROVIDER_ID];
        if (!catalog?.models.length && !catalog?.loading) {
          void loadRemoteModels(CUSTOM_PROVIDER_ID, customBaseUrl);
        }
      }
    },
    [
      activateProfile,
      acpLoading,
      acpModelsByProvider,
      agents,
      customBaseUrl,
      kosmosBaseUrl,
      loadAcpModels,
      loadRemoteModels,
      providers,
      remoteByProvider,
    ],
  );

  const modelLabel = useMemo(() => {
    if (runtime === "cursor" && settings) return cursorLabel(settings, cursorModels);
    if (runtime === "acp" && activeProfile) {
      const providerId = providerIdForProfile(activeProfile, {
        settings,
        deployment,
        endpointBaseUrl,
        effectiveModelId: agentSlot?.effective?.modelId ?? null,
        registryById,
      });
      const state = acpModelsByProvider[providerId];
      const current = state?.availableModels.find((m) => m.modelId === state.currentModelId);
      const providerName = acpProviderLabel(activeProfile);
      if (current?.name) return `${providerName} · ${current.name}`;
      return providerName;
    }
    if (!settings) return DEFAULT_MODEL_LABEL;
    const effective = agentSlot?.effective;
    if (effective?.modelId === "user.custom") {
      const modelId = settings.model || endpointConfig?.model || "";
      const providerId = isKosmosCloudLlmEndpoint(endpointBaseUrl)
        ? KOSMOS_PROVIDER_ID
        : CUSTOM_PROVIDER_ID;
      const remote = remoteByProvider[providerId]?.models.find((m) => m.id === modelId);
      const prefix = customEndpointModelName(endpointBaseUrl || settings.baseUrl, deployment);
      if (remote?.name || modelId) return `${prefix} · ${remote?.name ?? modelId}`;
      return prefix;
    }
    if (effective?.modelId) {
      return registryModelLabel(
        { id: effective.modelId, name: effective.name },
        settings,
        deployment,
      );
    }
    return settings.model ?? DEFAULT_MODEL_LABEL;
  }, [
    activeProfile,
    acpModelsByProvider,
    agentSlot,
    cursorModels,
    deployment,
    endpointBaseUrl,
    endpointConfig?.model,
    registryById,
    remoteByProvider,
    runtime,
    settings,
  ]);

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const modelInteractive = Boolean(
    activeProvider && !activeProvider.inactive && activeProvider.models.some((m) => !m.disabled),
  );

  const modelItems = useMemo<MenuItem[]>(() => {
    if (!activeProvider || activeProvider.inactive) return [];
    return activeProvider.models.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      checked: m.checked,
      disabled: m.disabled,
      onSelect: m.onSelect,
    }));
  }, [activeProvider]);

  return {
    modelLabel,
    modelItems,
    modelInteractive,
    providers,
    activeProviderId,
    selectProvider,
  };
}
