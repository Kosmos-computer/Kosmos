#!/usr/bin/env node

/**
 * Migrates common string-literal props (label, title, placeholder, aria-label,
 * handleLabel, searchPlaceholder, intro) to t(I18nKey.*) using useTranslation.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const TRANSLATION_PATH = path.join(ROOT, "src/i18n/translation.json");
const LANGS = ["en", "es", "de", "ja", "zh-CN"];

const PROP_NAMES = [
  "label",
  "title",
  "placeholder",
  "aria-label",
  "handleLabel",
  "searchPlaceholder",
  "intro",
  "emptyTitle",
  "subtitle",
  "searchLabel",
];

const SKIP_FILES = new Set([
  path.join(ROOT, "src/i18n/index.ts"),
  path.join(ROOT, "src/i18n/T.tsx"),
]);

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (/\.tsx$/.test(abs) && !SKIP_FILES.has(abs)) out.push(abs);
  }
}

function filePrefix(filePath) {
  const rel = path.relative(path.join(ROOT, "src"), filePath).replace(/\\/g, "/");
  const parts = rel.replace(/\.tsx$/, "").split("/");
  if (parts[0] === "apps" && parts[1]) return `APPS$${parts[1].replace(/-/g, "_").toUpperCase()}`;
  if (parts[0] === "os") return `OS${parts[1] ? `_${parts[1].replace(/-/g, "_").toUpperCase()}` : ""}`;
  if (parts[0] === "components") return `COMPONENTS$${(parts[1] || "ROOT").replace(/-/g, "_").toUpperCase()}`;
  return "MISC";
}

function slugify(text) {
  return text
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 56);
}

function relativeImport(fromFile, toModule) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, path.join(ROOT, toModule)).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx?$/, "");
}

function ensureHookImports(source, filePath) {
  let next = source;
  const i18nImport = relativeImport(filePath, "src/i18n/index.ts");
  const keyImport = relativeImport(filePath, "src/i18n/declaration.ts");

  if (!next.includes("useTranslation")) {
    next = next.replace(/^(import .+\n)+/m, (block) => {
      if (block.includes("react-i18next")) return block;
      return `${block}import { useTranslation } from "react-i18next";\n`;
    });
    if (!next.includes("react-i18next")) {
      next = `import { useTranslation } from "react-i18next";\n${next}`;
    }
  }
  if (!next.includes("I18nKey")) {
    next = `import { I18nKey } from "${keyImport}";\n${next}`;
  }
  if (!next.includes('from "' + i18nImport + '"') && !next.includes("applyArcoLocale")) {
    // no direct i18n import needed
  }
  return next;
}

function ensureHookInComponent(source) {
  if (source.includes("const { t } = useTranslation()")) return source;
  return source.replace(
    /export function (\w+)\([^)]*\)\s*\{/,
    (match) => `${match}\n  const { t } = useTranslation();`,
  );
}

function migrateFile(filePath, translations, usedKeys) {
  let source = fs.readFileSync(filePath, "utf8");
  let changed = false;
  const prefix = filePrefix(filePath);

  for (const prop of PROP_NAMES) {
    const re = new RegExp(`(${prop})="([^"]+)"`, "g");
    source = source.replace(re, (full, propName, value) => {
      if (!value.trim() || value.includes("{")) return full;
      if (/^https?:\/\//.test(value)) return full;
      const trimmed = value.trim();
      let key = usedKeys.get(trimmed);
      if (!key) {
        key = `${prefix}_${slugify(trimmed)}`;
        let counter = 2;
        while (translations[key] && translations[key].en !== trimmed) {
          key = `${prefix}_${slugify(trimmed)}_${counter}`;
          counter += 1;
        }
        const entry = {};
        for (const lang of LANGS) entry[lang] = trimmed;
        translations[key] = entry;
        usedKeys.set(trimmed, key);
      }
      changed = true;
      return `${propName}={t(I18nKey.${key})}`;
    });
  }

  if (changed) {
    source = ensureHookImports(source, filePath);
    source = ensureHookInComponent(source);
    fs.writeFileSync(filePath, source);
  }
  return changed;
}

function main() {
  const translations = JSON.parse(fs.readFileSync(TRANSLATION_PATH, "utf8"));
  const usedKeys = new Map(Object.values(translations).map((v) => [v.en, null]).filter(Boolean));
  for (const [key, value] of Object.entries(translations)) usedKeys.set(value.en, key);

  const files = [];
  for (const dir of ["src/apps", "src/components", "src/os"]) walk(path.join(ROOT, dir), files);

  let touched = 0;
  for (const file of files) {
    if (migrateFile(file, translations, usedKeys)) touched += 1;
  }

  fs.writeFileSync(TRANSLATION_PATH, `${JSON.stringify(translations, null, 2)}\n`);
  execSync("npm run make-i18n", { cwd: ROOT, stdio: "inherit" });
  console.log(JSON.stringify({ touched, totalKeys: Object.keys(translations).length }, null, 2));
}

main();
