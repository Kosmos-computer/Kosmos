/**
 * Open the control-plane /connect pairing flow (existing account or signup).
 * Always opens externally so the frameless Electron shell is not replaced
 * (which would leave the user with no window controls or Back button).
 */
import { getPlatformBridge } from "@arco/platform-bridge";
import { kosmosConnectReturnUrl, type KosmosConnectPrefill } from "./kosmosConnectReturn";

const FALLBACK_CONTROL_PLANE = "https://kosmos-control-plane.fly.dev";

function openExternalUrl(url: string): void {
  void getPlatformBridge().openExternal(url).catch(() => {
    window.location.assign(url);
  });
}

export function openKosmosConnect(
  controlPlaneUrl: string | null | undefined,
  mode: "existing" | "signup" = "existing",
  prefill: KosmosConnectPrefill = {},
): void {
  const url = kosmosConnectReturnUrl(controlPlaneUrl ?? FALLBACK_CONTROL_PLANE, mode, prefill);
  openExternalUrl(url);
}
