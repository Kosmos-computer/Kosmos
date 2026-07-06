/**
 * Stub hook for the Memory workspace. Phase 1 swaps mock data for api calls.
 */
import { useMemo, useState } from "react";
import { MEMORY_WORKSPACE_MOCK } from "./memoryMock";
import type { MemoryViewId, MemoryWorkspaceData } from "./types";

export interface UseMemoryStubResult {
  data: MemoryWorkspaceData;
  view: MemoryViewId;
  setView: (view: MemoryViewId) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

export function useMemoryStub(): UseMemoryStubResult {
  const [view, setView] = useState<MemoryViewId>("dashboard");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const data = useMemo(() => MEMORY_WORKSPACE_MOCK, []);

  return { data, view, setView, sidebarWidth, setSidebarWidth };
}
