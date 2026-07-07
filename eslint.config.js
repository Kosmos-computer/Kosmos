import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const i18nStrictFiles = [
  "src/i18n/**/*.ts",
  "src/os/auth/InstallFlow.tsx",
  "src/os/systemApps.tsx",
  "src/os/shellApps.ts",
  "src/os/Dock.tsx",
  "src/i18n/I18nLocaleSync.tsx",
];

export default tseslint.config(
  {
    ignores: ["dist/**", "public/locales/**", "src/i18n/declaration.ts", "reference/**", "apps/**", "packages/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  i18next.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "i18next/no-literal-string": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: i18nStrictFiles,
    rules: {
      "i18next/no-literal-string": "error",
    },
  },
  {
    files: ["src/i18n/index.ts", "scripts/**/*.cjs"],
    rules: {
      "i18next/no-literal-string": "off",
    },
  },
);
