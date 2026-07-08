/**
 * Renders a translated string and re-renders when the locale changes.
 * Prefer `useTranslation().t()` in interactive components; use `<T />` for
 * static JSX text nodes (including bulk-migrated copy).
 */
import { useTranslation } from "react-i18next";
import type { I18nKey } from "./declaration";

export interface TProps {
  k: I18nKey;
  values?: Record<string, unknown>;
}

export function T({ k, values }: TProps) {
  const { t } = useTranslation();
  return <>{t(k, values)}</>;
}
