import { useRef, useState } from "react";
import { Plus, Server } from "lucide-react";
import type { AgentBackend } from "@shared/types";
import { useDismiss } from "../components/useDismiss";
import { Button, Switch } from "../components/ui";
import { useCan } from "./auth/authStore";
import { AddAgentBackendWizard } from "./AddAgentBackendWizard";
import { backendLinkStatusLabel, useAgentBackendsMenu, type BackendLinkStatus } from "./useAgentBackendsMenu";
import { backendStatusLabel, useBackendStatus } from "./useBackendStatus";

function kindLabel(kind: AgentBackend["kind"]): string {
  return kind === "openhands" ? "OpenHands" : "Kosmos";
}

function linkStatusDotClass(status: BackendLinkStatus | undefined): string {
  if (!status || status === "unknown" || status === "checking") return "arco-menubar__status-dot";
  return status.connected
    ? "arco-menubar__status-dot arco-menubar__status-dot--online"
    : "arco-menubar__status-dot arco-menubar__status-dot--offline";
}

export function MenuBarBackendStatus() {
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canManage = useCan("settings:write");
  const serverStatus = useBackendStatus();
  const serverLabel = backendStatusLabel(serverStatus);
  const { backends, activeId, statusById, loading, setActive, refresh } = useAgentBackendsMenu(
    open,
    canManage,
  );

  useDismiss(open, () => setOpen(false), rootRef);

  const triggerDotClass =
    serverStatus === "online"
      ? "arco-menubar__status-dot arco-menubar__status-dot--online"
      : serverStatus === "offline"
        ? "arco-menubar__status-dot arco-menubar__status-dot--offline"
        : "arco-menubar__status-dot";

  return (
    <>
      <div className="arco-menu arco-menubar__backends" ref={rootRef}>
        <button
          type="button"
          className="arco-menubar__icon-btn arco-menubar__server-btn"
          aria-label={serverLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          title={serverLabel}
          onClick={() => setOpen((value) => !value)}
        >
          <Server size={14} />
          <span className={triggerDotClass} aria-hidden="true" />
        </button>

        {open ? (
          <div
            role="menu"
            aria-label="Agent backends"
            className="arco-menu__panel arco-menu__panel--bottom arco-menu__panel--end arco-menubar-backends__panel"
          >
            <div className="arco-menubar-backends__section">
              <p className="arco-menubar-backends__heading">Arco server</p>
              <div className="arco-menubar-backends__row arco-menubar-backends__row--static">
                <span className={triggerDotClass} aria-hidden="true" />
                <div className="arco-menubar-backends__meta">
                  <span className="arco-menubar-backends__name">Local backend</span>
                  <span className="arco-menubar-backends__detail">{serverLabel}</span>
                </div>
              </div>
            </div>

            <div className="arco-menubar-backends__section">
              <p className="arco-menubar-backends__heading">Agent backends</p>
              {loading && backends.length === 0 ? (
                <p className="arco-menubar-backends__empty">Loading backends…</p>
              ) : backends.length === 0 ? (
                <p className="arco-menubar-backends__empty">No agent backends configured yet.</p>
              ) : (
                <ul className="arco-menubar-backends__list">
                  {backends.map((backend) => {
                    const linkStatus = statusById[backend.id];
                    const active = activeId === backend.id;
                    const statusText = backendLinkStatusLabel(linkStatus);
                    return (
                      <li key={backend.id} className="arco-menubar-backends__row">
                        <span
                          className={linkStatusDotClass(linkStatus)}
                          aria-hidden="true"
                          title={statusText}
                        />
                        <div className="arco-menubar-backends__meta">
                          <span className="arco-menubar-backends__name">{backend.name}</span>
                          <span className="arco-menubar-backends__detail">
                            {kindLabel(backend.kind)}
                            {backend.variant ? ` · ${backend.variant}` : ""} · {backend.host}
                          </span>
                          <span className="arco-menubar-backends__status">{statusText}</span>
                        </div>
                        <Switch
                          checked={active}
                          disabled={!canManage}
                          aria-label={`${active ? "Deactivate" : "Activate"} ${backend.name}`}
                          onChange={(event) => {
                            void setActive(backend.id, event.target.checked);
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {canManage ? (
              <div className="arco-menubar-backends__footer">
                <Button
                  variant="primary"
                  className="arco-menubar-backends__add-btn"
                  onClick={() => {
                    setOpen(false);
                    setWizardOpen(true);
                  }}
                >
                  <Plus size={14} aria-hidden />
                  Add backend
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <AddAgentBackendWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onAdded={() => {
          void refresh();
        }}
      />
    </>
  );
}
