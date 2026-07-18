/**
 * Memory workspace hook — Phase 1 prefers live `/api/memory/*` data for the
 * entry list (and collections/grants when available), falling back to the
 * Psyche stub mock when the API is unreachable or empty of entries.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { MEMORY_WORKSPACE_MOCK } from "./memoryMock";
import type { MemoryViewId, MemoryWorkspaceData } from "./types";

export interface UseMemoryStubResult {
  data: MemoryWorkspaceData;
  view: MemoryViewId;
  setView: (view: MemoryViewId) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  live: boolean;
}

export function useMemoryStub(): UseMemoryStubResult {
  const [view, setView] = useState<MemoryViewId>("dashboard");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [liveEntries, setLiveEntries] = useState<MemoryWorkspaceData["memoryEntries"] | null>(null);
  const [liveCollections, setLiveCollections] = useState<
    MemoryWorkspaceData["collections"] | null
  >(null);
  const [liveGrants, setLiveGrants] = useState<MemoryWorkspaceData["grants"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [entries, collections] = await Promise.all([
          api.listMemoryEntries({ limit: 100 }),
          api.listMemoryCollections(),
        ]);
        if (cancelled) return;
        setLiveEntries(entries);
        setLiveCollections(collections);
        try {
          const grants = await api.listMemoryGrants();
          if (!cancelled) setLiveGrants(grants);
        } catch {
          // Grants require settings:write — ignore if the user lacks the cap.
        }
      } catch {
        if (!cancelled) {
          setLiveEntries(null);
          setLiveCollections(null);
          setLiveGrants(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const live = liveEntries != null;

  const data = useMemo((): MemoryWorkspaceData => {
    const base = MEMORY_WORKSPACE_MOCK;
    if (!live) return base;

    const entryCount = liveEntries!.length;
    return {
      ...base,
      memoryEntries: entryCount > 0 ? liveEntries! : base.memoryEntries,
      collections: liveCollections ?? base.collections,
      grants: liveGrants ?? base.grants,
      overviewMetrics: [
        {
          id: "memories",
          label: "Memory entries",
          value: String(entryCount),
          tone: "accent",
          change: entryCount > 0 ? "Live from memory store" : "Stub until first write",
        },
        ...base.overviewMetrics.slice(1),
      ],
      systemNote:
        entryCount > 0
          ? "Phase 1 kernel live — document store + ACLs. Vector/RAG still stubbed."
          : base.systemNote,
    };
  }, [live, liveEntries, liveCollections, liveGrants]);

  return { data, view, setView, sidebarWidth, setSidebarWidth, live };
}
