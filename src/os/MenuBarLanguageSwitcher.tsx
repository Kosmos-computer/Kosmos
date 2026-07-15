import { I18nKey } from "../i18n/declaration";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Menu, type MenuItem } from "../components/Menu";
import { api } from "../lib/api";
import { useSettingsStore } from "../apps/settings/settingsStore";
import { applyArcoLocale, AvailableLanguages, DEFAULT_LOCALE } from "../i18n";
import { useAuthStore } from "./auth/authStore";

function localeShortCode(locale: string): string {
  const base = locale.split("-")[0] ?? locale;
  return base.toUpperCase();
}

export function MenuBarLanguageSwitcher() {
  const { i18n } = useTranslation();
  const phase = useAuthStore((s) => s.phase);
  const bumpSettingsRevision = useSettingsStore((s) => s.bumpSettingsRevision);
  const activeLocale = i18n.language || DEFAULT_LOCALE;

  const items = useMemo<MenuItem[]>(
    () =>
      AvailableLanguages.map((lang) => ({
        id: lang.value,
        label: lang.label,
        checked: activeLocale === lang.value,
        onSelect: () => {
          void (async () => {
            await applyArcoLocale(lang.value);
            if (phase === "ready") {
              try {
                await api.saveSettings({ locale: lang.value });
                bumpSettingsRevision();
              } catch {
                // Locale still applies locally via i18next.
              }
            }
          })();
        },
      })),
    [activeLocale, bumpSettingsRevision, phase],
  );

  return (
    <Menu
      trigger={
        <button
          type="button"
          className="arco-menubar__lang-btn"
          aria-label={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
          title={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
        >
          {localeShortCode(activeLocale)}
        </button>
      }
      items={items}
      align="end"
      aria-label={i18n.t(I18nKey.APPS$LONGFORMER_LANGUAGE)}
    />
  );
}
