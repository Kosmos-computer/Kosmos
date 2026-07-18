/**
 * useModelSelection — feeds the composer model picker (provider left-nav +
 * model list) from registry, Cursor, and ACP session models.
 *
 *   Arco (builtin) → registry eligible models (agent.chat slot)
 *   Cursor         → Cursor cloud models (or connect CTA)
 *   ACP presets    → session models from the ACP agent (when warm)
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
import type { RegisteredModel, UseCaseSlotState } from "@shared/models";
import {
  customEndpointModelName,
  usesKosmosCloudService,
} from "@shared/llmProviderLabels";
import type { KosmosDeployment } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import type { MenuItem } from "../../components/Menu";
import type {
  ModelPickerModel,
  ModelPickerProvider,
} from "../../components/composer/modelPickerTypes";
import { openSettingsApp, useSettingsStore } from "../settings/settingsStore";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";

const DEFAULT_MODEL_LABEL = "Local engine";
const LOCAL_PROVIDER_ID = "local";
const KOSMOS_PROVIDER_ID = "kosmos";
const CUSTOM_PROVIDER_ID = "custom";

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

function providerIdForProfile(
  profile: AgentProfile,
  opts?: {
    settings?: Settings | null;
    deployment?: KosmosDeployment | null;
    endpointBaseUrl?: string | null;
    effectiveModelId?: string | null;
  },
): string {
  if (profile.runtime.kind === "cursor") return "cursor";
  if (profile.runtime.kind === "acp") {
    return `acp:${profile.runtime.acpPresetId ?? profile.id}`;
  }
  if (profile.runtime.kind === "kosmos") return KOSMOS_PROVIDER_ID;
  if (profile.runtime.kind === "builtin") {
    const usingEndpoint =
      opts?.effectiveModelId === "user.custom" ||
      opts?.settings?.provider === "custom";
    if (usingEndpoint) {
      const baseUrl = opts?.endpointBaseUrl || opts?.settings?.baseUrl || "";
      if (usesKosmosCloudService(baseUrl, opts?.deployment)) return KOSMOS_PROVIDER_ID;
      if (baseUrl.trim()) return CUSTOM_PROVIDER_ID;
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
  const [deployment, setDeployment] = useState<KosmosDeployment | null>(null);
  const [endpointConfig, setEndpointConfig] = useState<{
    baseUrl: string;
    model: string;
    name: string;
  } | null>(null);
  const [acpModelsByProvider, setAcpModelsByProvider] = useState<
    Record<string, AcpModelState | null>
  >({});
  const [acpLoading, setAcpLoading] = useState<string | null>(null);
  const [remoteModels, setRemoteModels] = useState<{ id: string; name: string }[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

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
  const kosmosCloud = Boolean(
    endpointBaseUrl && usesKosmosCloudService(endpointBaseUrl, deployment),
  );
  const customEndpoint = Boolean(endpointBaseUrl && !kosmosCloud);
  const showEndpointProvider = Boolean(endpointBaseUrl);
  const activeProviderId = activeProfile
    ? providerIdForProfile(activeProfile, {
        settings,
        deployment,
        endpointBaseUrl,
        effectiveModelId: agentSlot?.effective?.modelId ?? null,
      })
    : runtime === "cursor"
      ? "cursor"
      : runtime === "acp"
        ? "acp:default"
        : runtime === "kosmos" || kosmosCloud
          ? KOSMOS_PROVIDER_ID
          : customEndpoint && agentSlot?.effective?.modelId === "user.custom"
            ? CUSTOM_PROVIDER_ID
            : LOCAL_PROVIDER_ID;

  useEffect(() => {
    if (authPhase !== "ready") return;
    let cancelled = false;
    void Promise.all([api.getSettings(), api.getModels(), api.workspaceFeatures()])
      .then(([loaded, registry, features]) => {
        if (cancelled) return;
        setSettings(loaded);
        setAgentSlot(registry.slots.find((s) => s.id === "agent.chat") ?? null);
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
    async (modelId: string, profileId?: string) => {
      const baseUrl = endpointBaseUrl;
      if (!baseUrl) {
        notify("No endpoint configured — connect Kosmos or set a custom base URL in Settings");
        return;
      }
      activateProfile(profileId ?? BUILTIN_AGENT_ID);
      try {
        await save(
          {
            agent: "builtin",
            provider: "custom",
            baseUrl,
            model: modelId,
          },
          "Could not switch model — check Settings permissions",
        );
        const { slots } = await api.assignModelSlot("agent.chat", "user.custom");
        setAgentSlot(slots.find((s) => s.id === "agent.chat") ?? null);
        setEndpointConfig((prev) =>
          prev ? { ...prev, baseUrl, model: modelId } : { baseUrl, model: modelId, name: "Custom endpoint" },
        );
        bumpSettingsRevision();
      } catch {
        notify("Could not switch model — check Settings permissions");
      }
    },
    [activateProfile, bumpSettingsRevision, endpointBaseUrl, notify, save],
  );

  const loadRemoteModels = useCallback(async () => {
    const baseUrl = endpointBaseUrl;
    if (!baseUrl) {
      setRemoteModels([]);
      setRemoteError("No endpoint configured");
      return;
    }
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const result = await api.listRemoteLlmModels({ baseUrl });
      setRemoteModels(result.models);
    } catch (err) {
      setRemoteModels([]);
      setRemoteError(err instanceof Error ? err.message : "Could not list models");
    } finally {
      setRemoteLoading(false);
    }
  }, [endpointBaseUrl]);

  useEffect(() => {
    if (authPhase !== "ready" || !showEndpointProvider) return;
    void loadRemoteModels();
  }, [authPhase, showEndpointProvider, loadRemoteModels, settingsRevision]);

  const loadAcpModels = useCallback(
    async (providerId: string, profile: AgentProfile) => {
      const command = acpCommandForProfile(profile, settings);
      if (!command.trim()) {
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: null }));
        return;
      }
      const key = acpSessionKey(sessionId, providerId);
      setAcpLoading(providerId);
      try {
        const state = await api.ensureAcpModels({ sessionKey: key, acpCommand: command });
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: state.models }));
      } catch (err) {
        setAcpModelsByProvider((prev) => ({ ...prev, [providerId]: null }));
        const message = err instanceof Error ? err.message : "Could not load ACP models";
        notify(message);
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
  ]);

  const providers = useMemo<ModelPickerProvider[]>(() => {
    const list: ModelPickerProvider[] = [];

    const builtinProfile =
      agents.find((a) => a.id === BUILTIN_AGENT_ID) ??
      agents.find((a) => a.runtime.kind === "builtin");
    const effectiveId = agentSlot?.effective?.modelId ?? null;
    const localModels: ModelPickerModel[] = (agentSlot?.eligible ?? [])
      .filter((m) => !isEndpointModelId(m.id))
      .map((m) => ({
        id: `model-${m.id}`,
        label: registryModelLabel(m, settings, deployment),
        checked: effectiveId === m.id,
        onSelect: () => void selectRegistryModel(m.id, builtinProfile?.id ?? BUILTIN_AGENT_ID),
      }));
    if (localModels.length === 0) {
      localModels.push({
        id: "models-empty",
        label: "No models enabled — open the Models app",
        onSelect: () =>
          openShellWindow({ type: "system", app: "models" }, systemAppTitle("models")),
      });
    }
    list.push({
      id: LOCAL_PROVIDER_ID,
      label: "Local",
      kind: "builtin",
      profileId: builtinProfile?.id ?? BUILTIN_AGENT_ID,
      models: localModels,
    });

    if (showEndpointProvider) {
      const providerId = kosmosCloud ? KOSMOS_PROVIDER_ID : CUSTOM_PROVIDER_ID;
      // Short nav labels; full "Custom endpoint" name stays on the chip when selected.
      const providerLabel = kosmosCloud ? "Kosmos" : "Custom";
      const currentRemoteId =
        effectiveId === "user.custom"
          ? (settings?.model || endpointConfig?.model || null)
          : null;
      let endpointModels: ModelPickerModel[] = [];
      let emptyMessage: string | undefined;
      let inactive = false;

      if (remoteLoading) {
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
      } else if (remoteModels.length > 0) {
        endpointModels = remoteModels.map((m) => ({
          id: `${providerId}-${m.id}`,
          label: m.name,
          checked: currentRemoteId === m.id,
          onSelect: () =>
            void selectEndpointModel(m.id, builtinProfile?.id ?? BUILTIN_AGENT_ID),
        }));
      } else {
        emptyMessage = remoteError ?? "No models returned by this endpoint";
        endpointModels = [
          {
            id: `${providerId}-retry`,
            label: remoteError ? "Retry loading models" : "Load models",
            description: remoteError ?? undefined,
            onSelect: () => void loadRemoteModels(),
          },
        ];
      }

      list.push({
        id: providerId,
        label: providerLabel,
        kind: kosmosCloud ? "kosmos" : "custom",
        profileId: builtinProfile?.id ?? BUILTIN_AGENT_ID,
        models: endpointModels,
        emptyMessage,
        inactive,
      });
    }

    const cursorProfile = agents.find((a) => a.runtime.kind === "cursor");
    if (hasCursorKey(settings) || cursorProfile) {
      let cursorModelItems: ModelPickerModel[];
      if (!hasCursorKey(settings)) {
        cursorModelItems = [
          {
            id: "cursor-connect",
            label: "Cursor — connect in Settings",
            onSelect: () => {
              openSettingsApp("agent");
              notify("Add a Cursor API key in Settings → Agent");
            },
          },
        ];
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
        profileId: cursorProfile?.id,
        models: cursorModelItems,
      });
    }

    for (const profile of acpProfiles) {
      const providerId = providerIdForProfile(profile, {
        settings,
        deployment,
        endpointBaseUrl,
        effectiveModelId: agentSlot?.effective?.modelId ?? null,
      });
      const state = acpModelsByProvider[providerId];
      const loading = acpLoading === providerId;
      let models: ModelPickerModel[] = [];
      let emptyMessage: string | undefined;
      let inactive = false;

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
        label: acpProviderLabel(profile),
        kind: "acp",
        profileId: profile.id,
        models,
        emptyMessage,
        inactive,
      });
    }

    return list;
  }, [
    acpLoading,
    acpModelsByProvider,
    acpProfiles,
    agentSlot,
    agents,
    cursorModels,
    deployment,
    endpointBaseUrl,
    endpointConfig?.model,
    kosmosCloud,
    loadAcpModels,
    loadRemoteModels,
    notify,
    remoteError,
    remoteLoading,
    remoteModels,
    selectAcpModel,
    selectCursor,
    selectEndpointModel,
    selectRegistryModel,
    sessionId,
    settings,
    showEndpointProvider,
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
      if (
        (provider.kind === "kosmos" || provider.kind === "custom") &&
        remoteModels.length === 0 &&
        !remoteLoading
      ) {
        void loadRemoteModels();
      }
    },
    [
      activateProfile,
      acpLoading,
      acpModelsByProvider,
      agents,
      loadAcpModels,
      loadRemoteModels,
      providers,
      remoteLoading,
      remoteModels.length,
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
      const remote = remoteModels.find((m) => m.id === modelId);
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
    remoteModels,
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
