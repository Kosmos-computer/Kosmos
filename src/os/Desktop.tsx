/**
 * The desktop shell: wallpaper, menu bar, window layer, dock, notifications.
 * A deliberate contrast to matrix-os's 2k-line Desktop.tsx — every concern
 * lives in its own module and this file just composes them.
 */
import { useEffect, type CSSProperties } from "react";
import { Bell } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { MenuBar } from "./MenuBar";
import { NavRail } from "./NavRail";
import { Dock } from "./Dock";
import { WindowFrame } from "./WindowFrame";
import { systemApp } from "./systemApps";
import { connectShellEvents } from "./shellEvents";
import { AppSurface } from "../apps/appview/AppSurface";
import { WebAppSurface } from "../apps/appview/WebAppSurface";
import { AppHost } from "../apps/appview/AppHost";
import { AgentCursor } from "./cursor/AgentCursor";
import { ConfirmCard } from "../apps/chat/ConfirmCard";

function Notifications() {
  const notifications = useOsStore((s) => s.notifications);
  const dismiss = useOsStore((s) => s.dismissNotification);
  if (notifications.length === 0) return null;
  return (
    <div className="arco-notifications" role="status" aria-live="polite">
      {notifications.map((n) => (
        <div key={n.id} className="arco-notification">
          <Bell size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1 }}>{n.message}</span>
          <button onClick={() => dismiss(n.id)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Approval cards for agent turns without a chat stream (voice) — same
 *  ConfirmCard as the chat thread, floated above the desktop. */
function ShellConfirms() {
  const confirms = useOsStore((s) => s.shellConfirms);
  if (confirms.length === 0) return null;
  return (
    <div
      role="alertdialog"
      aria-label="Agent approval requests"
      style={{
        position: "fixed",
        top: 48,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10_000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "min(480px, calc(100vw - 32px))",
      }}
    >
      {confirms.map((c) => (
        <ConfirmCard key={c.confirmId} item={c} />
      ))}
    </div>
  );
}

function WindowContent({ winId }: { winId: string }) {
  const win = useWindowStore((s) => s.windows.find((w) => w.id === winId));
  if (!win) return null;
  if (win.kind.type === "system") {
    const Component = systemApp(win.kind.app).component;
    return <Component />;
  }
  if (win.kind.type === "web") {
    return <WebAppSurface webAppId={win.kind.webAppId} />;
  }
  if (win.kind.type === "installed") {
    return <AppHost appId={win.kind.appId} />;
  }
  return <AppSurface appId={win.kind.appId} />;
}

export function Desktop() {
  const wallpaper = useOsStore((s) => s.wallpaper);
  const navExpanded = useOsStore((s) => s.navExpanded);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);

  useEffect(() => {
    void refreshApps();
    // First boot with an empty desktop → open Chat, the OS's front door.
    if (useWindowStore.getState().windows.length === 0) {
      open({ type: "system", app: "chat" }, "Chat");
    }
    // Agent turns that run outside a chat stream (voice) drive the desktop
    // through the shell-events channel.
    const disconnect = connectShellEvents();
    // Re-sync app list when the tab regains focus (apps may have been created
    // by an automation while unfocused).
    const onFocus = () => void refreshApps();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      disconnect();
    };
  }, [refreshApps, open]);

  const focusedId = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0]?.id;

  return (
    <div
      className={`arco-desktop arco-wallpaper-${wallpaper}`}
      // Maximized windows read this to sit flush against the rail edge.
      style={{ "--arco-nav-width": navExpanded ? "200px" : "56px" } as CSSProperties}
    >
      <MenuBar />
      <NavRail />
      {windows.map((win) => (
        <WindowFrame key={win.id} win={win} focused={win.id === focusedId}>
          <WindowContent winId={win.id} />
        </WindowFrame>
      ))}
      <Dock />
      <Notifications />
      <ShellConfirms />
      <AgentCursor />
    </div>
  );
}
