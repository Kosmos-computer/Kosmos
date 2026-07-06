/**
 * Standalone Electron app window — one app, native OS chrome, no shell desktop.
 */
import { useEffect } from "react";
import { EmptyState } from "../components/ui";
import { AuthGate } from "./auth/AuthGate";
import { parseWindowKey } from "./windowStore";
import { WindowContent } from "./windowContent";
import { connectShellEvents } from "./shellEvents";
import { useOsStore } from "./osStore";

export function StandaloneAppWindow({ windowKey }: { windowKey: string }) {
  const kind = parseWindowKey(windowKey);
  const refreshApps = useOsStore((s) => s.refreshApps);

  useEffect(() => {
    void refreshApps();
    const disconnect = connectShellEvents();
    return disconnect;
  }, [refreshApps]);

  return (
    <AuthGate standalone>
      {!kind ? (
        <EmptyState>Unknown app window.</EmptyState>
      ) : (
        <div className="arco-standalone-window">
          <WindowContent kind={kind} />
        </div>
      )}
    </AuthGate>
  );
}
