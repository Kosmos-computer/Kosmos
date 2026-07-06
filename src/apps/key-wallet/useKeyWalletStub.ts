/** STUB: replace with useKeyWalletStore when the secrets vault API exists */
import { useCallback, useMemo, useState } from "react";
import { KEY_WALLET_MOCK } from "./keyWalletMock";
import type { KeyEntry } from "./types";

export function useKeyWalletStub() {
  const [keys, setKeys] = useState<KeyEntry[]>(() => [...KEY_WALLET_MOCK]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? keys.find((entry) => entry.id === selectedId) ?? null : null),
    [keys, selectedId],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const remove = useCallback((id: string) => {
    setKeys((current) => current.filter((entry) => entry.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  return { keys, selected, select, remove };
}

export type KeyWalletViewModel = ReturnType<typeof useKeyWalletStub>;
