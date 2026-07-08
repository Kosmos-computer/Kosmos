#!/usr/bin/env node

/**
 * Ensures every translation key has all supported languages and flags
 * copy-pasted English values that were never translated.
 */

const fs = require("fs");
const path = require("path");

const IDENTICAL_VALUE_ALLOWLIST = new Set([
  "OS$APP_LONGFORMER",
  "OS$APP_KAMIJI",
  "OS$APP_STUDIO",
  "OS$APP_CHAT",
  "OS$APP_APIS",
  "OS$APP_DRIVE",
  "OS$APP_MEET",
  "OS$APP_PAY",
  "OS$APP_PODCASTS",
  "OS$APP_SOCIAL",
  "OS$APP_TERMINAL",
  "OS$APP_DOWNLOADS",
  "INSTALL$API_KEY_PLACEHOLDER",
  "INSTALL$MODEL_PATH_CLOUD_HINT",
  "INSTALL$MODEL_PATH_LOCAL_HINT",
  "INSTALL$MODEL_PATH_OLLAMA_LABEL",
]);

function getSupportedLanguageCodes() {
  const i18nIndexPath = path.join(__dirname, "../src/i18n/index.ts");
  const i18nIndexContent = fs.readFileSync(i18nIndexPath, "utf8");
  const languageCodesRegex = /\{ label: "[^"]+", value: "([^"]+)" \}/g;
  const supportedLanguageCodes = [];
  let match;
  while ((match = languageCodesRegex.exec(i18nIndexContent)) !== null) {
    supportedLanguageCodes.push(match[1]);
  }
  return supportedLanguageCodes;
}

function checkTranslations(translationJson, supportedLanguageCodes) {
  const missingTranslations = {};
  const extraLanguages = {};
  const untranslatedKeys = {};
  const nonEnglishLanguageCodes = supportedLanguageCodes.filter((langCode) => langCode !== "en");

  Object.entries(translationJson).forEach(([key, translations]) => {
    const availableLanguages = Object.keys(translations);
    const missing = supportedLanguageCodes.filter((langCode) => !availableLanguages.includes(langCode));
    if (missing.length > 0) missingTranslations[key] = missing;

    const extra = availableLanguages.filter((langCode) => !supportedLanguageCodes.includes(langCode));
    if (extra.length > 0) extraLanguages[key] = extra;

    if (
      !IDENTICAL_VALUE_ALLOWLIST.has(key) &&
      translations.en !== undefined &&
      nonEnglishLanguageCodes.every((langCode) => translations[langCode] === translations.en)
    ) {
      untranslatedKeys[key] = translations.en;
    }
  });

  return { missingTranslations, extraLanguages, untranslatedKeys };
}

if (require.main === module) {
  const translationJsonPath = path.join(__dirname, "../src/i18n/translation.json");
  const translationJson = require(translationJsonPath);
  const supportedLanguageCodes = getSupportedLanguageCodes();
  const { missingTranslations, extraLanguages, untranslatedKeys } = checkTranslations(
    translationJson,
    supportedLanguageCodes,
  );

  // Flag keys where every non-English value equals English — warn in bulk migration
  // phases; keys in IDENTICAL_VALUE_ALLOWLIST are intentionally identical.
  if (Object.keys(untranslatedKeys).length > 0) {
    console.warn("\x1b[33mWARN: Untranslated keys detected\x1b[0m");
    console.warn(`Found ${Object.keys(untranslatedKeys).length} keys with English copied to every language.`);
    console.warn("Add professional translations or allowlist brand/technical terms before tightening CI.\n");
  }

  const hasErrors =
    Object.keys(missingTranslations).length > 0 || Object.keys(extraLanguages).length > 0;

  // Untranslated keys are warnings only (see block above).
  if (Object.keys(untranslatedKeys).length > 0) {
    // already warned
  }

  if (Object.keys(missingTranslations).length > 0) {
    console.error("\x1b[31mERROR: Missing translations detected\x1b[0m");
    Object.entries(missingTranslations).forEach(([key, langs]) => {
      console.error(`- "${key}" missing: ${langs.join(", ")}`);
    });
  }

  if (Object.keys(extraLanguages).length > 0) {
    console.error("\x1b[31mERROR: Extra languages detected\x1b[0m");
    Object.entries(extraLanguages).forEach(([key, langs]) => {
      console.error(`- "${key}" extra: ${langs.join(", ")}`);
    });
  }

  if (hasErrors) process.exit(1);
  console.log("\x1b[32mAll translation keys have complete language coverage.\x1b[0m");
}

module.exports = { IDENTICAL_VALUE_ALLOWLIST, getSupportedLanguageCodes, checkTranslations };
