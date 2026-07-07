import { AppWindow, Monitor, type LucideIcon } from "lucide-react";
import { openSettingsApp } from "../apps/settings/settingsStore";
import type { SettingsNavGroup } from "../apps/settings/settingsSections";
import { useOsStore, type AppWindowHost, type ShellView } from "./osStore";
import type { ShellAppEntry } from "./shellApps";
import { useWindowStore } from "./windowStore";

export type CommandPaletteEntryKind = "app" | "settings" | "shell";

export interface CommandPaletteEntry {
  id: string;
  kind: CommandPaletteEntryKind;
  label: string;
  description?: string;
  keywords: string[];
  icon: LucideIcon;
  group: string;
  run: () => void;
}

function shellEntry(
  id: string,
  label: string,
  description: string,
  icon: LucideIcon,
  keywords: string[],
  run: () => void,
): CommandPaletteEntry {
  return {
    id,
    kind: "shell",
    label,
    description,
    keywords,
    icon,
    group: "Shell",
    run,
  };
}

export function buildCommandPaletteEntries(options: {
  shellApps: ShellAppEntry[];
  settingsGroups: SettingsNavGroup[];
  shellView: ShellView;
  appWindowHost: AppWindowHost;
}): CommandPaletteEntry[] {
  const { shellApps, settingsGroups, shellView, appWindowHost } = options;
  const entries: CommandPaletteEntry[] = [];

  for (const app of shellApps) {
    entries.push({
      id: `app:${app.id}`,
      kind: "app",
      label: app.title,
      description: app.generated ? "Generated app" : "App",
      keywords: [app.title, "app", "open", "launch"],
      icon: app.icon,
      group: "Apps",
      run: () => useWindowStore.getState().open(app.kind, app.title),
    });
  }

  for (const group of settingsGroups) {
    for (const item of group.items) {
      if (item.children?.length) {
        for (const child of item.children) {
          const Icon = child.icon ?? item.icon;
          if (!Icon) continue;
          entries.push({
            id: `settings:${child.id}`,
            kind: "settings",
            label: child.label,
            description: `${item.label} · Settings`,
            keywords: [child.label, item.label, group.title, "settings", "preferences"],
            icon: Icon,
            group: "Settings",
            run: () => openSettingsApp(child.id),
          });
        }
      } else if (item.icon) {
        entries.push({
          id: `settings:${item.id}`,
          kind: "settings",
          label: item.label,
          description: `${group.title} · Settings`,
          keywords: [item.label, group.title, "settings", "preferences"],
          icon: item.icon,
          group: "Settings",
          run: () => openSettingsApp(item.id),
        });
      }
    }
  }

  const setShellView = useOsStore.getState().setShellView;
  const setAppWindowHost = useOsStore.getState().setAppWindowHost;

  entries.push(
    shellEntry(
      "shell:desktop-view",
      "Desktop view",
      shellView === "desktop" ? "Active · floating windows" : "Floating windows with title bars",
      Monitor,
      ["desktop", "windows", "floating", "shell", "view", "mode"],
      () => setShellView("desktop"),
    ),
    shellEntry(
      "shell:app-view",
      "App view",
      shellView === "app" ? "Active · chromeless full-screen" : "Chromeless full-screen apps",
      AppWindow,
      ["app", "fullscreen", "chromeless", "shell", "view", "mode"],
      () => setShellView("app"),
    ),
    shellEntry(
      "shell:embedded-windows",
      "Embedded app windows",
      appWindowHost === "embedded" ? "Active · apps inside the shell" : "Open apps inside the main window",
      Monitor,
      ["embedded", "windows", "shell", "host", "inside"],
      () => setAppWindowHost("embedded"),
    ),
    shellEntry(
      "shell:native-windows",
      "Native app windows",
      appWindowHost === "native" ? "Active · separate OS windows" : "Open apps in separate OS windows",
      AppWindow,
      ["native", "windows", "shell", "host", "electron", "separate"],
      () => setAppWindowHost("native"),
    ),
  );

  return entries;
}

export function filterCommandPaletteEntries(
  entries: CommandPaletteEntry[],
  query: string,
): CommandPaletteEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [entry.label, entry.description ?? "", entry.group, ...entry.keywords]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function groupCommandPaletteEntries(
  entries: CommandPaletteEntry[],
): { group: string; entries: CommandPaletteEntry[] }[] {
  const order = ["Apps", "Settings", "Shell"];
  const grouped = new Map<string, CommandPaletteEntry[]>();

  for (const entry of entries) {
    const list = grouped.get(entry.group) ?? [];
    list.push(entry);
    grouped.set(entry.group, list);
  }

  return order
    .map((group) => ({ group, entries: grouped.get(group) ?? [] }))
    .filter((section) => section.entries.length > 0);
}
