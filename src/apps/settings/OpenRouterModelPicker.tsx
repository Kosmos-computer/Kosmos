/**
 * Searchable OpenRouter model dropdown for Settings → Model provider.
 * Caps rendered options so a 300+ model catalog cannot freeze the UI.
 */
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { OpenRouterModelInfo } from "@shared/types";
import { api } from "../../lib/api";
import { matchesListSearch } from "../../lib/listSearch";
import { ListSearch, SettingsAlert } from "../../components/patterns";
import { Button } from "../../components/ui";

const MAX_VISIBLE_OPTIONS = 80;

interface OpenRouterModelPickerProps {
  model: string;
  apiKey: string;
  onModelChange: (modelId: string) => void;
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

  return (
    <div className="arco-settings-openrouter-models">
      <ListSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search models…"
        ariaLabel="Search OpenRouter models"
      />
      <select
        id="set-openrouter-model"
        className="arco-input arco-settings-openrouter-models__select"
        value={model}
        disabled={loading || visible.length === 0}
        onChange={(e) => onModelChange(e.target.value)}
        aria-label="OpenRouter model"
      >
        {model && !visible.some((entry) => entry.id === model) ? (
          <option value={model}>{model}</option>
        ) : null}
        {visible.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.displayName}
            {entry.contextLength ? ` · ${Math.round(entry.contextLength / 1000)}k ctx` : ""}
          </option>
        ))}
      </select>
      <Button variant="ghost" disabled={loading} onClick={() => void loadModels()}>
        {loading ? "Loading…" : "Refresh"}
      </Button>
      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
      {!loading && !error && models.length > 0 ? (
        <SettingsAlert tone="muted">
          {models.length} models in catalog
          {truncated ? ` — showing ${visible.length} of ${filtered.length} matches` : null}
          {truncated ? ". Refine search to narrow the list." : null}
        </SettingsAlert>
      ) : null}
    </div>
  );
}
