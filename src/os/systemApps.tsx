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
  Columns3,
  Contact,
  Table,
  Code2,
  Image as ImageIcon,
  GraduationCap,
  UsersRound,
  Share2,
  Brain,
  MessagesSquare,
  Map,
  CircleDollarSign,
  Music,
  Video,
  Download,
  PlaySquare,
  Headphones,
  Search,
  FileText,
  Egg,
  Piano,
  Boxes,
  Bot,
} from "lucide-react";
import type { SystemAppId } from "./windowStore";
import { I18nKey } from "../i18n/declaration";
import { ChatApp } from "../apps/chat/ChatApp";
import { StudioApp } from "../apps/studio/StudioApp";
import { STUDIO_ID } from "../apps/studio/studioMeta";
import { AppsLibrary } from "../apps/library/AppsLibrary";
import { AutomationsApp } from "../apps/automations/AutomationsApp";
import { SkillsApp } from "../apps/skills/SkillsApp";
import { AgentsApp } from "../apps/agents/AgentsApp";
import { KeyWalletApp } from "../apps/key-wallet/KeyWalletApp";
import { ApisApp } from "../apps/apis/ApisApp";
import { FilesApp } from "../apps/files/FilesApp";
import { NotesApp } from "../apps/notes/NotesApp";
import { EmailApp } from "../apps/email/EmailApp";
import { CalendarApp } from "../apps/calendar/CalendarApp";
import { TasksApp } from "../apps/tasks/TasksApp";
import { BoardApp } from "../apps/board/BoardApp";
import { ContactsApp } from "../apps/contacts/ContactsApp";
import { GroupsApp } from "../apps/groups/GroupsApp";
import { SocialApp } from "../apps/social/SocialApp";
import { MessengerApp } from "../apps/messenger/MessengerApp";
import { SheetsApp } from "../apps/sheets/SheetsApp";
import { GeneratorApp } from "../apps/generator/GeneratorApp";
import { ImageGenApp } from "../apps/imagegen/ImageGenApp";
import { TerminalApp } from "../apps/terminal/TerminalApp";
import { ModelsApp } from "../apps/models/ModelsApp";
import { SettingsApp } from "../apps/settings/SettingsApp";
import { StartupApp } from "../apps/startup/StartupApp";
import { OnboardingApp } from "../apps/onboarding/OnboardingApp";
import { MapsApp } from "../apps/maps/MapsApp";
import { PayApp } from "../apps/pay/PayApp";
import { MemoryApp } from "../apps/memory/MemoryApp";
import { MusicApp } from "../apps/music/MusicApp";
import { VideoApp } from "../apps/video/VideoApp";
import { MeetApp } from "../apps/meet/MeetApp";
import { PodcastApp } from "../apps/podcast/PodcastApp";
import { DownloadsApp } from "../apps/downloads/DownloadsApp";
import { SearchApp } from "../apps/search/SearchApp";
import { LongformerApp } from "../apps/longformer/LongformerApp";
import { KamijiApp } from "../apps/kamiji/KamijiApp";
import { KeyboardApp } from "../apps/keyboard/KeyboardApp";

export interface SystemAppDef {
  id: SystemAppId;
  titleKey: I18nKey;
  icon: LucideIcon;
  component: ComponentType;
}

