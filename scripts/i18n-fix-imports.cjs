#!/usr/bin/env node

/**
 * Repairs import blocks broken by i18n-migrate-props.cjs inserting useTranslation
 * mid-block. Also adds useTranslation to nested function components that use t().
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

function repairImports(source) {
  let next = source;
  // Move useTranslation import out of broken multi-line import openings.
  next = next.replace(/import \{\nimport \{ useTranslation \} from "react-i18next";\n/g, 'import { useTranslation } from "react-i18next";\nimport {\n');
  // Remove duplicate useTranslation imports.
  const lines = next.split("\n");
  let seen = false;
  const filtered = [];
  for (const line of lines) {
    if (line.includes('import { useTranslation } from "react-i18next"')) {
      if (seen) continue;
      seen = true;
    }
    filtered.push(line);
  }
  next = filtered.join("\n");

  if (next.includes("useTranslation") && !next.includes('import { useTranslation } from "react-i18next"')) {
    const firstImport = next.indexOf("import ");
    next = `${next.slice(0, firstImport)}import { useTranslation } from "react-i18next";\n${next.slice(firstImport)}`;
  }
  return next;
}

function addHooksToFunctions(source) {
  if (!source.includes("t(I18nKey.")) return source;
  return source.replace(/\n(function|const) (\w+)[^{]*\{\n(?!\s*const \{ t \} = useTranslation\(\);)/g, (match, kind, name) => {
    if (name === "T") return match;
    return `${match}  const { t } = useTranslation();\n`;
  });
}

function main() {
  const files = [];
  for (const dir of ["src/apps", "src/components", "src/os"]) walk(path.join(ROOT, dir), files);
  let fixed = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    let next = repairImports(original);
    next = addHooksToFunctions(next);
    if (next !== original) {
      fs.writeFileSync(file, next);
      fixed += 1;
    }
  }
  console.log(`fixed ${fixed} files`);
}

main();
