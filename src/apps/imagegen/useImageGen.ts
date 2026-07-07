import { useCallback, useEffect, useMemo, useState } from "react";
import type { ImageGenHistoryItem, ImageGenSize, ImageGenStatus, ImageGenStyle } from "@shared/types";
import { api } from "../../lib/api";
import { IMAGE_GEN_DATA } from "./types";

export function useImageGen() {
  const [history, setHistory] = useState<ImageGenHistoryItem[]>([]);
  const [status, setStatus] = useState<ImageGenStatus | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(IMAGE_GEN_DATA.defaultPrompt);
  const [size, setSize] = useState<ImageGenSize>("1024x1024");
  const [style, setStyle] = useState<ImageGenStyle>("vivid");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const refreshHistory = useCallback(async () => {
    try {
      const items = await api.listImageGenHistory();
      setHistory(items);
    } catch {
      // Server unreachable — keep the last list.
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await api.getImageGenStatus();
      setStatus(next);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
    void refreshStatus();
  }, [refreshHistory, refreshStatus]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;
    return history.filter(
      (item) =>
        item.prompt.toLowerCase().includes(query) ||
        item.revisedPrompt?.toLowerCase().includes(query),
    );
  }, [history, historySearch]);

  const activeItem = useMemo(
    () => history.find((item) => item.id === activeId) ?? null,
    [activeId, history],
  );

  const selectHistoryItem = useCallback((item: ImageGenHistoryItem) => {
    setActiveId(item.id);
    setPrompt(item.prompt);
    setSize(item.size);
    setStyle(item.style);
    setError(null);
  }, []);

  const generate = useCallback(async () => {
    const value = prompt.trim();
    if (!value || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await api.generateImage({ prompt: value, size, style });
      setHistory((prev) => [response.item, ...prev.filter((entry) => entry.id !== response.item.id)]);
      setActiveId(response.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [generating, prompt, size, style]);

  const removeHistoryItem = useCallback(
    async (id: string) => {
      try {
        await api.deleteImageGenHistoryItem(id);
        setHistory((prev) => prev.filter((item) => item.id !== id));
        if (activeId === id) setActiveId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete image");
      }
    },
    [activeId],
  );

  return {
    history: filteredHistory,
    historySearch,
    setHistorySearch,
    activeId,
    activeItem,
    selectHistoryItem,
    prompt,
    setPrompt,
    size,
    setSize,
    style,
    setStyle,
    generating,
    generate,
    error,
    status,
    examples: IMAGE_GEN_DATA.examplePrompts,
    sizes: IMAGE_GEN_DATA.sizes,
    styles: IMAGE_GEN_DATA.styles,
    sidebarWidth,
    setSidebarWidth,
    removeHistoryItem,
    refreshHistory,
  };
}

export type ImageGenViewModel = ReturnType<typeof useImageGen>;
