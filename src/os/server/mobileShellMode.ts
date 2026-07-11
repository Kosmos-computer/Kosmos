type CapWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

function capacitorPlatform(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as CapWindow).Capacitor?.getPlatform?.();
}

/**
 * True when the Capacitor shell loads UI from the Mac Vite dev server (same-origin proxy).
 */
export function isCapacitorDevProxy(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapWindow).Capacitor;
  if (cap?.isNativePlatform?.() !== true) return false;
  const { port, hostname } = window.location;
  // Embedded local backend serves the shell from the sidecar port.
  if (hostname === "127.0.0.1" && port === "4600") return false;
  if (port === "4610") return true;
  if (hostname === "10.0.2.2") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && port) return true;
  return false;
}

/** Full Arco backend embedded on device (nodejs-mobile sidecar, Android only). */
export function isMobileLocalShell(): boolean {
  const platform = capacitorPlatform();

  if (platform === "ios" || platform === "web") return false;

  // Thin-client APK must never boot the embedded backend — even when a mis-synced
  // Capacitor sync inlined VITE_ARCO_MOBILE_LOCAL into the Connect bundle.
  if (import.meta.env.VITE_ARCO_MOBILE_BUNDLED === "1") return false;

  if (import.meta.env.VITE_ARCO_MOBILE_LOCAL === "1") return true;

  if (typeof window === "undefined") return false;
  const { hostname, port } = window.location;
  return hostname === "127.0.0.1" && /^460\d$/.test(port) && platform === "android";
}

export function isMobileBundledShell(): boolean {
  if (isMobileLocalShell()) return false;
  if (import.meta.env.VITE_ARCO_MOBILE_BUNDLED === "1") return true;
  return (
    typeof window !== "undefined" &&
    (window as CapWindow).Capacitor?.isNativePlatform?.() === true &&
    !isCapacitorDevProxy()
  );
}

export function mobileShellNeedsServerProfile(): boolean {
  return isMobileBundledShell() && !isCapacitorDevProxy();
}
