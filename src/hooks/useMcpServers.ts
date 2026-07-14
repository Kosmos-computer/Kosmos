/**
 * useMcpServers — shared MCP connector list for Settings and the composer
 * Connectors submenu. Server state is the source of truth; this hook only
 * mirrors list + enable toggles.
 */
import { useCallback, useEffect, useState } from "react";
import type { McpServerInfo } from "@shared/types";
import { api } from "../lib/api";
import { useSettingsStore } from "../apps/settings/settingsStore";

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.listMcpServers();
      setServers(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load connectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, settingsRevision]);

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      // Optimistic update so the submenu switch feels instant.
      setServers((current) =>
        current.map((server) =>
          server.config.id === id
            ? { ...server, config: { ...server.config, enabled } }
            : server,
        ),
      );
      try {
        await api.updateMcpServer(id, { enabled });
        useSettingsStore.getState().bumpSettingsRevision();
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh],
  );

  return { servers, loading, error, refresh, setEnabled };
}

export type McpServersViewModel = ReturnType<typeof useMcpServers>;
