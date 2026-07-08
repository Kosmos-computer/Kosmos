/**
 * Studio identity — the product name lives here and only here, so renaming
 * "Techno Studio" later is a one-line change. The id ("studio") is the stable
 * machine identifier (window keys, os_ui routing) and should never change.
 */
import { I18nKey } from "../../i18n/declaration";

export const STUDIO_ID = "studio" as const;
/** @deprecated Use systemAppTitle("studio") or I18nKey.OS$APP_STUDIO with t(). */
export const STUDIO_TITLE_KEY = I18nKey.OS$APP_STUDIO;
