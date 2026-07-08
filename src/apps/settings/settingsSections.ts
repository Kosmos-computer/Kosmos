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
import i18n from "../../i18n";
import { I18nKey } from "../../i18n/declaration";
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
  | "usage"
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

export function buildSettingsNavGroups(): SettingsNavGroup[] {
  return [
    ...SETTINGS_STUB_NAV,
    {
      id: "general",
      title: i18n.t(I18nKey.SETTINGS$SECTION_GENERAL),
      items: [
        { id: "agent", label: i18n.t(I18nKey.SETTINGS$SECTION_AGENT), icon: Bot },
        { id: "model", label: i18n.t(I18nKey.SETTINGS$SECTION_MODEL), icon: Sparkles },
        { id: "appearance", label: i18n.t(I18nKey.SETTINGS$SECTION_APPEARANCE), icon: Palette },
      ],
    },
    {
      id: "platform",
      title: i18n.t(I18nKey.SETTINGS$SECTION_PLATFORM),
      items: [
        { id: "apps", label: i18n.t(I18nKey.SETTINGS$SECTION_APPS), icon: AppWindow },
        { id: "tools", label: i18n.t(I18nKey.SETTINGS$SECTION_TOOLS), icon: Wrench },
        { id: "mcp", label: i18n.t(I18nKey.SETTINGS$SECTION_MCP), icon: Server },
        { id: "skills", label: i18n.t(I18nKey.SETTINGS$SECTION_SKILLS), icon: Layers },
        { id: "memory", label: i18n.t(I18nKey.SETTINGS$SECTION_MEMORY), icon: Brain, requiresWrite: true },
      ],
    },
    {
      id: "integrations",
      title: i18n.t(I18nKey.SETTINGS$SECTION_INTEGRATIONS),
      items: [
        { id: "channels", label: i18n.t(I18nKey.SETTINGS$SECTION_CHANNELS), icon: Plug },
        { id: "accounts", label: i18n.t(I18nKey.SETTINGS$SECTION_ACCOUNTS), icon: Link2 },
        { id: "external", label: i18n.t(I18nKey.SETTINGS$SECTION_EXTERNAL), icon: Globe },
        { id: "providers", label: i18n.t(I18nKey.SETTINGS$SECTION_PROVIDERS), icon: Shield },
      ],
    },
    {
      id: "account",
      title: i18n.t(I18nKey.SETTINGS$SECTION_ACCOUNT),
      items: [
        { id: "permissions", label: i18n.t(I18nKey.SETTINGS$SECTION_PERMISSIONS), icon: Shield, requiresWrite: true },
        { id: "usage", label: "Usage & credits", icon: CreditCard },
        { id: "password", label: i18n.t(I18nKey.SETTINGS$SECTION_PASSWORD), icon: Lock },
        { id: "users", label: i18n.t(I18nKey.SETTINGS$SECTION_USERS), icon: Users, requiresUsersManage: true },
      ],
    },
  ];
}

/** @deprecated Use buildSettingsNavGroups() for locale-aware labels. */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = buildSettingsNavGroups();

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
  const groups = buildSettingsNavGroups();
  return groups.map((group) => ({
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
  return i18n.t(I18nKey.COMMON$SETTINGS);
}

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "agent";
