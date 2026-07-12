/**
 * Resolves copy from translation.json when the HTTP locale bundle is stale or
 * still loading — keeps first-run / install UI from flashing raw I18nKey names.
 */
import translationCatalog from "./translation.json";
import type { I18nKey } from "./declaration";
import { DEFAULT_LOCALE, type ArcoLocale } from "./index";

type TranslationEntry = Partial<Record<ArcoLocale, string>> & { en: string };

function normalizeLocale(lng?: string): ArcoLocale {
  if (!lng) return DEFAULT_LOCALE;
  if (lng.startsWith("zh")) return "zh-CN";
  if (lng === "es" || lng === "de" || lng === "ja") return lng;
  return "en";
}

function catalogString(key: I18nKey, locale: ArcoLocale): string | undefined {
  const entry = translationCatalog[key as keyof typeof translationCatalog] as TranslationEntry | undefined;
  if (!entry) return undefined;
  return entry[locale] ?? entry.en;
}

/** Prefer live i18next copy; fall back to the build-time translation catalog. */
export function tWithFallback(key: I18nKey, t: (key: string) => string, locale?: string): string {
  const live = t(key);
  if (live !== key) return live;
  return catalogString(key, normalizeLocale(locale)) ?? live;
}
