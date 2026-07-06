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
  HardDrive,
  SquareTerminal,
  Settings as SettingsIcon,
  StickyNote,
  Layers,
  Wallet,
  Plug,
  Rocket,
  Mail,
  CalendarDays,
  CheckSquare,
  Contact,
  Table,
  Code2,
  GraduationCap,
  UsersRound,
  Share2,
  Brain,
  Map,
  CircleDollarSign,
  Music,
  Download,
} from "lucide-react";
import type { SystemAppId } from "./windowStore";
import { ChatApp } from "../apps/chat/ChatApp";
import { StudioApp } from "../apps/studio/StudioApp";
import { STUDIO_ID, STUDIO_TITLE } from "../apps/studio/studioMeta";
import { AppsLibrary } from "../apps/library/AppsLibrary";
import { AutomationsApp } from "../apps/automations/AutomationsApp";
import { SkillsApp } from "../apps/skills/SkillsApp";
import { KeyWalletApp } from "../apps/key-wallet/KeyWalletApp";
import { ApisApp } from "../apps/apis/ApisApp";
import { FilesApp } from "../apps/files/FilesApp";
import { NotesApp } from "../apps/notes/NotesApp";
import { EmailApp } from "../apps/email/EmailApp";
import { CalendarApp } from "../apps/calendar/CalendarApp";
import { TasksApp } from "../apps/tasks/TasksApp";
import { ContactsApp } from "../apps/contacts/ContactsApp";
import { GroupsApp } from "../apps/groups/GroupsApp";
import { SocialApp } from "../apps/social/SocialApp";
import { SheetsApp } from "../apps/sheets/SheetsApp";
import { GeneratorApp } from "../apps/generator/GeneratorApp";
import { TerminalApp } from "../apps/terminal/TerminalApp";
import { SettingsApp } from "../apps/settings/SettingsApp";
import { StartupApp } from "../apps/startup/StartupApp";
import { OnboardingApp } from "../apps/onboarding/OnboardingApp";
import { MapsApp } from "../apps/maps/MapsApp";
import { PayApp } from "../apps/pay/PayApp";
import { MemoryApp } from "../apps/memory/MemoryApp";
import { MusicApp } from "../apps/music/MusicApp";
import { DownloadsApp } from "../apps/downloads/DownloadsApp";

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
  { id: "skills", title: "Skills", icon: Layers, component: SkillsApp },
  { id: "memory", title: "Memory", icon: Brain, component: MemoryApp },
  { id: "keywallet", title: "Key Wallet", icon: Wallet, component: KeyWalletApp },
  { id: "apis", title: "APIs", icon: Plug, component: ApisApp },
  { id: "automations", title: "Automations", icon: CalendarClock, component: AutomationsApp },
  { id: "files", title: "Drive", icon: HardDrive, component: FilesApp },
  { id: "maps", title: "Maps", icon: Map, component: MapsApp },
  { id: "music", title: "Music", icon: Music, component: MusicApp },
  { id: "downloads", title: "Downloads", icon: Download, component: DownloadsApp },
  { id: "pay", title: "Pay", icon: CircleDollarSign, component: PayApp },
  { id: "notes", title: "Notes", icon: StickyNote, component: NotesApp },
  { id: "email", title: "Email", icon: Mail, component: EmailApp },
  { id: "calendar", title: "Calendar", icon: CalendarDays, component: CalendarApp },
  { id: "tasks", title: "Tasks", icon: CheckSquare, component: TasksApp },
  { id: "contacts", title: "Contacts", icon: Contact, component: ContactsApp },
  { id: "groups", title: "Groups", icon: UsersRound, component: GroupsApp },
  { id: "social", title: "Social", icon: Share2, component: SocialApp },
  { id: "sheets", title: "Sheets", icon: Table, component: SheetsApp },
  { id: "generator", title: "Generator", icon: Code2, component: GeneratorApp },
  { id: "terminal", title: "Terminal", icon: SquareTerminal, component: TerminalApp },
  { id: "settings", title: "Settings", icon: SettingsIcon, component: SettingsApp },
  { id: "startup", title: "Setup", icon: Rocket, component: StartupApp },
  { id: "onboarding", title: "Onboarding", icon: GraduationCap, component: OnboardingApp },
];

export function systemApp(id: SystemAppId): SystemAppDef {
  const def = SYSTEM_APPS.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown system app: ${id}`);
  return def;
}
