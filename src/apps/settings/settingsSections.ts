import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Bot,
  Brain,
  CreditCard,
  Download,
  Globe,
  HardDrive,
  Image,
  Layers,
  Link2,
  Lock,
  Palette,
  Plug,
  Server,
  Shield,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  Cloud,
  Code,
} from "lucide-react";
import i18n from "../../i18n";
import { isArcoDesktop } from "../../lib/desktopBridge";
import { mobileShellNeedsServerProfile } from "../../os/server/mobileShellMode";
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
  | "server"
  | "usage"
  | "kosmos-cloud"
  | "downloads"
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
  /** Show only on bundled mobile shell (server profiles). */
  requiresMobileServer?: boolean;
  /** Show only on desktop (Electron/Tauri). */
  requiresDesktop?: boolean;
}

export interface SettingsNavGroup {
  id: string;
  title: string;
  items: SettingsNavItem[];
}

/** Stub section ids retained for type/deep-link guards; not shown in Settings nav. */
export const STUB_SETTINGS_SECTION_IDS = new Set<SettingsSectionId>(
  SETTINGS_STUB_NAV_GROUPS.flatMap((group) =>
    group.items.flatMap((item) => [
      item.id,
      ...(item.children?.map((child) => child.id) ?? []),
    ]),
  ),
);

/**
 * Stub nav ids that still map to real settings panes (not SettingsStubPane).
 * Keep these out of the stub nav while they remain valid SettingsSectionIds.
 */
export const BILLING_SETTINGS_SECTION_IDS = new Set<SettingsSectionId>(["subscriptions", "billing"]);

/** Sections that share a stub id but render live UI only. */
const LIVE_SETTINGS_SECTION_IDS = new Set<SettingsSectionId>([
  ...BILLING_SETTINGS_SECTION_IDS,
  "advanced",
  "wallpaper",
]);

export function isStubSettingsSection(sectionId: SettingsSectionId): sectionId is StubSettingsSectionId {
  if (LIVE_SETTINGS_SECTION_IDS.has(sectionId)) return false;
  return STUB_SETTINGS_SECTION_IDS.has(sectionId);
}

export function buildSettingsNavGroups(): SettingsNavGroup[] {
  // Stub Longformer Profile / Billing / Experience pages stay in settingsStubMock
  // for later wiring, but are hidden from the live Settings nav.
  return [
    {
      id: "general",
      title: i18n.t(I18nKey.SETTINGS$SECTION_GENERAL),
      items: [
        { id: "password", label: i18n.t(I18nKey.SETTINGS$SECTION_PASSWORD), icon: Lock },
        { id: "users", label: i18n.t(I18nKey.SETTINGS$SECTION_USERS), icon: Users, requiresUsersManage: true },
        { id: "subscriptions", label: "Subscriptions", icon: Wallet },
        { id: "usage", label: "Usage & credits", icon: CreditCard },
        { id: "advanced", label: "Advanced", icon: Code },
      ],
    },
    {
      id: "appearance",
      title: i18n.t(I18nKey.SETTINGS$SECTION_APPEARANCE),
      items: [
        { id: "appearance", label: "Theme", icon: Palette },
        { id: "wallpaper", label: "Wallpaper", icon: Image },
      ],
    },
    {
      id: "agent",
      title: i18n.t(I18nKey.SETTINGS$SECTION_AGENT),
      items: [
        { id: "agent", label: "Runtime", icon: Bot },
        { id: "model", label: i18n.t(I18nKey.SETTINGS$SECTION_MODEL), icon: Sparkles },
        { id: "permissions", label: i18n.t(I18nKey.SETTINGS$SECTION_PERMISSIONS), icon: Shield, requiresWrite: true },
        { id: "memory", label: i18n.t(I18nKey.SETTINGS$SECTION_MEMORY), icon: Brain, requiresWrite: true },
        { id: "skills", label: i18n.t(I18nKey.SETTINGS$SECTION_SKILLS), icon: Layers },
        { id: "tools", label: i18n.t(I18nKey.SETTINGS$SECTION_TOOLS), icon: Wrench },
        { id: "mcp", label: i18n.t(I18nKey.SETTINGS$SECTION_MCP), icon: Server },
        { id: "external", label: i18n.t(I18nKey.SETTINGS$SECTION_EXTERNAL), icon: Globe },
      ],
    },
    {
      id: "integrations",
      title: i18n.t(I18nKey.SETTINGS$SECTION_INTEGRATIONS),
      items: [
        { id: "accounts", label: i18n.t(I18nKey.SETTINGS$SECTION_ACCOUNTS), icon: Link2 },
        { id: "channels", label: i18n.t(I18nKey.SETTINGS$SECTION_CHANNELS), icon: Plug },
      ],
    },
    {
      id: "platform",
      title: i18n.t(I18nKey.SETTINGS$SECTION_PLATFORM),
      items: [
        { id: "apps", label: i18n.t(I18nKey.SETTINGS$SECTION_APPS), icon: AppWindow },
        { id: "providers", label: i18n.t(I18nKey.SETTINGS$SECTION_PROVIDERS), icon: Shield },
        { id: "downloads", label: "Downloads", icon: Download },
        { id: "kosmos-cloud", label: "Kosmos Cloud", icon: Cloud, requiresDesktop: true },
        { id: "server", label: "Server", icon: HardDrive, requiresMobileServer: true },
      ],
    },
  ];
}

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
      if (item.requiresDesktop && !isArcoDesktop()) return false;
      if (item.requiresMobileServer && !mobileShellNeedsServerProfile()) return false;
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
