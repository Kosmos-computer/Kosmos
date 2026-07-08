#!/usr/bin/env node

/** Remove stale `const { t } = useTranslation()` when a file uses i18n.t instead of t(. */

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

function clean(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  const original = source;
  const usesTCall = /\bt\(I18nKey\./.test(source);
  const usesI18nT = /\bi18n\.t\(I18nKey\./.test(source);

  if (!usesTCall && usesI18nT) {
    source = source.replace(/\n  const \{ t \} = useTranslation\(\);\n/g, "\n");
    if (!source.includes("useTranslation(")) {
      source = source.replace(/^import \{ useTranslation \} from "react-i18next";\n/m, "");
    }
  }

  if (source !== original) fs.writeFileSync(filePath, source);
}

function main() {
  const files = [];
  for (const dir of ["src/apps", "src/components", "src/os"]) walk(path.join(ROOT, dir), files);
  for (const file of files) clean(file);
  console.log("cleaned stale hooks");
}

main();
