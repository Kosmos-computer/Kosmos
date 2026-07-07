/**
 * URL launch params — used by Kosmos SteamOS to open apps via ?app= and ?embed=1.
 */
import { resolveSystemAppId } from "./systemApps.js";

/** Parse ?app= from a query string; resolves titles and qualified ids. */
export function parseLaunchAppParam(search: string): string | undefined {
  const raw = new URLSearchParams(search).get("app")?.trim();
  if (!raw) return undefined;
  return resolveSystemAppId(raw) ?? raw;
}

/** When true, render a single app surface without desktop chrome (Kosmos iframe embed). */
export function isEmbedLaunch(search: string): boolean {
  return new URLSearchParams(search).get("embed") === "1";
}
