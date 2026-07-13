/**
 * Agent-facing shell app catalog — every launchable app with a control mode
 * so the model knows whether to use the cursor, domain tools, or open-only.
 *
 * Keep in sync with the dock's four kinds (system / installed / generated / web).
 */
import type { AppManifest } from "./manifest.js";
import { SYSTEM_APP_CATALOG } from "./systemApps.js";

/** How the agent should operate this app after opening it. */
export type AppControlMode = "cursor" | "tools" | "open_only";

export type ShellAppKind = "system" | "generated" | "installed" | "web";

export interface ShellAppCatalogEntry {
  id: string;
  title: string;
  kind: ShellAppKind;
  /** cursor = DOM mouse; tools = domain tools (calendar_*, mail_*); open_only = window only */
  control: AppControlMode;
  /** Hint for tools-mode apps (e.g. "calendar_list_events, calendar_create_event"). */
  toolHint?: string;
  updatedAt?: string;
}

/** System apps whose content should be driven by domain tools, not the cursor. */
const SYSTEM_TOOLS_APPS: Record<string, string> = {
  email: "mail_list / mail_read / mail_send / mail_status",
  calendar: "calendar_list_events / calendar_create_event / calendar_update_event / calendar_delete_event",
};

/** Installed apps that implement contracts the agent already has tools for. */
const INSTALLED_TOOLS_BY_CONTRACT: Record<string, string> = {
  "os.calendar@1": "calendar_list_events / calendar_create_event / calendar_update_event / calendar_delete_event",
};

export function controlForSystemApp(id: string): Pick<ShellAppCatalogEntry, "control" | "toolHint"> {
  const hint = SYSTEM_TOOLS_APPS[id];
  if (hint) return { control: "tools", toolHint: hint };
  return { control: "cursor" };
}

export function controlForInstalledManifest(
  manifest: Pick<AppManifest, "tier" | "entry" | "implements">,
): Pick<ShellAppCatalogEntry, "control" | "toolHint"> {
  // Declarative OpenUI installs render in-process (#3) — native cursor.
  if (manifest.tier === "declarative" || manifest.entry.kind === "openui") {
    return { control: "cursor" };
  }
  // Remote URL embeds: no guaranteed SDK — tools first, else open_only (#1 / fail closed).
  if (manifest.entry.kind === "url") {
    for (const contract of manifest.implements ?? []) {
      const hint = INSTALLED_TOOLS_BY_CONTRACT[contract];
      if (hint) return { control: "tools", toolHint: hint };
    }
    return {
      control: "open_only",
      toolHint: "No UI bridge for remote URL apps — add createAppClient() + same-origin host, or contribute domain tools",
    };
  }
  // Same-origin code bundles: AppHost UI bridge (#2) makes them cursor-driveable.
  // Prefer domain tools when a contract exists (calendar, …).
  for (const contract of manifest.implements ?? []) {
    const hint = INSTALLED_TOOLS_BY_CONTRACT[contract];
    if (hint) return { control: "tools", toolHint: `${hint} (UI also driveable via iframe bridge)` };
  }
  return { control: "cursor", toolHint: "via AppHost UI bridge (path #2)" };
}

export function controlForWebApp(): Pick<ShellAppCatalogEntry, "control" | "toolHint"> {
  // Future web apps without an SDK: tools if any, else open_only (#1 fallback).
  return {
    control: "open_only",
    toolHint: "Web embeds need createAppClient() UI bridge (#2) or domain tools (#1)",
  };
}

export function controlForGeneratedApp(): Pick<ShellAppCatalogEntry, "control" | "toolHint"> {
  return { control: "cursor" };
}

/** Build the full dock-equivalent catalog for list_apps / resolve misses. */
export function buildShellAppCatalog(input: {
  generated: { id: string; title: string; updatedAt?: string }[];
  installed: { manifest: AppManifest; enabled: boolean }[];
  web: { id: string; name: string }[];
}): ShellAppCatalogEntry[] {
  const entries: ShellAppCatalogEntry[] = [];

  for (const sys of SYSTEM_APP_CATALOG) {
    entries.push({
      id: sys.id,
      title: sys.title,
      kind: "system",
      ...controlForSystemApp(sys.id),
    });
  }

  for (const inst of input.installed.filter((a) => a.enabled)) {
    entries.push({
      id: inst.manifest.id,
      title: inst.manifest.name,
      kind: "installed",
      ...controlForInstalledManifest(inst.manifest),
    });
  }

  for (const app of input.generated) {
    entries.push({
      id: app.id,
      title: app.title,
      kind: "generated",
      updatedAt: app.updatedAt,
      ...controlForGeneratedApp(),
    });
  }

  for (const web of input.web) {
    entries.push({
      id: web.id,
      title: web.name,
      kind: "web",
      ...controlForWebApp(),
    });
  }

  return entries;
}

/** Look up control metadata for a resolved app id. */
export function controlForResolvedApp(
  appId: string,
  catalog: ShellAppCatalogEntry[],
): Pick<ShellAppCatalogEntry, "control" | "toolHint" | "kind" | "title"> {
  const hit = catalog.find((e) => e.id === appId);
  if (hit) {
    return { control: hit.control, toolHint: hit.toolHint, kind: hit.kind, title: hit.title };
  }
  return { control: "cursor", kind: "generated", title: appId };
}
