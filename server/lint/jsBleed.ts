/**
 * Detect JS/React syntax that models hallucinate into openui-lang.
 * Runs on raw source — the parser often accepts fragments that never work at runtime.
 */
import type { LintFinding } from "./lint-openui.js";

const EACH_HINT =
  'Use `@Each(rows, "item", Card([TextContent(item.name, "large-heavy")]))` — never `.map`, arrows, or JS functions.';

const MUTATION_HINT =
  'Use `Mutation("exec", {command: "..."})` or `Mutation("db_execute", {sql: "...", params: {...}, namespace: "..."})` — first arg is a tool name string.';

const QUERY_HINT =
  'Use `results = Query("exec", {command: "..."}, defaults, refreshSeconds)` then `results.field` — there is no `.data` wrapper.';

/** Patterns that are never valid openui-lang. */
const BLEED_PATTERNS: Array<{
  code: string;
  re: RegExp;
  message: string;
  hint: string;
}> = [
  {
    code: "js-bleed-arrow",
    re: /=>/,
    message: "Arrow functions (`=>`) are not openui-lang.",
    hint: EACH_HINT,
  },
  {
    code: "js-bleed-map",
    re: /\.map\s*\(/,
    message: "`.map(...)` is JavaScript, not openui-lang.",
    hint: EACH_HINT,
  },
  {
    code: "js-bleed-function",
    re: /\bfunction\s*\(/,
    message: "`function(...)` is not openui-lang.",
    hint: EACH_HINT,
  },
  {
    code: "js-bleed-query-data",
    re: /Query\s*\([^)]*\)\s*\.data\b/,
    message: "`Query(...).data` is invalid — Query results have no `.data` wrapper.",
    hint: QUERY_HINT,
  },
  {
    code: "js-bleed-mutation-object",
    re: /Mutation\s*\(\s*\{/,
    message: "`Mutation({ ... })` object form is invalid.",
    hint: MUTATION_HINT,
  },
  {
    code: "js-bleed-undefined",
    re: /^\s*\w+\s*=\s*undefined\s*$/m,
    message: "`identifier = undefined` is not openui-lang (cannot delete orphans this way).",
    hint: "Omit the statement, or set `name = null` only if a component accepts null. Prefer a tiny `app_update` that redefines `root` without the orphan.",
  },
  {
    code: "js-bleed-js-length",
    re: /\b\w+\.length\b/,
    message: "`.length` is JavaScript — use `@Count(array)` in openui-lang.",
    hint: 'Write `@Count(results) > 0 ? Table([...]) : TextContent("No results")`.',
  },
];

/**
 * Scan source for JS-bleed. Dedupes by code so one arrow doesn't flood findings.
 */
export function detectJsBleed(code: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const seen = new Set<string>();
  for (const rule of BLEED_PATTERNS) {
    if (!rule.re.test(code)) continue;
    if (seen.has(rule.code)) continue;
    seen.add(rule.code);
    findings.push({
      code: rule.code,
      message: rule.message,
      hint: rule.hint,
    });
  }
  return findings;
}

/** True when any finding is JS-bleed (ToolCard should not celebrate success). */
export function hasJsBleed(findings: LintFinding[]): boolean {
  return findings.some((f) => f.code.startsWith("js-bleed-"));
}
