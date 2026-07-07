/**
 * useModelSelection — feeds the composer's brain picker from the model
 * registry (the agent.chat use-case slot), plus Cursor (when an API key is
 * saved) and ACP agents. Selecting a registry model assigns the slot; the
 * server mirrors it into legacy settings for older consumers.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACP_PRESETS,
  CURSOR_DEFAULT_MODEL,
  type CursorModelInfo,
  type Settings,
} from "@shared/types";
import type { UseCaseSlotState } from "@shared/models";
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

function cursorLabel(settings: Settings, cursorModels: CursorModelInfo[]): string {
  const modelId = settings.cursorModel?.trim() || CURSOR_DEFAULT_MODEL;
  const display = cursorModels.find((m) => m.id === modelId)?.displayName ?? modelId;
  return `Cursor · ${display}`;
}

function acpLabel(settings: Settings): string {
  const preset = ACP_PRESETS.find((p) => p.command === settings.acpCommand);
  return preset?.label ?? "Custom ACP";
}

function displayLabel(
  settings: Settings | null,
  cursorModels: CursorModelInfo[],
  agentSlot: UseCaseSlotState | null,
): string {
  if (!settings) return DEFAULT_MODEL_LABEL;
  if (settings.agent === "cursor") return cursorLabel(settings, cursorModels);
  if (settings.agent === "acp") return acpLabel(settings);
  // Built-in agent → whatever the agent.chat slot resolves to.
  return agentSlot?.effective?.name ?? settings.model ?? DEFAULT_MODEL_LABEL;
}

export function useModelSelection(): { modelLabel: string; modelItems: MenuItem[] } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cursorModels, setCursorModels] = useState<CursorModelInfo[]>([]);
  const [agentSlot, setAgentSlot] = useState<UseCaseSlotState | null>(null);
  const authPhase = useAuthStore((s) => s.phase);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);
  const bumpSettingsRevision = useSettingsStore((s) => s.bumpSettingsRevision);
  const notify = useOsStore((s) => s.notify);

  useEffect(() => {
    if (authPhase !== "ready") return;
    let cancelled = false;
    void Promise.all([api.getSettings(), api.getModels()])
      .then(([loaded, registry]) => {
        if (cancelled) return;
        setSettings(loaded);
        setAgentSlot(registry.slots.find((s) => s.id === "agent.chat") ?? null);
      })
      .catch(() => {
        // Keep the default chip label; switching still surfaces a permission error.
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
        // Model list is optional — the saved id still works as the label.
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

  const selectAcp = useCallback(
    (command: string) => {
      void save(
        { agent: "acp", acpCommand: command },
        "Could not switch agent — check Settings permissions",
      );
    },
    [save],
  );

  const modelItems = useMemo<MenuItem[]>(() => {
    const builtin = settings?.agent ?? "builtin";
    const effectiveId = agentSlot?.effective?.modelId ?? null;
    const items: MenuItem[] = (agentSlot?.eligible ?? []).map((m) => ({
      id: `model-${m.id}`,
      label: m.name,
      checked: builtin === "builtin" && effectiveId === m.id,
      onSelect: () => void selectRegistryModel(m.id),
    }));

    if (items.length === 0) {
      items.push({
        id: "models-empty",
        label: "No models enabled — open the Models app",
        onSelect: () => notify("Enable a chat model in the Models app"),
      });
    }

    if (hasCursorKey(settings)) {
      const cursorEntries =
        cursorModels.length > 0
          ? cursorModels.map((model, index) => ({
              id: `cursor-${model.id}`,
              label: `Cursor · ${model.displayName}`,
              checked:
                settings?.agent === "cursor" &&
                (settings.cursorModel || CURSOR_DEFAULT_MODEL) === model.id,
              separatorAbove: index === 0,
              onSelect: () => selectCursor(model.id),
            }))
          : [
              {
                id: "cursor-default",
                label: cursorLabel(settings!, cursorModels),
                checked: settings?.agent === "cursor",
                separatorAbove: true,
                onSelect: () => selectCursor(),
              },
            ];
      items.push(...cursorEntries);
    } else {
      items.push({
        id: "cursor-connect",
        label: "Cursor — connect in Settings",
        separatorAbove: true,
        onSelect: () => {
          openSettingsApp("agent");
          notify("Add a Cursor API key in Settings → Agent");
        },
      });
    }

    ACP_PRESETS.forEach((preset, index) => {
      items.push({
        id: `acp-${preset.id}`,
        label: preset.label,
        checked: settings?.agent === "acp" && settings.acpCommand === preset.command,
        separatorAbove: index === 0,
        onSelect: () => selectAcp(preset.command),
      });
    });

    return items;
  }, [agentSlot, cursorModels, notify, selectAcp, selectCursor, selectRegistryModel, settings]);

  return { modelLabel: displayLabel(settings, cursorModels, agentSlot), modelItems };
}
