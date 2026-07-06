import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  Bot,
  Brain,
  Globe,
  Layers,
  Link2,
  Lock,
  Palette,
  Plug,
  Server,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

export type SettingsSectionId =
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
  icon: LucideIcon;
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

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
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

export function settingsSectionLabel(
  sectionId: SettingsSectionId,
  groups: SettingsNavGroup[],
): string {
  for (const group of groups) {
    const item = group.items.find((entry) => entry.id === sectionId);
    if (item) return item.label;
  }
  return "Settings";
}

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "agent";
