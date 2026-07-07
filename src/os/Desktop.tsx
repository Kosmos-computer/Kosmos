/**
 * The desktop shell: wallpaper, menu bar, window layer, dock, notifications.
 * A deliberate contrast to matrix-os's 2k-line Desktop.tsx — every concern
 * lives in its own module and this file just composes them.
 */
import { useEffect, useState, type CSSProperties } from "react";
import { Bell } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore, type SystemAppId } from "./windowStore";
import { MenuBar } from "./MenuBar";
import { NavRail } from "./NavRail";
import { Dock } from "./Dock";
import { HoverDock } from "./HoverDock";
import { HoverMenuBar } from "./HoverMenuBar";
import { WindowFrame } from "./WindowFrame";
import { BentoDrawer } from "./bento/BentoDrawer";
import { connectShellEvents } from "./shellEvents";
import { parseLaunchAppParam } from "@shared/launchApp";
import { systemApp } from "./systemApps";
import { systemAppTitle } from "./systemAppTitles";
import { WindowContentById } from "./windowContent";
import { AgentCursor } from "./cursor/AgentCursor";
import { MusicShell } from "../apps/music/MusicShell";
import { MessengerShell } from "../apps/messenger/MessengerShell";
import { VideoShell } from "../apps/video/VideoShell";
import { PodcastShell } from "../apps/podcast/PodcastShell";
import { ConfirmCard } from "../apps/chat/ConfirmCard";
import { WallpaperBackdrop } from "./wallpaper/WallpaperBackdrop";
import {
  initNativeAppWindowBridge,
  migrateAppWindowHost,
  shouldUseNativeAppWindows,
} from "./nativeAppWindows";

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
  return <WindowContentById winId={winId} />;
}

export function Desktop() {
  const navExpanded = useOsStore((s) => s.navExpanded);
  const shellView = useOsStore((s) => s.shellView);
  const appWindowHost = useOsStore((s) => s.appWindowHost);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const [menuBarOpen, setMenuBarOpen] = useState(false);
  const nativeHost = shouldUseNativeAppWindows();
  const embeddedWindows = nativeHost ? [] : windows;

  useEffect(() => {
    void refreshApps();
    if (useWindowStore.getState().windows.length === 0) {
      const launchId = parseLaunchAppParam(window.location.search);
      if (launchId) {
        try {
          const def = systemApp(launchId as SystemAppId);
          open({ type: "system", app: def.id }, systemAppTitle(def.id));
        } catch {
          open({ type: "system", app: "chat" }, systemAppTitle("chat"));
        }
      } else {
        open({ type: "system", app: "chat" }, systemAppTitle("chat"));
      }
    }
    const disconnectNative = initNativeAppWindowBridge();
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
      disconnectNative();
    };
  }, [refreshApps, open]);

  useEffect(() => {
    migrateAppWindowHost(appWindowHost, shellView);
  }, [appWindowHost, shellView]);

  const appView = shellView === "app";

  useEffect(() => {
    if (!appView) setMenuBarOpen(false);
  }, [appView]);

  const focusedId = [...embeddedWindows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0]?.id;

  return (
    <div
      className={["arco-desktop", appView && "arco-desktop--app-view"].filter(Boolean).join(" ")}
      // Maximized windows read this to sit flush against the rail edge.
      style={
        {
          "--arco-nav-width": navExpanded ? "200px" : "56px",
          ...(appView && {
            "--arco-menubar-offset": menuBarOpen ? "34px" : "0px",
          }),
        } as CSSProperties
      }
    >
      <WallpaperBackdrop />
      <HoverMenuBar enabled={appView} onOpenChange={setMenuBarOpen}>
        <MenuBar />
      </HoverMenuBar>
      <NavRail />
      <div className="arco-window-layer">
        {embeddedWindows.map((win) => (
          <WindowFrame key={win.id} win={win} focused={win.id === focusedId}>
            <WindowContent winId={win.id} />
          </WindowFrame>
        ))}
      </div>
      <HoverDock enabled={appView}>
        <Dock />
      </HoverDock>
      <Notifications />
      <ShellConfirms />
      <BentoDrawer />
      <MusicShell />
      <MessengerShell />
      <VideoShell />
      <PodcastShell />
      <AgentCursor />
    </div>
  );
}
