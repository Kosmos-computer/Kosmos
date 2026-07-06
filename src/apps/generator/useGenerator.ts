import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedGeneratorCatalogItem } from "@shared/types";
import { api } from "../../lib/api";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";
import {
  catalogItemById,
  filterCatalog,
  mergeCatalog,
} from "./catalog";
import { GENERATOR_DATA } from "./types";
import type { CatalogItem, GeneratorPreviewTab, GeneratorResult } from "./types";

export function useGenerator() {
  const openWindow = useWindowStore((s) => s.open);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(GENERATOR_DATA.defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedGeneratorCatalogItem[]>([]);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [previewTab, setPreviewTab] = useState<GeneratorPreviewTab>("preview");
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const refreshSavedCatalog = useCallback(async () => {
    try {
      const saved = await api.listGeneratorCatalog();
      setSavedItems(saved);
    } catch {
      // Server unreachable — keep the last saved list.
    }
  }, []);

  useEffect(() => {
    void refreshSavedCatalog();
  }, [refreshSavedCatalog]);

  const catalog = useMemo(() => mergeCatalog(savedItems), [savedItems]);
  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, catalogSearch),
    [catalog, catalogSearch],
  );

  const selectCatalogItem = useCallback((item: CatalogItem) => {
    setActiveCatalogId(item.id);
    setError(null);
    setResult({
      title: item.label,
      code: item.code,
      source: item.source,
      catalogId: item.id,
      tier: item.tier,
    });
    setPreviewTab("preview");
  }, []);

  const generate = useCallback(async () => {
    const value = prompt.trim();
    if (!value || generating) return;
    setGenerating(true);
    setError(null);
    setActiveCatalogId(null);
    try {
      const response = await api.generateUi(value);
      setResult({
        title: response.title,
        code: response.code,
        source: "generated",
        validation: response.validation,
        lintSummary: response.lintSummary,
      });
      setPreviewTab("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [generating, prompt]);

  const saveToCatalog = useCallback(async () => {
    if (!result?.code.trim()) return;
    try {
      await api.saveGeneratorCatalogItem({
        label: result.title,
        code: result.code,
        prompt: result.source === "generated" ? prompt.trim() : undefined,
        tier: result.tier ?? "saved",
      });
      await refreshSavedCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to catalog");
    }
  }, [prompt, refreshSavedCatalog, result]);

  const refineInStudio = useCallback(() => {
    if (!result) return;
    openWindow({ type: "system", app: "studio" }, "Studio");
    const intro =
      result.source === "generated"
        ? `Improve this generated UI (openui-lang):\n\n\`\`\`openui-lang\n${result.code}\n\`\`\``
        : `Refine this catalog component "${result.title}" (openui-lang):\n\n\`\`\`openui-lang\n${result.code}\n\`\`\``;
    primeComposer({ text: intro, submit: false });
  }, [openWindow, result]);

  const selectById = useCallback(
    (id: string) => {
      const item = catalogItemById(catalog, id);
      if (item) selectCatalogItem(item);
    },
    [catalog, selectCatalogItem],
  );

  return {
    catalog: filteredCatalog,
    catalogSearch,
    setCatalogSearch,
    activeCatalogId,
    selectCatalogItem,
    prompt,
    setPrompt,
    generating,
    generate,
    result,
    previewTab,
    setPreviewTab,
    examples: GENERATOR_DATA.examplePrompts,
    sidebarWidth,
    setSidebarWidth,
    error,
    saveToCatalog,
    refineInStudio,
    selectById,
    refreshSavedCatalog,
  };
}

export type GeneratorViewModel = ReturnType<typeof useGenerator>;
