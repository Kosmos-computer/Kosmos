/**
 * System app registry — the fixed dock section. Generated apps are the
 * dynamic section (matrix-os dock semantics: system | generated).
 */
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  PanelsTopLeft,
  LayoutGrid,
  CalendarClock,
  FolderOpen,
  SquareTerminal,
  Settings as SettingsIcon,
  StickyNote,
} from "lucide-react";
import type { SystemAppId } from "./windowStore";
import { ChatApp } from "../apps/chat/ChatApp";
import { StudioApp } from "../apps/studio/StudioApp";
import { STUDIO_ID, STUDIO_TITLE } from "../apps/studio/studioMeta";
import { AppsLibrary } from "../apps/library/AppsLibrary";
import { AutomationsApp } from "../apps/automations/AutomationsApp";
import { FilesApp } from "../apps/files/FilesApp";
import { NotesApp } from "../apps/notes/NotesApp";
import { TerminalApp } from "../apps/terminal/TerminalApp";
import { SettingsApp } from "../apps/settings/SettingsApp";

export interface SystemAppDef {
  id: SystemAppId;
  title: string;
  icon: LucideIcon;
  component: ComponentType;
}

export const SYSTEM_APPS: SystemAppDef[] = [
  { id: "chat", title: "Chat", icon: MessageSquare, component: ChatApp },
  { id: STUDIO_ID, title: STUDIO_TITLE, icon: PanelsTopLeft, component: StudioApp },
  { id: "apps", title: "Apps", icon: LayoutGrid, component: AppsLibrary },
  { id: "automations", title: "Automations", icon: CalendarClock, component: AutomationsApp },
  { id: "files", title: "Files", icon: FolderOpen, component: FilesApp },
  { id: "notes", title: "Notes", icon: StickyNote, component: NotesApp },
  { id: "terminal", title: "Terminal", icon: SquareTerminal, component: TerminalApp },
  { id: "settings", title: "Settings", icon: SettingsIcon, component: SettingsApp },
];

export function systemApp(id: SystemAppId): SystemAppDef {
  const def = SYSTEM_APPS.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown system app: ${id}`);
  return def;
}
