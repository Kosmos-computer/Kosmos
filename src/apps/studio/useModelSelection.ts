/**
 * useModelSelection — feeds the composer's brain picker from Settings.
 * Built-in LLM presets, Cursor (when an API key is saved), and ACP agents
 * share one menu; selecting an entry persists the same fields Settings manages.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ACP_PRESETS,
  CURSOR_DEFAULT_MODEL,
  PROVIDER_PRESETS,
  type CursorModelInfo,
  type LlmProvider,
  type Settings,
} from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import type { MenuItem } from "../../components/Menu";
import { openSettingsApp, useSettingsStore } from "../settings/settingsStore";

/** Shown while settings load and as the offline fallback label. */
const DEFAULT_MODEL_LABEL = "Local engine";

/** Human labels for built-in presets, in menu order. */
const PRESET_LABELS: { provider: keyof typeof PROVIDER_PRESETS; label: string }[] = [
  { provider: "local", label: DEFAULT_MODEL_LABEL },
  { provider: "ollama", label: "Ollama · Qwen3 32B" },
  { provider: "openai", label: "OpenAI · GPT-5.5" },
  { provider: "anthropic", label: "Anthropic · Claude Sonnet 4.5" },
  { provider: "openrouter", label: "OpenRouter · Claude Sonnet 4.5" },
];

function hasCursorKey(settings: Settings | null): boolean {
  return Boolean(settings?.cursorApiKey?.trim());
}

function builtinLabel(settings: Settings): string {
  if (settings.provider === "local") return DEFAULT_MODEL_LABEL;
  const preset = PRESET_LABELS.find((p) => p.provider === settings.provider);
  return preset && PROVIDER_PRESETS[preset.provider].model === settings.model
    ? preset.label
    : settings.model;
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

function displayLabel(settings: Settings | null, cursorModels: CursorModelInfo[]): string {
  if (!settings) return DEFAULT_MODEL_LABEL;
  if (settings.agent === "cursor") return cursorLabel(settings, cursorModels);
  if (settings.agent === "acp") return acpLabel(settings);
  return builtinLabel(settings);
}

export function useModelSelection(): { modelLabel: string; modelItems: MenuItem[] } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cursorModels, setCursorModels] = useState<CursorModelInfo[]>([]);
  const authPhase = useAuthStore((s) => s.phase);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);
  const notify = useOsStore((s) => s.notify);

  useEffect(() => {
    if (authPhase !== "ready") return;
    let cancelled = false;
    api
      .getSettings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
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

  const selectBuiltin = useCallback(
    (provider: LlmProvider) => {
      const preset = PROVIDER_PRESETS[provider as keyof typeof PROVIDER_PRESETS];
      if (!preset) return;
      void save(
        { agent: "builtin", provider, baseUrl: preset.baseUrl, model: preset.model },
        "Could not switch model — check Settings permissions",
      );
    },
    [save],
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
    const items: MenuItem[] = PRESET_LABELS.map(({ provider, label }) => ({
      id: `builtin-${provider}`,
      label,
      checked:
        (settings?.agent ?? "builtin") === "builtin" && settings?.provider === provider,
      onSelect: () => selectBuiltin(provider),
    }));

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
  }, [cursorModels, notify, selectAcp, selectBuiltin, selectCursor, settings]);

  return { modelLabel: displayLabel(settings, cursorModels), modelItems };
};
