import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Bell,
  Bot,
  Brain,
  CreditCard,
  Globe,
  Image,
  Keyboard,
  Languages,
  Layers,
  Link2,
  Lock,
  Mic,
  Monitor,
  Palette,
  Plug,
  Server,
  Shield,
  Sparkles,
  Target,
  User,
  Users,
  Video,
  Wallet,
  Wrench,
  Code,
  Gift,
} from "lucide-react";
import { SETTINGS_STUB_NAV_GROUPS } from "./settingsStubMock";
import type { StubSettingsSectionId } from "./settingsStubTypes";

export type SettingsSectionId =
  | StubSettingsSectionId
  | "agent"
  | "model"
  | "appearance"
  | "apps"
  | "tools"
  | "mcp"
  | "skills"
  | "memory"
  | "channels"
  | "accounts"
  | "permissions"
  | "providers"
  | "external"
  | "password"
  | "users";

export interface SettingsNavItem {
  id: SettingsSectionId;
  label: string;
  icon?: LucideIcon;
  badge?: string;
  children?: SettingsNavItem[];
  /** Hide unless the user can write settings. */
  requiresWrite?: boolean;
  /** Hide unless the user can manage users. */
  requiresUsersManage?: boolean;
}

export interface SettingsNavGroup {
  id: string;
  title: string;
  items: SettingsNavItem[];
}

const STUB_SECTION_ICONS: Partial<Record<StubSettingsSectionId, LucideIcon>> = {
  "account-info": User,
  "content-social": Globe,
  "data-privacy": Lock,
  "authorized-apps": Layers,
  connections: Link2,
  notifications: Bell,
  subscriptions: Wallet,
  "gift-inventory": Gift,
  billing: CreditCard,
  wallpaper: Image,
  accessibility: Target,
  "voice-video": Mic,
  "text-images": Monitor,
  "notification-settings": Bell,
  keybinds: Keyboard,
  language: Languages,
  "streamer-mode": Video,
  advanced: Code,
};

function stubNavItemToArco(item: (typeof SETTINGS_STUB_NAV_GROUPS)[number]["items"][number]): SettingsNavItem {
  return {
    id: item.id,
    label: item.label,
    icon: STUB_SECTION_ICONS[item.id],
    badge: item.badge,
    children: item.children?.map(stubNavItemToArco),
  };
}

export const SETTINGS_STUB_NAV: SettingsNavGroup[] = SETTINGS_STUB_NAV_GROUPS.map((group) => ({
  id: group.id,
  title: group.title,
  items: group.items.map(stubNavItemToArco),
}));

export const STUB_SETTINGS_SECTION_IDS = new Set<SettingsSectionId>(
  SETTINGS_STUB_NAV_GROUPS.flatMap((group) =>
    group.items.flatMap((item) => [
      item.id,
      ...(item.children?.map((child) => child.id) ?? []),
    ]),
  ),
);

export function isStubSettingsSection(sectionId: SettingsSectionId): sectionId is StubSettingsSectionId {
  return STUB_SETTINGS_SECTION_IDS.has(sectionId);
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  ...SETTINGS_STUB_NAV,
  {
    id: "general",
    title: "General",
    items: [
      { id: "agent", label: "Agent", icon: Bot },
      { id: "model", label: "Model provider", icon: Sparkles },
      { id: "appearance", label: "Appearance", icon: Palette },
    ],
  },
  {
    id: "platform",
    title: "Platform",
    items: [
      { id: "apps", label: "Apps", icon: AppWindow },
      { id: "tools", label: "Tools", icon: Wrench },
      { id: "mcp", label: "MCP servers", icon: Server },
      { id: "skills", label: "Skills", icon: Layers },
      { id: "memory", label: "Memory", icon: Brain, requiresWrite: true },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    items: [
      { id: "channels", label: "Channels", icon: Plug },
      { id: "accounts", label: "Connected accounts", icon: Link2 },
      { id: "external", label: "External access", icon: Globe },
      { id: "providers", label: "Default providers", icon: Shield },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      { id: "permissions", label: "Agent permissions", icon: Shield, requiresWrite: true },
      { id: "password", label: "Password", icon: Lock },
      { id: "users", label: "Users", icon: Users, requiresUsersManage: true },
    ],
  },
];

export function filterSettingsNavGroups(groups: SettingsNavGroup[], query: string): SettingsNavGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;

  return groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          const itemMatches = item.label.toLowerCase().includes(normalized);
          const children = item.children?.filter((child) => child.label.toLowerCase().includes(normalized));
          if (itemMatches) return item;
          if (children && children.length > 0) return { ...item, children };
          if (!item.children && item.label.toLowerCase().includes(normalized)) return item;
          return null;
        })
        .filter((item): item is SettingsNavItem => item !== null);

      return items.length > 0 ? { ...group, items } : null;
    })
    .filter((group): group is SettingsNavGroup => group !== null);
}

export function visibleSettingsNavGroups(options: {
  canWriteSettings: boolean;
  canManageUsers: boolean;
}): SettingsNavGroup[] {
  return SETTINGS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.requiresWrite && !options.canWriteSettings) return false;
      if (item.requiresUsersManage && !options.canManageUsers) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}

export function parentNavItem(
  groups: SettingsNavGroup[],
  sectionId: SettingsSectionId,
): SettingsNavItem | undefined {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children?.some((child) => child.id === sectionId)) return item;
    }
  }
  return undefined;
}

export function settingsSectionLabel(
  sectionId: SettingsSectionId,
  groups: SettingsNavGroup[],
): string {
  const parent = parentNavItem(groups, sectionId);
  if (parent) return parent.label;

  for (const group of groups) {
    for (const item of group.items) {
      if (item.id === sectionId) return item.label;
      const child = item.children?.find((entry) => entry.id === sectionId);
      if (child) return child.label;
    }
  }
  return "Settings";
}

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "agent";
