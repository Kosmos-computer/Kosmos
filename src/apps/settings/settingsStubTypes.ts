/** STUB: Longformer SettingsWorkspace content model — wire to real settings API later. */

export type StubSettingsSectionId =
  | "account-info"
  | "password-security"
  | "account-standing"
  | "family-center"
  | "content-social"
  | "data-privacy"
  | "authorized-apps"
  | "connections"
  | "notifications"
  | "subscriptions"
  | "gift-inventory"
  | "billing"
  | "wallpaper"
  | "accessibility"
  | "voice-video"
  | "text-images"
  | "notification-settings"
  | "keybinds"
  | "language"
  | "streamer-mode"
  | "advanced";

export interface StubSettingsNavItem {
  id: StubSettingsSectionId;
  label: string;
  badge?: string;
  children?: StubSettingsNavItem[];
}

export interface StubSettingsNavGroup {
  id: string;
  title: string;
  items: StubSettingsNavItem[];
}

export interface StubSettingsStanding {
  status: "good" | "warning" | "restricted";
  title: string;
  description: string;
  linkLabels?: string[];
}

export interface StubSettingsRowAction {
  type: "edit" | "reveal";
  label?: string;
}

export interface StubSettingsFieldRow {
  id: string;
  label: string;
  value?: string;
  masked?: boolean;
  maskedDisplay?: string;
  actions?: StubSettingsRowAction[];
}

export interface StubSettingsLinkRow {
  id: string;
  label: string;
  value?: string;
  hint?: string;
}

export interface StubSettingsToggleRow {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
}

export interface StubSettingsContentSection {
  id: StubSettingsSectionId;
  title: string;
  intro?: string;
  fields?: StubSettingsFieldRow[];
  links?: StubSettingsLinkRow[];
  toggles?: StubSettingsToggleRow[];
  standing?: StubSettingsStanding;
}

export interface StubSettingsWallpaperPreset {
  id: string;
  label: string;
  url: string;
  credit?: string;
}

export interface StubSettingsWorkspaceData {
  sections: StubSettingsContentSection[];
  wallpaperPresets: StubSettingsWallpaperPreset[];
}
