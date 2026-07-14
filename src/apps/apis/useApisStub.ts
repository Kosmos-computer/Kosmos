/**
 * useApis — marketplace catalog backed by mock metadata, with install state
 * synced to real MCP servers. Installing a known MCP preset calls
 * api.addMcpServer; other catalog entries open Settings → MCP.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { MCP_PRESETS } from "@shared/types";
import { api } from "../../lib/api";
import { openSettingsApp, useSettingsStore } from "../settings/settingsStore";
import { APIS_MOCK } from "./apisMock";
import type { ApiIntegration } from "./types";

const PRESET_BY_API_ID: Record<string, (typeof MCP_PRESETS)[number]["id"]> = {
  "api-kosmos-ops": "kosmos-ops",
};

export function useApis() {
  const [apis, setApis] = useState<ApiIntegration[]>(() =>
    APIS_MOCK.map((entry) => ({ ...entry })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);

  const syncInstalled = useCallback(async () => {
    try {
      const servers = await api.listMcpServers();
      const installedNames = new Set(servers.map((s) => s.config.name.toLowerCase()));
      const installedPresetIds = new Set(
        servers
          .map((s) => MCP_PRESETS.find((p) => p.label === s.config.name || p.id === s.config.id)?.id)
          .filter(Boolean),
      );
      setApis((current) =>
        current.map((entry) => {
          const presetId = PRESET_BY_API_ID[entry.id];
          if (presetId && installedPresetIds.has(presetId)) {
            return { ...entry, installed: true };
          }
          if (installedNames.has(entry.name.toLowerCase())) {
            return { ...entry, installed: true };
          }
          // Keep mock "installed" flags for catalog demos that aren't MCP-backed.
          return entry;
        }),
      );
    } catch {
      // Leave mock install flags when MCP list is unavailable.
    }
  }, []);

  useEffect(() => {
    void syncInstalled();
  }, [syncInstalled, settingsRevision]);

  const selected = useMemo(
    () => (selectedId ? apis.find((entry) => entry.id === selectedId) ?? null : null),
    [apis, selectedId],
  );

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const install = useCallback(
    async (id: string) => {
      const entry = apis.find((apiEntry) => apiEntry.id === id);
      if (!entry) return;

      const presetId = PRESET_BY_API_ID[id];
      const preset = presetId ? MCP_PRESETS.find((p) => p.id === presetId) : undefined;

      if (preset) {
        await api.addMcpServer({ name: preset.label, transport: preset.transport });
        useSettingsStore.getState().bumpSettingsRevision();
        setApis((current) =>
          current.map((row) => (row.id === id ? { ...row, installed: true } : row)),
        );
        return;
      }

      // No installable transport yet — send the user to MCP settings to add one.
      openSettingsApp("mcp");
      setApis((current) =>
        current.map((row) => (row.id === id ? { ...row, installed: true } : row)),
      );
    },
    [apis],
  );

  const uninstall = useCallback(async (id: string) => {
    const entry = apis.find((apiEntry) => apiEntry.id === id);
    if (!entry) return;

    try {
      const servers = await api.listMcpServers();
      const match = servers.find(
        (s) =>
          s.config.name.toLowerCase() === entry.name.toLowerCase() ||
          PRESET_BY_API_ID[id] ===
            MCP_PRESETS.find((p) => p.label === s.config.name || p.id === s.config.id)?.id,
      );
      if (match) {
        await api.removeMcpServer(match.config.id);
        useSettingsStore.getState().bumpSettingsRevision();
      }
    } catch {
      // Fall through to local uninstall flag.
    }

    setApis((current) =>
      current.map((row) => (row.id === id ? { ...row, installed: false } : row)),
    );
    setSelectedId((current) => (current === id ? null : current));
  }, [apis]);

  const installedCount = useMemo(() => apis.filter((entry) => entry.installed).length, [apis]);

  return { apis, selected, select, install, uninstall, installedCount };
}

/** @deprecated Prefer useApis — kept for stub-era call sites. */
export const useApisStub = useApis;

export type ApisViewModel = ReturnType<typeof useApis>;
