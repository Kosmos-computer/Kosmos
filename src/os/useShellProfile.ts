import { useEffect, useState } from "react";
import { getPlatformBridge } from "@arco/platform-bridge";
import { useOsStore } from "./osStore";

/** Narrow or short viewports (phone portrait/landscape). Chromebooks/tablets exceed both. */
const COMPACT_VIEWPORT_MQ = "(max-width: 767px), (max-height: 500px)";

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_VIEWPORT_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_VIEWPORT_MQ);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return compact;
}

/**
 * Desktop vs MobileShell — platform profile first, then responsive breakpoint.
 *
 * Capacitor APKs force `shellProfile: mobile`, but on wide screens (Chromebook /
 * tablet) "desktop view" mounts the real Desktop shell with floating windows.
 */
export function useShellProfile(): boolean {
  const compactViewport = useCompactViewport();
  const shellView = useOsStore((s) => s.shellView);
  const profile = getPlatformBridge().config.shellProfile;
  if (profile === "desktop") return false;
  if (profile === "mobile") {
    if (!compactViewport && shellView === "desktop") return false;
    return true;
  }
  return compactViewport;
}
