import type { SystemAppId } from "./windowStore";
import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n";

/** Maps each system app id to its i18n title key. */
export const SYSTEM_APP_TITLE_KEYS: Record<SystemAppId, I18nKey> = {
  chat: I18nKey.OS$APP_CHAT,
  studio: I18nKey.OS$APP_STUDIO,
  apps: I18nKey.OS$APP_APPS,
  skills: I18nKey.OS$APP_SKILLS,
  agents: I18nKey.OS$APP_AGENTS,
  memory: I18nKey.OS$APP_MEMORY,
  keywallet: I18nKey.OS$APP_KEY_WALLET,
  apis: I18nKey.OS$APP_APIS,
  automations: I18nKey.OS$APP_AUTOMATIONS,
  files: I18nKey.OS$APP_DRIVE,
  maps: I18nKey.OS$APP_MAPS,
  search: I18nKey.OS$APP_SEARCH,
  longformer: I18nKey.OS$APP_LONGFORMER,
  kamiji: I18nKey.OS$APP_KAMIJI,
  music: I18nKey.OS$APP_MUSIC,
  video: I18nKey.OS$APP_VIDEO,
  meet: I18nKey.OS$APP_MEET,
  podcast: I18nKey.OS$APP_PODCASTS,
  downloads: I18nKey.OS$APP_DOWNLOADS,
  pay: I18nKey.OS$APP_PAY,
  notes: I18nKey.OS$APP_NOTES,
  email: I18nKey.OS$APP_EMAIL,
  calendar: I18nKey.OS$APP_CALENDAR,
  tasks: I18nKey.OS$APP_TASKS,
  contacts: I18nKey.OS$APP_CONTACTS,
  groups: I18nKey.OS$APP_GROUPS,
  messenger: I18nKey.OS$APP_MESSENGER,
  social: I18nKey.OS$APP_SOCIAL,
  sheets: I18nKey.OS$APP_SHEETS,
  generator: I18nKey.OS$APP_GENERATOR,
  imagegen: I18nKey.OS$APP_IMAGE_GEN,
  terminal: I18nKey.OS$APP_TERMINAL,
  models: I18nKey.OS$APP_MODELS,
  settings: I18nKey.OS$APP_SETTINGS,
  startup: I18nKey.OS$APP_SETUP,
  onboarding: I18nKey.OS$APP_ONBOARDING,
};

export function systemAppTitleKey(id: SystemAppId): I18nKey {
  return SYSTEM_APP_TITLE_KEYS[id];
}

export function systemAppTitle(id: SystemAppId): string {
  return i18n.t(SYSTEM_APP_TITLE_KEYS[id]);
}
