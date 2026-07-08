import { createInstance, type i18n as I18nInstance } from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const ARCO_I18N_NAMESPACE = "arco";

export const AvailableLanguages = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Deutsch", value: "de" },
  { label: "日本語", value: "ja" },
  { label: "简体中文", value: "zh-CN" },
] as const;

export type ArcoLocale = (typeof AvailableLanguages)[number]["value"];

export const DEFAULT_LOCALE: ArcoLocale = "en";

const initializationPromises = new WeakMap<I18nInstance, Promise<void>>();

const initializeI18n = (instance: I18nInstance) => {
  if (!initializationPromises.has(instance)) {
    const initPromise = instance
      .use(Backend)
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: DEFAULT_LOCALE,
        debug: import.meta.env.DEV,
        supportedLngs: AvailableLanguages.map((lang) => lang.value),
        nonExplicitSupportedLngs: false,
        ns: [ARCO_I18N_NAMESPACE],
        defaultNS: ARCO_I18N_NAMESPACE,
        fallbackNS: ARCO_I18N_NAMESPACE,
        backend: {
          loadPath: "/locales/{{lng}}/{{ns}}.json",
        },
        detection: {
          order: ["localStorage", "navigator"],
          caches: ["localStorage"],
          lookupLocalStorage: "arco.locale",
        },
        interpolation: {
          escapeValue: false,
        },
      })
      .then(() => undefined);

    initializationPromises.set(instance, initPromise);
  }

  return instance;
};

export const createArcoI18n = () => initializeI18n(createInstance());

let defaultI18n: I18nInstance | null = null;

export const getI18n = () => {
  if (!defaultI18n) {
    defaultI18n = createArcoI18n();
  }
  return defaultI18n;
};

export const waitForI18n = async (instance = getI18n()) => {
  await initializationPromises.get(instance);
  return instance;
};

export async function applyArcoLocale(locale: string): Promise<void> {
  const instance = getI18n();
  await waitForI18n(instance);
  const supported = AvailableLanguages.some((entry) => entry.value === locale);
  await instance.changeLanguage(supported ? locale : DEFAULT_LOCALE);
}

const withNamespace = (options?: unknown) => {
  if (!options) return { ns: ARCO_I18N_NAMESPACE };
  if (typeof options === "object" && !Array.isArray(options)) {
    return { ns: ARCO_I18N_NAMESPACE, ...(options as Record<string, unknown>) };
  }
  return options;
};

const i18n = new Proxy({} as I18nInstance, {
  get: (_target, prop) => {
    const instance = getI18n();
    if (prop === "t") {
      return (key: string, options?: unknown) => instance.t(key, withNamespace(options) as never);
    }
    if (prop === "exists") {
      return (key: string, options?: unknown) => instance.exists(key, withNamespace(options) as never);
    }
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  set: (_target, prop, value) => {
    const instance = getI18n();
    return Reflect.set(instance, prop, value, instance);
  },
}) as I18nInstance;

export { T } from "./T";
export type { TProps } from "./T";

export default i18n;
