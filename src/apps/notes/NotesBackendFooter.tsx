import { useMemo, useState } from "react";
import { ChevronUp, HardDrive, Server } from "lucide-react";
import type { AgentBackend } from "@shared/types";
import { Menu, type MenuItem } from "../../components/Menu";
import { useCan } from "../../os/auth/authStore";
import { openSettingsApp } from "../settings/settingsStore";
import {
  backendLinkStatusLabel,
  useAgentBackendsMenu,
  type BackendLinkStatus,
} from "../../os/useAgentBackendsMenu";
import { useBackendStatus } from "../../os/useBackendStatus";
import { LOCAL_NOTES_BACKEND_ID } from "./notesMock";

function kindLabel(kind: AgentBackend["kind"]): string {
  return kind === "openhands" ? "OpenHands" : "Kosmos";
}

function isConnected(status: BackendLinkStatus | undefined): boolean {
  return Boolean(status && status !== "unknown" && status !== "checking" && status.connected);
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function hostLabel(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function NotesBackendFooter({
  activeBackendId,
  onSwitchBackend,
}: {
  activeBackendId: string;
  onSwitchBackend: (backendId: string, backendName?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const canManage = useCan("settings:write");
  const localStatus = useBackendStatus();
  const { backends, statusById, loading } = useAgentBackendsMenu(open, canManage);

  const connectedBackends = useMemo(
    () => backends.filter((backend) => isConnected(statusById[backend.id])),
    [backends, statusById],
  );

  const activeRemote = backends.find((backend) => backend.id === activeBackendId) ?? null;
  const activeName =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? "Local"
      : (activeRemote?.name ?? "Backend");
  const activeMeta =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? "This machine · Notes"
      : activeRemote
        ? `${kindLabel(activeRemote.kind)} · ${hostLabel(activeRemote.host)}`
        : "Notes";
  const activeOnline =
    activeBackendId === LOCAL_NOTES_BACKEND_ID
      ? localStatus === "online"
      : isConnected(statusById[activeBackendId]);

  const items = useMemo<MenuItem[]>(() => {
    const localItem: MenuItem = {
      id: LOCAL_NOTES_BACKEND_ID,
      label: "Local",
      description: localStatus === "online" ? "This machine · Connected" : "This machine",
      icon: HardDrive,
      checked: activeBackendId === LOCAL_NOTES_BACKEND_ID,
      onSelect: () => onSwitchBackend(LOCAL_NOTES_BACKEND_ID, "Local"),
    };

    const remoteItems: MenuItem[] = connectedBackends.map((backend, index) => ({
      id: backend.id,
      label: backend.name,
      description: `${kindLabel(backend.kind)} · ${hostLabel(backend.host)} · ${backendLinkStatusLabel(statusById[backend.id])}`,
      icon: Server,
      checked: activeBackendId === backend.id,
      separatorAbove: index === 0,
      onSelect: () => onSwitchBackend(backend.id, backend.name),
    }));

    if (loading && backends.length === 0) {
      return [
        localItem,
        {
          id: "loading",
          label: "Checking backends…",
          disabled: true,
          separatorAbove: true,
        },
      ];
    }

    if (connectedBackends.length === 0) {
      return [
        localItem,
        {
          id: "empty",
          label: "No connected backends",
          description: canManage ? "Add one in Settings" : "Ask an admin to connect a backend",
          disabled: true,
          separatorAbove: true,
        },
      ];
    }

    return [localItem, ...remoteItems];
  }, [
    activeBackendId,
    backends.length,
    canManage,
    connectedBackends,
    loading,
    localStatus,
    onSwitchBackend,
    statusById,
  ]);

  const footerItems = useMemo<MenuItem[]>(
    () =>
      canManage
        ? [
            {
              id: "manage",
              label: "Manage backends…",
              separatorAbove: true,
              onSelect: () => openSettingsApp("agent"),
            },
          ]
        : [],
    [canManage],
  );

  return (
    <Menu
      className="arco-notes-backend-menu"
      aria-label="Switch notes backend"
      side="top"
      align="start"
      portal
      heading="Notes vault"
      open={open}
      onOpenChange={setOpen}
      items={items}
      footerItems={footerItems}
      trigger={
        <button
          type="button"
          className="arco-nav-sidebar__user-footer"
          aria-label={`Notes vault: ${activeName}`}
          aria-haspopup="menu"
        >
          <span className="arco-avatar arco-avatar--md" role="img" aria-label={activeName}>
            {initials(activeName) || "N"}
            <span
              className={`arco-avatar__status ${activeOnline ? "arco-avatar__status--online" : ""}`}
              aria-hidden="true"
            />
          </span>
          <span className="arco-nav-sidebar__user-body">
            <span className="arco-nav-sidebar__user-name">{activeName}</span>
            <span className="arco-nav-sidebar__user-meta">{activeMeta}</span>
          </span>
          <ChevronUp size={14} className="arco-notes-backend-menu__chevron" aria-hidden="true" />
        </button>
      }
    />
  );
}
