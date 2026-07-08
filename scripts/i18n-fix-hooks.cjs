#!/usr/bin/env node

/**
 * Removes useTranslation hooks inserted into parameter lists and re-adds them
 * correctly as the first statement in function bodies that reference t(I18nKey.
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

function stripBadHooks(source) {
  return source.replace(/\n  const \{ t \} = useTranslation\(\);\n/g, "\n");
}

function addMissingI18nKeyImport(source, filePath) {
  if (!source.includes("I18nKey.") || source.includes("I18nKey")) return source;
  const rel = path.relative(path.dirname(filePath), path.join(ROOT, "src/i18n/declaration.ts")).replace(/\\/g, "/");
  const importPath = rel.startsWith(".") ? rel : `./${rel}`;
  return `import { I18nKey } from "${importPath.replace(/\.ts$/, "")}";\n${source}`;
}

function ensureHooks(source) {
  if (!source.includes("t(I18nKey.")) return source;
  if (!source.includes('import { useTranslation } from "react-i18next"')) {
    source = `import { useTranslation } from "react-i18next";\n${source}`;
  }

  return source.replace(
    /((?:export )?(?:function \w+|const \w+ = (?:async )?function)\([^)]*\)\s*(?:: [^{]+)?\{)(\n)/g,
    (match, head, nl, offset, full) => {
      const after = full.slice(offset + match.length);
      const chunk = after.slice(0, 400);
      if (!chunk.includes("t(I18nKey.")) return match;
      if (/^\n  const \{ t \} = useTranslation\(\);\n/.test(after)) return match;
      return `${head}${nl}  const { t } = useTranslation();${nl}`;
    },
  );
}

function main() {
  const files = [];
  for (const dir of ["src/apps", "src/components", "src/os"]) walk(path.join(ROOT, dir), files);
  let fixed = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    let next = stripBadHooks(original);
    next = ensureHooks(next);
    next = addMissingI18nKeyImport(next, file);
    if (next !== original) {
      fs.writeFileSync(file, next);
      fixed += 1;
    }
  }
  console.log(`fixed ${fixed} files`);
}

main();
