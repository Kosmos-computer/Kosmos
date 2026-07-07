/**
 * useModelSelection — feeds the composer's model picker from the real
 * Settings API. Selecting an entry saves the matching provider preset
 * (provider + baseUrl + model), so the picker is a shortcut to the same
 * state the Settings app manages.
 *
 * Settings writes are capability-gated server-side; failures surface as an
 * OS notification rather than breaking the composer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { PROVIDER_PRESETS, type LlmProvider, type Settings } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";
import type { MenuItem } from "../../components/Menu";

/** Shown while settings load and as the offline fallback label. */
const DEFAULT_MODEL_LABEL = "Local engine";

/** Human labels for the pickable presets, in menu order. */
const PRESET_LABELS: { provider: keyof typeof PROVIDER_PRESETS; label: string }[] = [
  { provider: "local", label: DEFAULT_MODEL_LABEL },
  { provider: "ollama", label: "Ollama · Qwen3 32B" },
  { provider: "openai", label: "OpenAI · GPT-5.5" },
  { provider: "anthropic", label: "Anthropic · Claude Sonnet 4.5" },
  { provider: "openrouter", label: "OpenRouter · Claude Sonnet 4.5" },
];

function displayLabel(settings: Settings | null): string {
  if (!settings) return DEFAULT_MODEL_LABEL;
  if (settings.provider === "local") return DEFAULT_MODEL_LABEL;
  const preset = PRESET_LABELS.find((p) => p.provider === settings.provider);
  // A preset name reads better than a raw model id when they match.
  return preset && PROVIDER_PRESETS[preset.provider].model === settings.model
    ? preset.label
    : settings.model;
}

export function useModelSelection(): { modelLabel: string; modelItems: MenuItem[] } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const authPhase = useAuthStore((s) => s.phase);
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
  }, [authPhase]);

  const select = useCallback(
    async (provider: LlmProvider) => {
      const preset = PROVIDER_PRESETS[provider as keyof typeof PROVIDER_PRESETS];
      if (!preset) return;
      try {
        const saved = await api.saveSettings({ provider, baseUrl: preset.baseUrl, model: preset.model });
        setSettings(saved);
      } catch {
        notify("Could not switch model — check Settings permissions");
      }
    },
    [notify],
  );

  const modelItems = useMemo<MenuItem[]>(
    () =>
      PRESET_LABELS.map(({ provider, label }) => ({
        id: provider,
        label,
        checked: settings?.provider === provider,
        onSelect: () => void select(provider),
      })),
    [settings, select],
  );

  return { modelLabel: displayLabel(settings), modelItems };
}
