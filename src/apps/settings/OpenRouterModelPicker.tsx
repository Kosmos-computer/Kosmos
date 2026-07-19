import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Searchable OpenRouter model dropdown for Settings → Model provider.
 * Caps rendered options so a 300+ model catalog cannot freeze the UI.
 */
import { RefreshCw } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { OpenRouterModelInfo } from "@shared/types";
import { api } from "../../lib/api";
import { matchesListSearch } from "../../lib/listSearch";
import { ListSearch, ModuleFilterSelect, SettingsAlert } from "../../components/patterns";
import { Button } from "../../components/ui";

const MAX_VISIBLE_OPTIONS = 80;

interface OpenRouterModelPickerProps {
  model: string;
  apiKey: string;
  onModelChange: (modelId: string) => void;
}

function modelLabel(entry: OpenRouterModelInfo): string {
  const ctx = entry.contextLength ? ` · ${Math.round(entry.contextLength / 1000)}k ctx` : "";
  return `${entry.displayName}${ctx}`;
}

export function OpenRouterModelPicker({ model, apiKey, onModelChange }: OpenRouterModelPickerProps) {
  const [models, setModels] = useState<OpenRouterModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasKey = Boolean(apiKey && !apiKey.startsWith("••••"));

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listOpenRouterModels(hasKey ? apiKey : undefined);
      startTransition(() => setModels(result.models));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OpenRouter models");
    } finally {
      setLoading(false);
    }
  }, [apiKey, hasKey]);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const filtered = useMemo(
    () =>
      models.filter((entry) =>
        matchesListSearch(searchQuery, entry.id, entry.displayName, entry.description),
      ),
    [models, searchQuery],
  );

  const visible = useMemo(() => {
    const selected = model ? models.find((entry) => entry.id === model) : undefined;
    const capped = filtered.slice(0, MAX_VISIBLE_OPTIONS);
    if (selected && !capped.some((entry) => entry.id === selected.id)) {
      return [selected, ...capped.slice(0, MAX_VISIBLE_OPTIONS - 1)];
    }
    return capped;
  }, [filtered, model, models]);

  const truncated = filtered.length > visible.length;
  const selected = model ? models.find((entry) => entry.id === model) : undefined;

  return (
    <div className="arco-settings-openrouter-models">
      <ListSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_MODELS)}
        ariaLabel="Search OpenRouter models"
        compact
      />

      <div className="arco-settings-openrouter-models__picker">
        <ModuleFilterSelect
          label={i18n.t(I18nKey.APPS$SETTINGS_OPENROUTER_MODEL)}
          value={model}
          disabled={loading || (visible.length === 0 && !model)}
          searchable={false}
          portal
          className="arco-settings-openrouter-models__select"
          options={[
            ...(model && !visible.some((entry) => entry.id === model)
              ? [{ value: model, label: selected ? modelLabel(selected) : model }]
              : []),
            ...visible.map((entry) => ({
              value: entry.id,
              label: modelLabel(entry),
            })),
          ]}
          onChange={onModelChange}
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={loading}
          onClick={() => void loadModels()}
          aria-label={loading ? "Loading models" : "Refresh models"}
        >
          <RefreshCw size={14} className={loading ? "arco-spin" : undefined} />
        </Button>
      </div>

      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

      {!loading && !error && models.length > 0 ? (
        <p className="arco-settings-openrouter-models__meta">
          {truncated
            ? `${visible.length} of ${filtered.length} matches · ${models.length} in catalog`
            : `${models.length} models in catalog`}
        </p>
      ) : null}
    </div>
  );
}
