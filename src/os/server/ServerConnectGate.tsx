/**
 * Blocks the shell until a server profile is chosen (bundled mobile APK only).
 */
import type { ReactNode } from "react";
import { hasActiveServerProfile } from "./serverProfileStore";
import { mobileShellNeedsServerProfile } from "./mobileShellMode";
import { ServerConnectModal } from "./ServerConnectModal";

export function ServerConnectGate({ children }: { children: ReactNode }) {
  if (!mobileShellNeedsServerProfile()) {
    return children;
  }
  if (hasActiveServerProfile()) {
    return children;
  }
  return <ServerConnectModal />;
}
