/** STUB: replace with useApisStore when catalog + install API exists */
import { useCallback, useMemo, useState } from "react";
import { APIS_MOCK } from "./apisMock";
import type { ApiIntegration } from "./types";

export function useApisStub() {
  const [apis, setApis] = useState<ApiIntegration[]>(() =>
    APIS_MOCK.map((entry) => ({ ...entry })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? apis.find((entry) => entry.id === selectedId) ?? null : null),
    [apis, selectedId],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const install = useCallback((id: string) => {
    setApis((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, installed: true } : entry)),
    );
  }, []);

  const uninstall = useCallback((id: string) => {
    setApis((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, installed: false } : entry)),
    );
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const installedCount = useMemo(() => apis.filter((entry) => entry.installed).length, [apis]);

  return { apis, selected, select, install, uninstall, installedCount };
}

export type ApisViewModel = ReturnType<typeof useApisStub>;
