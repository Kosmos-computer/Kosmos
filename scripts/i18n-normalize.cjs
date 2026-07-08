#!/usr/bin/env node

/**
 * Normalizes i18n usage after bulk migration:
 * - Adds missing I18nKey / i18n imports
 * - Uses i18n.t() so nested components don't each need useTranslation
 * - Removes unused useTranslation imports
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (/\.tsx$/.test(abs)) out.push(abs);
  }
}

function relImport(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), path.join(ROOT, toFile)).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx?$/, "");
}

function normalizeFile(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  const original = source;
  const usesI18nKey = source.includes("I18nKey.");
  const usesI18nT = /\bi18n\.t\(/.test(source);
  const usesHookT = /\bt\(I18nKey\./.test(source);
  const usesTComponent = source.includes("<T k=");

  if (!usesI18nKey && !usesTComponent && !usesI18nT && !usesHookT) return false;

  if (usesI18nKey && !/import \{[^}]*\bI18nKey\b/.test(source)) {
    source = `import { I18nKey } from "${relImport(filePath, "src/i18n/declaration.ts")}";\n${source}`;
  }

  if ((usesHookT || usesI18nT) && !source.includes('from "' + relImport(filePath, "src/i18n/index.ts") + '"')) {
    if (usesHookT && !usesI18nT) {
      source = source.replace(/\bt\(I18nKey\./g, "i18n.t(I18nKey.");
    }
    if (/\bi18n\.t\(I18nKey\./.test(source) && !source.match(/import i18n from/)) {
      source = `import i18n from "${relImport(filePath, "src/i18n/index.ts")}";\n${source}`;
    }
  }

  if (usesTComponent && !source.includes('from "' + relImport(filePath, "src/i18n/T.tsx") + '"')) {
    source = `import { T } from "${relImport(filePath, "src/i18n/T.tsx")}";\n${source}`;
  }

  // Drop unused useTranslation imports and hook lines.
  if (!source.includes("useTranslation(")) {
    source = source.replace(/^import \{ useTranslation \} from "react-i18next";\n/m, "");
    source = source.replace(/\n  const \{ t \} = useTranslation\(\);\n/g, "\n");
  }

  if (source !== original) {
    fs.writeFileSync(filePath, source);
    return true;
  }
  return false;
}

function main() {
  const files = [];
  for (const dir of ["src/apps", "src/components", "src/os"]) walk(path.join(ROOT, dir), files);
  let fixed = 0;
  for (const file of files) {
    if (normalizeFile(file)) fixed += 1;
  }
  console.log(`normalized ${fixed} files`);
}

main();
