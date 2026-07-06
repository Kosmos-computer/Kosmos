import { useCallback, useMemo, useState } from "react";
import { generateFromPrompt, resultFromCatalog } from "./generatePreview";
import { GENERATOR_CATALOG, GENERATOR_DATA } from "./generatorMock";
import type { CatalogItem, GeneratorPreviewTab, GeneratorResult } from "./types";

/** STUB: replace with real generator pipeline when block registry is wired. */
export function useGeneratorStub() {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(GENERATOR_DATA.defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratorResult>(() => generateFromPrompt(GENERATOR_DATA.defaultPrompt));
  const [previewTab, setPreviewTab] = useState<GeneratorPreviewTab>("preview");
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const catalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) return GENERATOR_CATALOG;
    return GENERATOR_CATALOG.filter((item) => item.label.toLowerCase().includes(query));
  }, [catalogSearch]);

  const selectCatalogItem = useCallback((item: CatalogItem) => {
    setActiveCatalogId(item.id);
    setResult(resultFromCatalog(item));
    setPreviewTab("preview");
  }, []);

  const generate = useCallback(() => {
    if (prompt.trim().length === 0 || generating) return;
    setGenerating(true);
    setActiveCatalogId(null);
    window.setTimeout(() => {
      setResult(generateFromPrompt(prompt));
      setPreviewTab("preview");
      setGenerating(false);
    }, 650);
  }, [generating, prompt]);

  return {
    catalog,
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
  };
}

export type GeneratorViewModel = ReturnType<typeof useGeneratorStub>;
