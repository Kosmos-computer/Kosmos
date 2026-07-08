/**
 * Shell URL routes — maps between pathnames and launch targets.
 * Keeps Kosmos ?app= embed params working alongside path-based routes.
 */
import { resolveSystemAppId, SYSTEM_APP_CATALOG } from "./systemApps.js";

export const DEFAULT_SHELL_APP = "chat";

export type ShellRouteTarget =
  | { type: "system"; appId: string; section?: string }
  | { type: "generated"; appId: string }
  | { type: "installed"; appId: string }
  | { type: "web"; webAppId: string };

const RESERVED_SEGMENTS = new Set(["generated", "installed", "web", "settings"]);

/** True when id is a built-in system app (not generated/installed/web). */
export function isSystemAppId(id: string): boolean {
  return SYSTEM_APP_CATALOG.some((entry) => entry.id === id);
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Canonical URL path for a shell launch target. */
export function shellPathFromTarget(target: ShellRouteTarget): string {
  switch (target.type) {
    case "system":
      if (target.appId === "settings" && target.section) {
        return `/settings/${encodeSegment(target.section)}`;
      }
      return `/${encodeSegment(target.appId)}`;
    case "generated":
      return `/generated/${encodeSegment(target.appId)}`;
    case "installed":
      return `/installed/${encodeSegment(target.appId)}`;
    case "web":
      return `/web/${encodeSegment(target.webAppId)}`;
  }
}

/** Resolve a launch target from a pathname (no query string). */
export function shellTargetFromPathname(pathname: string): ShellRouteTarget | null {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const head = decodeSegment(segments[0]);

  if (head === "generated" && segments[1]) {
    return { type: "generated", appId: decodeSegment(segments[1]) };
  }
  if (head === "installed" && segments[1]) {
    return { type: "installed", appId: decodeSegment(segments[1]) };
  }
  if (head === "web" && segments[1]) {
    return { type: "web", webAppId: decodeSegment(segments[1]) };
  }
  if (head === "settings") {
    return {
      type: "system",
      appId: "settings",
      section: segments[1] ? decodeSegment(segments[1]) : undefined,
    };
  }

  if (RESERVED_SEGMENTS.has(head)) return null;

  const systemId = resolveSystemAppId(head);
  if (systemId && isSystemAppId(systemId)) {
    return { type: "system", appId: systemId };
  }

  return null;
}

/** System app path helper — used by redirects and legacy ?app= bridging. */
export function shellPathForSystemApp(appId: string, section?: string): string {
  const resolved = resolveSystemAppId(appId) ?? appId;
  return shellPathFromTarget({ type: "system", appId: resolved, section });
}
