/**
 * Monaco bootstrap — binds the locally-bundled monaco-editor to
 * @monaco-editor/react (instead of its default CDN loader, which would break
 * offline) and registers Vite worker entries per language service.
 *
 * Imported only by the lazy editor components, so none of this lands in the
 * shell's eager bundle.
 */
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

// ---------------------------------------------------------------------------
// Arco themes
//
// Monaco themes take literal hex values, so these mirror the token palette
// (bg-surface-solid / text-primary) rather than referencing CSS variables.
// ---------------------------------------------------------------------------

monaco.editor.defineTheme("arco-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#1a1a1c",
    "editor.lineHighlightBackground": "#242428",
    "editorGutter.background": "#1a1a1c",
  },
});

monaco.editor.defineTheme("arco-light", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#fcfdff",
    "editor.lineHighlightBackground": "#eef1f7",
    "editorGutter.background": "#fcfdff",
  },
});

loader.config({ monaco });

/** Map a workspace path to a Monaco language id (fallback: plaintext). */
export function languageForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    htm: "html",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    svg: "xml",
    toml: "ini",
    ini: "ini",
  };
  return map[ext] ?? "plaintext";
}
