import { useEffect, useState } from "react";
import { getPlatformBridge } from "@arco/platform-bridge";

function useViewportMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

/**
 * Desktop vs MobileShell — platform profile first, then responsive breakpoint.
 */
export function useShellProfile(): boolean {
  const viewportMobile = useViewportMobile();
  const profile = getPlatformBridge().config.shellProfile;
  if (profile === "mobile") return true;
  if (profile === "desktop") return false;
  return viewportMobile;
}
