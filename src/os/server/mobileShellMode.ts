/**
 * True when the Capacitor shell loads UI from the Mac Vite dev server (same-origin proxy).
 */
export function isCapacitorDevProxy(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.() !== true) return false;
  const { port, hostname } = window.location;
  // Embedded local backend serves the shell from the sidecar port.
  if (hostname === "127.0.0.1" && port === "4600") return false;
  if (port === "4610") return true;
  if (hostname === "10.0.2.2") return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && port) return true;
  return false;
}

/** Full Arco backend embedded on device (nodejs-mobile sidecar). */
export function isMobileLocalShell(): boolean {
  if (import.meta.env.VITE_ARCO_MOBILE_LOCAL === "1") return true;
  if (typeof window === "undefined") return false;
  const { hostname, port } = window.location;
  return hostname === "127.0.0.1" && port === "4600";
}

export function isMobileBundledShell(): boolean {
  if (isMobileLocalShell()) return false;
  if (import.meta.env.VITE_ARCO_MOBILE_BUNDLED === "1") return true;
  return (
    typeof window !== "undefined" &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true &&
    !isCapacitorDevProxy()
  );
}

export function mobileShellNeedsServerProfile(): boolean {
  return isMobileBundledShell() && !isCapacitorDevProxy();
}
