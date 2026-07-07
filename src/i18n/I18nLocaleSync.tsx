/**
 * Applies the persisted Settings locale once the user session is ready.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useAuthStore } from "../os/auth/authStore";
import { applyArcoLocale, DEFAULT_LOCALE } from "./index";
import { useSettingsStore } from "../apps/settings/settingsStore";

export function I18nLocaleSync() {
  const phase = useAuthStore((s) => s.phase);
  const settingsRevision = useSettingsStore((s) => s.settingsRevision);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (phase !== "ready") return;
    let cancelled = false;

    void (async () => {
      try {
        const settings = await api.getSettings();
        if (cancelled) return;
        await applyArcoLocale(settings.locale ?? DEFAULT_LOCALE);
      } catch {
        if (!cancelled) await applyArcoLocale(i18n.language || DEFAULT_LOCALE);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, settingsRevision, i18n.language]);

  return null;
}
