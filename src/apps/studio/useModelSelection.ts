/**
 * useModelSelection — feeds the composer's model picker from the runtime
 * that owns the turn.
 *
 * Agent profiles (composer agent chip) pick the runtime: builtin / ACP /
 * Cursor / …. Models are scoped to that runtime — never listed as peers of
 * ACP servers. Selecting a registry model assigns the agent.chat slot; the
 * server mirrors it into legacy settings for older consumers.
 *
 *   builtin → registry eligible models
 *   cursor  → Cursor cloud models (or connect CTA)
 *   acp     → empty (ACP CLIs own their own model picker; hide the chip)
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
import type { UseCaseSlotState } from "@shared/models";
import { customEndpointModelName } from "@shared/llmProviderLabels";
import type { KosmosDeployment } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import type { MenuItem } from "../../components/Menu";
import { openSettingsApp, useSettingsStore } from "../settings/settingsStore";

/** Shown while settings load and as the offline fallback label. */
const DEFAULT_MODEL_LABEL = "Local engine";

function hasCursorKey(settings: Settings | null): boolean {
  return Boolean(settings?.cursorApiKey?.trim());
}

/**
 * Same rule as server resolveTurnKind: non-builtin profile.runtime wins;
 * otherwise Settings.agent (shell default / Cursor via Settings).
 */
function resolveModelRuntime(
  profile: AgentProfile | null | undefined,
  settings: Settings | null,
): AgentKind {
  const fromProfile = profile?.runtime.kind;
  if (fromProfile && fromProfile !== "builtin") return fromProfile;
  return settings?.agent ?? "builtin";
}

function cursorLabel(settings: Settings, cursorModels: CursorModelInfo[]): string {
  const modelId = settings.cursorModel?.trim() || CURSOR_DEFAULT_MODEL;
  const display = cursorModels.find((m) => m.id === modelId)?.displayName ?? modelId;
  return `Cursor · ${display}`;
}

function acpLabel(profile: AgentProfile | null | undefined, settings: Settings | null): string {
  if (profile?.runtime.kind === "acp") {
    const fromPreset = ACP_PRESETS.find((p) => p.id === profile.runtime.acpPresetId);
    return fromPreset?.label ?? profile.name;
  }
  if (!settings) return "ACP";
  const preset = ACP_PRESETS.find((p) => p.command === settings.acpCommand);
  return preset?.label ?? "Custom ACP";
}

function registryModelLabel(
  model: { id: string; name: string },
  settings: Settings | null,
  deployment: KosmosDeployment | null,
): string {
  if (model.id !== "user.custom" && model.name !== "Custom endpoint") return model.name;
  return customEndpointModelName(settings?.baseUrl ?? "", deployment);
}

function displayLabel(
  runtime: AgentKind,
  settings: Settings | null,
  cursorModels: CursorModelInfo[],
  agentSlot: UseCaseSlotState | null,
  deployment: KosmosDeployment | null,
  profile: AgentProfile | null | undefined,
): string {
  if (runtime === "cursor" && settings) return cursorLabel(settings, cursorModels);
  if (runtime === "acp") return acpLabel(profile, settings);
  if (!settings) return DEFAULT_MODEL_LABEL;
  const effective = agentSlot?.effective;
  if (effective?.modelId) {
    return registryModelLabel({ id: effective.modelId, name: effective.name }, settings, deployment);
  }
  return settings.model ?? DEFAULT_MODEL_LABEL;
}