export const SYSTEM_APPS: SystemAppDef[] = [
  { id: "chat", titleKey: I18nKey.OS$APP_CHAT, icon: MessageSquare, component: ChatApp },
  { id: STUDIO_ID, titleKey: I18nKey.OS$APP_STUDIO, icon: PanelsTopLeft, component: StudioApp },
  { id: "apps", titleKey: I18nKey.OS$APP_APPS, icon: LayoutGrid, component: AppsLibrary },
  { id: "skills", titleKey: I18nKey.OS$APP_SKILLS, icon: Layers, component: SkillsApp },
  { id: "agents", titleKey: I18nKey.OS$APP_AGENTS, icon: Bot, component: AgentsApp },
  { id: "memory", titleKey: I18nKey.OS$APP_MEMORY, icon: Brain, component: MemoryApp },
  { id: "keywallet", titleKey: I18nKey.OS$APP_KEY_WALLET, icon: Wallet, component: KeyWalletApp },
  { id: "apis", titleKey: I18nKey.OS$APP_APIS, icon: Plug, component: ApisApp },
  { id: "automations", titleKey: I18nKey.OS$APP_AUTOMATIONS, icon: CalendarClock, component: AutomationsApp },
  { id: "files", titleKey: I18nKey.OS$APP_DRIVE, icon: HardDrive, component: FilesApp },
  { id: "maps", titleKey: I18nKey.OS$APP_MAPS, icon: Map, component: MapsApp },
  { id: "search", titleKey: I18nKey.OS$APP_SEARCH, icon: Search, component: SearchApp },
  { id: "longformer", titleKey: I18nKey.OS$APP_LONGFORMER, icon: FileText, component: LongformerApp },
  { id: "kamiji", titleKey: I18nKey.OS$APP_KAMIJI, icon: Egg, component: KamijiApp },
  { id: "keyboard", titleKey: I18nKey.OS$APP_KEYBOARD, icon: Piano, component: KeyboardApp },
  { id: "music", titleKey: I18nKey.OS$APP_MUSIC, icon: Music, component: MusicApp },
  { id: "video", titleKey: I18nKey.OS$APP_VIDEO, icon: PlaySquare, component: VideoApp },
  { id: "meet", titleKey: I18nKey.OS$APP_MEET, icon: Video, component: MeetApp },
  { id: "podcast", titleKey: I18nKey.OS$APP_PODCASTS, icon: Headphones, component: PodcastApp },
  { id: "downloads", titleKey: I18nKey.OS$APP_DOWNLOADS, icon: Download, component: DownloadsApp },
  { id: "pay", titleKey: I18nKey.OS$APP_PAY, icon: CircleDollarSign, component: PayApp },
  { id: "notes", titleKey: I18nKey.OS$APP_NOTES, icon: StickyNote, component: NotesApp },
  { id: "email", titleKey: I18nKey.OS$APP_EMAIL, icon: Mail, component: EmailApp },
  { id: "calendar", titleKey: I18nKey.OS$APP_CALENDAR, icon: CalendarDays, component: CalendarApp },
  { id: "tasks", titleKey: I18nKey.OS$APP_TASKS, icon: CheckSquare, component: TasksApp },
  { id: "board", titleKey: I18nKey.OS$APP_BOARD, icon: Columns3, component: BoardApp },
  { id: "contacts", titleKey: I18nKey.OS$APP_CONTACTS, icon: Contact, component: ContactsApp },
  { id: "groups", titleKey: I18nKey.OS$APP_GROUPS, icon: UsersRound, component: GroupsApp },
  { id: "messenger", titleKey: I18nKey.OS$APP_MESSENGER, icon: MessagesSquare, component: MessengerApp },
  { id: "social", titleKey: I18nKey.OS$APP_SOCIAL, icon: Share2, component: SocialApp },
  { id: "sheets", titleKey: I18nKey.OS$APP_SHEETS, icon: Table, component: SheetsApp },
  { id: "generator", titleKey: I18nKey.OS$APP_GENERATOR, icon: Code2, component: GeneratorApp },
  { id: "imagegen", titleKey: I18nKey.OS$APP_IMAGE_GEN, icon: ImageIcon, component: ImageGenApp },
  { id: "terminal", titleKey: I18nKey.OS$APP_TERMINAL, icon: SquareTerminal, component: TerminalApp },
  { id: "models", titleKey: I18nKey.OS$APP_MODELS, icon: Boxes, component: ModelsApp },
  { id: "settings", titleKey: I18nKey.OS$APP_SETTINGS, icon: SettingsIcon, component: SettingsApp },
  { id: "startup", titleKey: I18nKey.OS$APP_SETUP, icon: Rocket, component: StartupApp },
  { id: "onboarding", titleKey: I18nKey.OS$APP_ONBOARDING, icon: GraduationCap, component: OnboardingApp },
];

/** Hidden from launchers unless Settings → Advanced → Developer Apps is on. */
export const DEVELOPER_SYSTEM_APP_IDS = [
  "onboarding",
  "startup",
  "generator",
  "pay",
  "imagegen",
  "meet",
] as const satisfies readonly SystemAppId[];

const DEVELOPER_SYSTEM_APP_ID_SET = new Set<string>(DEVELOPER_SYSTEM_APP_IDS);

export function isDeveloperSystemApp(id: string): boolean {
  return DEVELOPER_SYSTEM_APP_ID_SET.has(id);
}

export function systemApp(id: SystemAppId): SystemAppDef {
  const def = SYSTEM_APPS.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown system app: ${id}`);
  return def;
}
