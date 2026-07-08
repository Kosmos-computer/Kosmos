#!/usr/bin/env node

/**
 * Bulk-migrate JSX text literals flagged by eslint-plugin-i18next.
 * Replaces text nodes with <T k={I18nKey...} /> and merges keys into translation.json.
 *
 * Usage: node scripts/i18n-bulk-migrate.cjs [--write] [--file src/apps/foo/Bar.tsx]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TRANSLATION_PATH = path.join(ROOT, "src/i18n/translation.json");
const LANGS = ["en", "es", "de", "ja", "zh-CN"];

const SKIP_FILES = new Set([
  path.join(ROOT, "src/os/auth/InstallFlow.tsx"),
  path.join(ROOT, "src/os/Dock.tsx"),
  path.join(ROOT, "src/os/shellApps.ts"),
  path.join(ROOT, "src/i18n/T.tsx"),
  path.join(ROOT, "src/i18n/I18nLocaleSync.tsx"),
]);

const COMMON_TEXT_TO_KEY = {
  Back: "COMMON$BACK",
  Continue: "COMMON$CONTINUE",
  Save: "COMMON$SAVE",
  Settings: "COMMON$SETTINGS",
  Cancel: "COMMON$CANCEL",
  Delete: "COMMON$DELETE",
  Edit: "COMMON$EDIT",
  Close: "COMMON$CLOSE",
  Search: "COMMON$SEARCH",
  Retry: "COMMON$RETRY",
  Loading: "COMMON$LOADING",
  Add: "COMMON$ADD",
  Remove: "COMMON$REMOVE",
  Install: "COMMON$INSTALL",
  Open: "COMMON$OPEN",
  Done: "COMMON$DONE",
  Yes: "COMMON$YES",
  No: "COMMON$NO",
  OK: "COMMON$OK",
  Next: "COMMON$NEXT",
  Previous: "COMMON$PREVIOUS",
  Submit: "COMMON$SUBMIT",
  Create: "COMMON$CREATE",
  Update: "COMMON$UPDATE",
  Refresh: "COMMON$REFRESH",
  Copy: "COMMON$COPY",
  Connect: "COMMON$CONNECT",
  Disconnect: "COMMON$DISCONNECT",
  Enable: "COMMON$ENABLE",
  Disable: "COMMON$DISABLE",
  Enabled: "COMMON$ENABLED",
  Disabled: "COMMON$DISABLED",
  All: "COMMON$ALL",
  None: "COMMON$NONE",
  Today: "COMMON$TODAY",
  Tomorrow: "COMMON$TOMORROW",
  Yesterday: "COMMON$YESTERDAY",
};

const COMMON_TRANSLATIONS = {
  "COMMON$CANCEL": { en: "Cancel", es: "Cancelar", de: "Abbrechen", ja: "キャンセル", "zh-CN": "取消" },
  "COMMON$DELETE": { en: "Delete", es: "Eliminar", de: "Löschen", ja: "削除", "zh-CN": "删除" },
  "COMMON$EDIT": { en: "Edit", es: "Editar", de: "Bearbeiten", ja: "編集", "zh-CN": "编辑" },
  "COMMON$CLOSE": { en: "Close", es: "Cerrar", de: "Schließen", ja: "閉じる", "zh-CN": "关闭" },
  "COMMON$SEARCH": { en: "Search", es: "Buscar", de: "Suchen", ja: "検索", "zh-CN": "搜索" },
  "COMMON$RETRY": { en: "Retry", es: "Reintentar", de: "Erneut versuchen", ja: "再試行", "zh-CN": "重试" },
  "COMMON$LOADING": { en: "Loading", es: "Cargando", de: "Laden", ja: "読み込み中", "zh-CN": "加载中" },
  "COMMON$ADD": { en: "Add", es: "Añadir", de: "Hinzufügen", ja: "追加", "zh-CN": "添加" },
  "COMMON$REMOVE": { en: "Remove", es: "Quitar", de: "Entfernen", ja: "削除", "zh-CN": "移除" },
  "COMMON$INSTALL": { en: "Install", es: "Instalar", de: "Installieren", ja: "インストール", "zh-CN": "安装" },
  "COMMON$OPEN": { en: "Open", es: "Abrir", de: "Öffnen", ja: "開く", "zh-CN": "打开" },
  "COMMON$DONE": { en: "Done", es: "Listo", de: "Fertig", ja: "完了", "zh-CN": "完成" },
  "COMMON$YES": { en: "Yes", es: "Sí", de: "Ja", ja: "はい", "zh-CN": "是" },
  "COMMON$NO": { en: "No", es: "No", de: "Nein", ja: "いいえ", "zh-CN": "否" },
  "COMMON$OK": { en: "OK", es: "OK", de: "OK", ja: "OK", "zh-CN": "确定" },
  "COMMON$NEXT": { en: "Next", es: "Siguiente", de: "Weiter", ja: "次へ", "zh-CN": "下一步" },
  "COMMON$PREVIOUS": { en: "Previous", es: "Anterior", de: "Zurück", ja: "前へ", "zh-CN": "上一步" },
  "COMMON$SUBMIT": { en: "Submit", es: "Enviar", de: "Senden", ja: "送信", "zh-CN": "提交" },
  "COMMON$CREATE": { en: "Create", es: "Crear", de: "Erstellen", ja: "作成", "zh-CN": "创建" },
  "COMMON$UPDATE": { en: "Update", es: "Actualizar", de: "Aktualisieren", ja: "更新", "zh-CN": "更新" },
  "COMMON$REFRESH": { en: "Refresh", es: "Actualizar", de: "Aktualisieren", ja: "更新", "zh-CN": "刷新" },
  "COMMON$COPY": { en: "Copy", es: "Copiar", de: "Kopieren", ja: "コピー", "zh-CN": "复制" },
  "COMMON$CONNECT": { en: "Connect", es: "Conectar", de: "Verbinden", ja: "接続", "zh-CN": "连接" },
  "COMMON$DISCONNECT": { en: "Disconnect", es: "Desconectar", de: "Trennen", ja: "切断", "zh-CN": "断开" },
  "COMMON$ENABLE": { en: "Enable", es: "Activar", de: "Aktivieren", ja: "有効化", "zh-CN": "启用" },
  "COMMON$DISABLE": { en: "Disable", es: "Desactivar", de: "Deaktivieren", ja: "無効化", "zh-CN": "禁用" },
  "COMMON$ENABLED": { en: "Enabled", es: "Activado", de: "Aktiviert", ja: "有効", "zh-CN": "已启用" },
  "COMMON$DISABLED": { en: "Disabled", es: "Desactivado", de: "Deaktiviert", ja: "無効", "zh-CN": "已禁用" },
  "COMMON$ALL": { en: "All", es: "Todo", de: "Alle", ja: "すべて", "zh-CN": "全部" },
  "COMMON$NONE": { en: "None", es: "Ninguno", de: "Keine", ja: "なし", "zh-CN": "无" },
  "COMMON$TODAY": { en: "Today", es: "Hoy", de: "Heute", ja: "今日", "zh-CN": "今天" },
  "COMMON$TOMORROW": { en: "Tomorrow", es: "Mañana", de: "Morgen", ja: "明日", "zh-CN": "明天" },
  "COMMON$YESTERDAY": { en: "Yesterday", es: "Ayer", de: "Gestern", ja: "昨日", "zh-CN": "昨天" },
};

function extractText(lines, message) {
  if (message.line === message.endLine) {
    return lines[message.line - 1].slice(message.column - 1, message.endColumn - 1);
  }
  const parts = [];
  parts.push(lines[message.line - 1].slice(message.column - 1));
  for (let i = message.line; i < message.endLine - 1; i += 1) {
    parts.push(lines[i]);
  }
  parts.push(lines[message.endLine - 1].slice(0, message.endColumn - 1));
  return parts.join("\n");
}

function shouldSkipText(raw) {
  const text = raw.trim();
  if (!text) return true;
  if (text.length === 1 && !/[A-Za-zÀ-ÿ]/.test(text)) return true;
  if (/^[\d\s.,:;!?%+\-/\\|·•—–]+$/.test(text)) return true;
  if (/[{<>}]/.test(text)) return true;
  if (/^https?:\/\//.test(text)) return true;
  if (/^v\d/.test(text)) return true;
  return false;
}

function filePrefix(filePath) {
  const rel = path.relative(path.join(ROOT, "src"), filePath).replace(/\\/g, "/");
  const parts = rel.replace(/\.tsx?$/, "").split("/");
  if (parts[0] === "apps" && parts[1]) {
    return `APPS$${parts[1].replace(/-/g, "_").toUpperCase()}`;
  }
  if (parts[0] === "os") {
    const sub = parts[1] ? `_${parts[1].replace(/-/g, "_").toUpperCase()}` : "";
    return `OS${sub}`;
  }
  if (parts[0] === "components") {
    const sub = parts[1] ? `$${parts[1].replace(/-/g, "_").toUpperCase()}` : "";
    return `COMPONENTS${sub}`;
  }
  return "MISC";
}

function slugify(text) {
  return text
    .trim()
    .replace(/\{\{.*?\}\}/g, "X")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 56);
}

function makeKey(filePath, text, usedKeys) {
  const trimmed = text.trim();
  if (COMMON_TEXT_TO_KEY[trimmed]) {
    return COMMON_TEXT_TO_KEY[trimmed];
  }

  const prefix = filePrefix(filePath);
  let base = slugify(trimmed) || "TEXT";
  let key = `${prefix}_${base}`;
  let counter = 2;
  while (usedKeys.has(key) && usedKeys.get(key) !== trimmed) {
    key = `${prefix}_${base}_${counter}`;
    counter += 1;
  }
  return key;
}

function makeEntry(enText, key) {
  if (COMMON_TRANSLATIONS[key]) {
    const translations = COMMON_TRANSLATIONS[key];
    const entry = {};
    for (const lang of LANGS) entry[lang] = translations[lang] ?? translations.en;
    return entry;
  }
  const entry = {};
  for (const lang of LANGS) entry[lang] = enText;
  return entry;
}

function relativeImport(fromFile, toModule) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, path.join(ROOT, toModule)).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.tsx?$/, "");
}

function ensureImports(source, filePath) {
  let next = source;
  const tImport = relativeImport(filePath, "src/i18n/T.tsx");
  const keyImport = relativeImport(filePath, "src/i18n/declaration.ts");

  if (!next.includes("I18nKey")) {
    next = `import { I18nKey } from "${keyImport}";\n${next}`;
  }
  if (!next.includes(`from "${tImport}"`)) {
    next = `import { T } from "${tImport}";\n${next}`;
  }
  return next;
}

function applyReplacement(source, message, replacement) {
  const lines = source.split("\n");
  const startLine = message.line - 1;
  const endLine = message.endLine - 1;
  if (startLine === endLine) {
    lines[startLine] =
      lines[startLine].slice(0, message.column - 1) +
      replacement +
      lines[startLine].slice(message.endColumn - 1);
    return lines.join("\n");
  }
  const head = lines[startLine].slice(0, message.column - 1);
  const tail = lines[endLine].slice(message.endColumn - 1);
  return [...lines.slice(0, startLine), head + replacement + tail, ...lines.slice(endLine + 1)].join(
    "\n",
  );
}

function listTargetFiles(targetFile) {
  if (targetFile) return [path.resolve(targetFile)];
  const dirs = ["src/apps", "src/components", "src/os"];
  const files = [];
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    walk(abs, files);
  }
  return files.filter((file) => /\.tsx?$/.test(file) && !SKIP_FILES.has(file));
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

function collectViolations(targetFile) {
  const files = listTargetFiles(targetFile);
  const byFile = new Map();

  for (const filePath of files) {
    let raw = "";
    try {
      raw = execSync(`npx eslint "${filePath}" --format json`, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error) {
      raw = error.stdout?.toString?.() ?? "";
      if (!raw) continue;
    }

    const data = JSON.parse(raw);
    for (const fileResult of data) {
      const messages = fileResult.messages.filter((m) => m.ruleId === "i18next/no-literal-string");
      if (messages.length > 0) byFile.set(fileResult.filePath, messages);
    }
  }

  return byFile;
}

function migrate({ write = false, targetFile = null } = {}) {
  const translations = JSON.parse(fs.readFileSync(TRANSLATION_PATH, "utf8"));
  const usedKeys = new Map(Object.entries(translations).map(([key, value]) => [key, value.en]));
  const byFile = collectViolations(targetFile);

  let replaced = 0;
  let skipped = 0;
  const touchedFiles = [];

  for (const [filePath, messages] of byFile.entries()) {
    let source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n");
    const sorted = [...messages].sort((a, b) => {
      if (b.line !== a.line) return b.line - a.line;
      return b.column - a.column;
    });

    let fileChanged = false;
    for (const message of sorted) {
      const currentLines = source.split("\n");
      const raw = extractText(currentLines, message);
      if (shouldSkipText(raw)) {
        skipped += 1;
        continue;
      }

      const displayText = raw.trim();
      const key = makeKey(filePath, displayText, usedKeys);
      usedKeys.set(key, displayText);

      if (!translations[key]) {
        translations[key] = makeEntry(displayText, key);
      }

      const enumRef = `I18nKey.${key}`;
      const finalReplacement = `<T k={${enumRef}} />`;

      source = applyReplacement(source, message, finalReplacement);
      replaced += 1;
      fileChanged = true;
    }

    if (fileChanged) {
      source = ensureImports(source, filePath);
      touchedFiles.push(filePath);
      if (write) fs.writeFileSync(filePath, source);
    }
  }

  if (write) {
    fs.writeFileSync(TRANSLATION_PATH, `${JSON.stringify(translations, null, 2)}\n`);
    execSync("npm run make-i18n", { cwd: ROOT, stdio: "inherit" });
  }

  console.log(
    JSON.stringify(
      {
        write,
        files: touchedFiles.length,
        replaced,
        skipped,
        totalKeys: Object.keys(translations).length,
      },
      null,
      2,
    ),
  );
}

const write = process.argv.includes("--write");
const fileIdx = process.argv.indexOf("--file");
const targetFile = fileIdx >= 0 ? path.resolve(ROOT, process.argv[fileIdx + 1]) : null;
migrate({ write, targetFile });
