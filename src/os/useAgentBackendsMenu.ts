import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentBackend, AgentBackendConnectionStatus } from "@shared/types";
import { api } from "../lib/api";

export type BackendLinkStatus = AgentBackendConnectionStatus | "checking" | "unknown";

interface AgentBackendsMenuState {
  backends: AgentBackend[];
  activeId: string | null;
  statusById: Record<string, BackendLinkStatus>;
  loading: boolean;
  refresh: () => Promise<AgentBackend[]>;
  setActive: (id: string, enabled: boolean) => Promise<void>;
  addBackend: (backend: Omit<AgentBackend, "id">) => Promise<void>;
}

export function useAgentBackendsMenu(open: boolean, canManage: boolean): AgentBackendsMenuState {
  const [backends, setBackends] = useState<AgentBackend[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, BackendLinkStatus>>({});
  const [loading, setLoading] = useState(false);
  const backendsRef = useRef(backends);
  backendsRef.current = backends;

  const probeStatuses = useCallback(
    async (entries: AgentBackend[]) => {
      if (!canManage || entries.length === 0) {
        setStatusById({});
        return;
      }
      await Promise.all(
        entries.map(async (backend) => {
          setStatusById((current) => ({ ...current, [backend.id]: "checking" }));
          try {
            const status = await api.testAgentBackendById(backend.id);
            setStatusById((current) => ({ ...current, [backend.id]: status }));
          } catch (err) {
            setStatusById((current) => ({
              ...current,
              [backend.id]: {
                connected: false,
                error: err instanceof Error ? err.message : "Connection failed",
              },
            }));
          }
        }),
      );
    },
    [canManage],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await api.getSettings();
      setBackends(settings.agentBackends);
      setActiveId(settings.activeAgentBackendId);
      return settings.agentBackends;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadAndProbe() {
      const entries = await refresh();
      if (!cancelled) await probeStatuses(entries);
    }

    void loadAndProbe();
    const id = window.setInterval(() => {
      void probeStatuses(backendsRef.current);
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, refresh, probeStatuses]);

  const setActive = useCallback(
    async (id: string, enabled: boolean) => {
      if (!canManage) return;
      if (enabled) {
        const result = await api.activateAgentBackend(id);
        setActiveId(result.activeId);
      } else if (activeId === id) {
        const settings = await api.saveSettings({ activeAgentBackendId: null });
        setActiveId(settings.activeAgentBackendId);
      }
    },
    [activeId, canManage],
  );

  const addBackend = useCallback(
    async (backend: Omit<AgentBackend, "id">) => {
      if (!canManage) return;
      const result = await api.addAgentBackend(backend);
      setBackends((current) => [...current, result.backend]);
      setActiveId(result.activeId);
      setStatusById((current) => ({ ...current, [result.backend.id]: "unknown" }));
    },
    [canManage],
  );

  return {
    backends,
    activeId,
    statusById,
    loading,
    refresh,
    setActive,
    addBackend,
  };
}

export function backendLinkStatusLabel(status: BackendLinkStatus | undefined): string {
  if (!status || status === "unknown") return "Status unknown";
  if (status === "checking") return "Checking connection…";
  if (status.connected) return status.version ? `Connected (${status.version})` : "Connected";
  return status.error ?? "Disconnected";
}