export function useModelSelection(
  activeProfile?: AgentProfile | null,
): { modelLabel: string; modelItems: MenuItem[] } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cursorModels, setCursorModels] = useState<CursorModelInfo[]>([]);
  const [agentSlot, setAgentSlot] = useState<UseCaseSlotState | null>(null);
  const [deployment, setDeployment] = useState<KosmosDeployment | null>(null);
  const authPhase = useAuthStore((s) => s.phase);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);
  const bumpSettingsRevision = useSettingsStore((s) => s.bumpSettingsRevision);
  const notify = useOsStore((s) => s.notify);

  const runtime = resolveModelRuntime(activeProfile, settings);

  useEffect(() => {
    if (authPhase !== "ready") return;
    let cancelled = false;
    void Promise.all([api.getSettings(), api.getModels(), api.workspaceFeatures()])
      .then(([loaded, registry, features]) => {
        if (cancelled) return;
        setSettings(loaded);
        setAgentSlot(registry.slots.find((s) => s.id === "agent.chat") ?? null);
        setDeployment(features.kosmos ?? null);
      })
      .catch(() => {
        // Keep the default chip label; switching still surfaces a permission error.
      });
    return () => {
      cancelled = true;
    };
  }, [authPhase, settingsRevision]);

  useEffect(() => {
    if (authPhase !== "ready" || runtime !== "cursor" || !hasCursorKey(settings)) return;
    let cancelled = false;
    api
      .listCursorModels()
      .then((result) => {
        if (!cancelled) setCursorModels(result.models);
      })
      .catch(() => {
        // Model list is optional — the saved id still works as the label.
      });
    return () => {
      cancelled = true;
    };
  }, [authPhase, runtime, settings?.cursorApiKey]);

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

  /** Assign the agent.chat slot; flip back to the built-in agent if needed. */
  const selectRegistryModel = useCallback(
    async (modelId: string) => {
      try {
        const { slots } = await api.assignModelSlot("agent.chat", modelId);
        setAgentSlot(slots.find((s) => s.id === "agent.chat") ?? null);
        if (settings?.agent !== "builtin") {
          await save({ agent: "builtin" }, "Could not switch agent");
        }
        // The slot mirror rewrites settings server-side — let other
        // settings consumers (Settings app, chat header) reload.
        bumpSettingsRevision();
      } catch {
        notify("Could not switch model — check Settings permissions");
      }
    },
    [bumpSettingsRevision, notify, save, settings?.agent],
  );

  const selectCursor = useCallback(
    (modelId?: string) => {
      if (!hasCursorKey(settings)) {
        openSettingsApp("agent");
        notify("Add a Cursor API key in Settings → Agent");
        return;
      }
      void save(
        {
          agent: "cursor",
          cursorModel: modelId ?? (settings?.cursorModel?.trim() || CURSOR_DEFAULT_MODEL),
        },
        "Could not switch to Cursor — check Settings permissions",
      );
    },
    [notify, save, settings],
  );

  const modelItems = useMemo<MenuItem[]>(() => {
    // ACP / OpenHands / Kosmos runtimes own their own brains — no Arco model list.
    if (runtime === "acp" || runtime === "openhands" || runtime === "kosmos") {
      return [];
    }

    if (runtime === "cursor") {
      if (!hasCursorKey(settings)) {
        return [
          {
            id: "cursor-connect",
            label: "Cursor — connect in Settings",
            onSelect: () => {
              openSettingsApp("agent");
              notify("Add a Cursor API key in Settings → Agent");
            },
          },
        ];
      }
      if (cursorModels.length === 0) {
        return [
          {
            id: "cursor-default",
            label: cursorLabel(settings!, cursorModels),
            checked: true,
            onSelect: () => selectCursor(),
          },
        ];
      }
      return cursorModels.map((model) => ({
        id: `cursor-${model.id}`,
        label: model.displayName,
        checked: (settings?.cursorModel || CURSOR_DEFAULT_MODEL) === model.id,
        onSelect: () => selectCursor(model.id),
      }));
    }

    // Built-in runtime → registry models only.
    const effectiveId = agentSlot?.effective?.modelId ?? null;
    const items: MenuItem[] = (agentSlot?.eligible ?? []).map((m) => ({
      id: `model-${m.id}`,
      label: registryModelLabel(m, settings, deployment),
      checked: effectiveId === m.id,
      onSelect: () => void selectRegistryModel(m.id),
    }));

    if (items.length === 0) {
      items.push({
        id: "models-empty",
        label: "No models enabled — open the Models app",
        onSelect: () => notify("Enable a chat model in the Models app"),
      });
    }

    return items;
  }, [
    agentSlot,
    cursorModels,
    deployment,
    notify,
    runtime,
    selectCursor,
    selectRegistryModel,
    settings,
  ]);

  return {
    modelLabel: displayLabel(runtime, settings, cursorModels, agentSlot, deployment, activeProfile),
    modelItems,
  };
}
