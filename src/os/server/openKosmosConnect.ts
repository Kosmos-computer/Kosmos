/**
 * Open the control-plane /connect pairing flow (existing account or signup).
 */
import { kosmosConnectReturnUrl } from "./kosmosConnectReturn";

const FALLBACK_CONTROL_PLANE = "https://kosmos-control-plane.fly.dev";

export function openKosmosConnect(
  controlPlaneUrl: string | null | undefined,
  mode: "existing" | "signup" = "existing",
): void {
  window.location.href = kosmosConnectReturnUrl(controlPlaneUrl ?? FALLBACK_CONTROL_PLANE, mode);
}
