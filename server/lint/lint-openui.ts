/**
 * openui-lang lint loop — ported from openclaw-os `claw-plugin/src/lint-openui.ts`.
 *
 * Parses a program against the generated component schema and returns
 * LLM-correctable findings (validation errors, unresolved refs, orphan
 * statements, inline-reserved misuse, enum typos, hallucinated components).
 * Apps are ALWAYS saved first; lint findings ride back on the tool result so
 * the agent patches small instead of re-emitting whole programs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createParser,
  enrichErrors,
  type LibraryJSONSchema,
  type OpenUIError,
  type ParseResult,
  type Parser,
} from "@openuidev/lang-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "generated", "openui-schema.json"), "utf-8"),
) as { schema: LibraryJSONSchema; componentNames: string[] };

const LIBRARY_SCHEMA: LibraryJSONSchema = schemaJson.schema;
const COMPONENT_NAMES: readonly string[] = schemaJson.componentNames;

/** Public shape of a single lint finding returned to the LLM. */
export interface LintFinding {
  code: string;
  message: string;
  statement?: string;
  component?: string;
  path?: string;
  hint?: string;
}

interface LintAstNode {
  k: string;
  name?: unknown;
  n?: unknown;
  args?: unknown;
  els?: unknown;
  entries?: unknown;
  mappedProps?: unknown;
  then?: unknown;
  otherwise?: unknown;
}

interface LintElementNode {
  type: "element";
  typeName?: unknown;
  statementId?: unknown;
  props?: unknown;
}

function isLintAstNode(value: unknown): value is LintAstNode {
  return (
    typeof value === "object" && value !== null && typeof (value as { k?: unknown }).k === "string"
  );
}

function isLintElementNode(value: unknown): value is LintElementNode {
  return (
    typeof value === "object" && value !== null && (value as { type?: unknown }).type === "element"
  );
}

export interface LintReport {
  ok: boolean;
  findings: LintFinding[];
  summary: string;
  hint?: string;
}

let cachedParser: Parser | null = null;
function getParser(): Parser {
  if (!cachedParser) {
    cachedParser = createParser(LIBRARY_SCHEMA);
  }
  return cachedParser;
}

function unresolvedToFinding(name: string): LintFinding {
  return {
    code: "unresolved-ref",
    statement: name,
    message: `Reference "${name}" is used but never defined as a top-level statement. Add "${name} = ..." somewhere in the program.`,
    hint: 'Every identifier referenced inside a component must be assigned at the top level, e.g. `header = CardHeader("Title")` before use.',
  };
}

function orphanedToFinding(name: string): LintFinding {
  return {
    code: "orphan-statement",
    statement: name,
    message: `Statement "${name}" is defined but not reachable from \`root\`. It will be silently dropped at runtime.`,
    hint: "Reference it from root (or an ancestor of root), or delete the statement.",
  };
}

/**
 * Walk the materialized tree hunting for semantic issues the parser's value-
 * path validation can't catch — notably inline `Query()` / `Mutation()` in
 * expression position and bad `@Run`/`@Set`/`@Reset` targets.
 */
function walkSemantic(parsed: ParseResult): LintFinding[] {
  const findings: LintFinding[] = [];
  const declaredQueries = new Set(parsed.queryStatements.map((q) => q.statementId));
  const declaredMutations = new Set(parsed.mutationStatements.map((m) => m.statementId));
  const flaggedNodes = new WeakSet<object>();
  const visitedNodes = new WeakSet<object>();

  const isRunLike = (name: string): boolean => name === "Run" || name === "Set" || name === "Reset";

  const describeRunArgProblem = (
    compName: "Run" | "Set" | "Reset",
    argNode: unknown,
  ): { code: string; message: string; hint: string } | null => {
    if (!argNode || typeof argNode !== "object") {
      return {
        code: "action-bad-target",
        message: `@${compName}(...) received an empty or invalid target`,
        hint: `@${compName} must reference a declared top-level identifier (or $state for @Set/@Reset).`,
      };
    }
    const n = argNode as { k?: unknown; name?: unknown };
    const k = n.k;
    if (compName === "Run") {
      if (k === "RuntimeRef" || k === "Ref") return null;
      if (k === "Comp") {
        const inlineName = String(n.name ?? "?");
        return {
          code: "action-inline-target",
          message: `@Run(${inlineName}(...)) was passed an inline call. @Run needs a reference to a top-level declared statement.`,
          hint: `Declare \`myMutation = ${inlineName}("tool", { ... })\` at the top level, parameterize via $state, then use \`@Run(myMutation)\`.`,
        };
      }
      return {
        code: "action-bad-target",
        message: `@Run expects a reference to a declared Query or Mutation, got k="${String(k)}"`,
        hint: `Declare the target at the top level (e.g. \`refresh = Query(...)\`) and pass its name: \`@Run(refresh)\`.`,
      };
    }
    if (k === "StateRef" || k === "Ref") return null;
    return {
      code: "action-bad-target",
      message: `@${compName} expects a $state target, got k="${String(k)}"`,
      hint: `Declare \`$myVar = ...\` at the top level and pass it: \`@${compName}($myVar${compName === "Set" ? ", newValue" : ""})\`.`,
    };
  };

  const visit = (node: unknown, nodePath: string[]): void => {
    if (!node || typeof node !== "object") return;
    if (visitedNodes.has(node)) return;
    visitedNodes.add(node);
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) visit(node[i], [...nodePath, `[${i}]`]);
      return;
    }
    if (isLintElementNode(node) && node.props && typeof node.props === "object") {
      for (const [key, value] of Object.entries(node.props as Record<string, unknown>)) {
        visit(value, [...nodePath, key]);
      }
    }
    if (isLintAstNode(node)) {
      if (
        node.k === "Comp" &&
        (node.name === "Query" || node.name === "Mutation") &&
        !flaggedNodes.has(node)
      ) {
        flaggedNodes.add(node);
        const statementGuess = nodePath.find(
          (seg) => typeof seg === "string" && /^[a-z][a-zA-Z0-9_]*$/.test(seg),
        );
        findings.push({
          code: "inline-reserved",
          message: `${node.name}(...) is used inline. It must be declared as a top-level statement — e.g. \`myRef = ${node.name}("tool", { ... })\` — then referenced by name.`,
          ...(statementGuess ? { statement: statementGuess } : {}),
          component: node.name,
          hint: `When the call needs per-row data, route it through $state: \`$selectedId = null; myRef = ${node.name}("tool", { params: {id: $selectedId}, ... }); Button(..., Action([@Set($selectedId, row.id), @Run(myRef)]))\`.`,
        });
      }
      if (
        node.k === "Comp" &&
        typeof node.name === "string" &&
        isRunLike(node.name) &&
        !flaggedNodes.has(node)
      ) {
        flaggedNodes.add(node);
        const firstArg = Array.isArray(node.args) ? node.args[0] : undefined;
        const compName = node.name as "Run" | "Set" | "Reset";
        const problem = describeRunArgProblem(compName, firstArg);
        if (problem) {
          findings.push({
            code: problem.code,
            message: problem.message,
            component: compName,
            hint: problem.hint,
          });
        } else if (compName === "Run" && isLintAstNode(firstArg)) {
          if (firstArg.k === "Ref" && typeof firstArg.n === "string") {
            const refName = firstArg.n;
            if (!declaredQueries.has(refName) && !declaredMutations.has(refName)) {
              findings.push({
                code: "action-unknown-target",
                message: `@Run(${refName}) references "${refName}", which is not declared as a top-level Query or Mutation.`,
                component: "Run",
                statement: refName,
                hint: `Add \`${refName} = Query("tool", ...)\` or \`${refName} = Mutation("tool", ...)\` at the top level.`,
              });
            }
          }
        }
      }
      if (Array.isArray(node.args)) visit(node.args, [...nodePath, "args"]);
      if (Array.isArray(node.els)) visit(node.els, [...nodePath, "els"]);
      if (Array.isArray(node.entries)) visit(node.entries, [...nodePath, "entries"]);
      if (node.mappedProps && typeof node.mappedProps === "object") {
        for (const [key, value] of Object.entries(node.mappedProps as Record<string, unknown>)) {
          visit(value, [...nodePath, "mappedProps", key]);
        }
      }
      if (node.then) visit(node.then, [...nodePath, "then"]);
      if (node.otherwise) visit(node.otherwise, [...nodePath, "otherwise"]);
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (value && typeof value === "object") visit(value, [...nodePath, key]);
    }
  };

  visit(parsed.root, ["root"]);
  return findings;
}

/**
 * Enum validator — the upstream parser silently drops `enum` arrays at
 * compile time, so string-literal props must be validated here against the
 * generated schema (the "col-not-column" class of bugs).
 */
type SchemaProperty = { type?: string; enum?: unknown[] };
type ComponentSchema = { properties?: Record<string, SchemaProperty> };
type SchemaDefs = Record<string, ComponentSchema>;

const SCHEMA_DEFS: SchemaDefs =
  ((LIBRARY_SCHEMA as unknown as { $defs?: SchemaDefs }).$defs as SchemaDefs) ?? {};

// High-confidence typo → correction mapping. Only entries where the bad value
// has ONE obvious right answer regardless of component.
const ENUM_TYPO_FIX: Record<string, string> = {
  col: "column",
  vertical: "column",
  horizontal: "row",
  huge: "large-heavy",
  medium: "md",
  negative: "danger",
  positive: "success",
};

function buildEnumHint(
  compName: string,
  propName: string,
  badValue: string,
  allowed: readonly unknown[],
): string {
  const allowedList = allowed.map((v) => `"${String(v)}"`).join(" | ");
  const fix = ENUM_TYPO_FIX[badValue.toLowerCase()];
  if (fix && allowed.includes(fix)) {
    return `Use "${fix}" instead. Valid values for ${compName}.${propName}: ${allowedList}.`;
  }
  return `Valid values for ${compName}.${propName}: ${allowedList}.`;
}

function walkEnumValidation(parsed: ParseResult): LintFinding[] {
  const findings: LintFinding[] = [];
  const seen = new WeakSet<object>();

  const visit = (node: unknown, statementHint: string | undefined): void => {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) visit(item, statementHint);
      return;
    }

    if (isLintElementNode(node)) {
      const compName = typeof node.typeName === "string" ? node.typeName : undefined;
      const elementStatement =
        typeof node.statementId === "string" ? node.statementId : statementHint;
      const props =
        node.props && typeof node.props === "object"
          ? (node.props as Record<string, unknown>)
          : undefined;
      if (compName && props) {
        const compSchema = SCHEMA_DEFS[compName];
        const propsSchema = compSchema?.properties;
        if (propsSchema) {
          for (const [propName, value] of Object.entries(props)) {
            if (typeof value !== "string") continue;
            const propSchema = propsSchema[propName];
            const allowed = propSchema?.enum;
            if (!Array.isArray(allowed) || allowed.length === 0) continue;
            if (allowed.includes(value)) continue;
            findings.push({
              code: "invalid-enum",
              component: compName,
              path: propName,
              ...(elementStatement ? { statement: elementStatement } : {}),
              message: `${compName}.${propName} got "${value}" — not a valid value.`,
              hint: buildEnumHint(compName, propName, value, allowed),
            });
          }
        }
        for (const v of Object.values(props)) visit(v, elementStatement);
        return;
      }
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const nextHint =
        statementHint ??
        (typeof key === "string" && /^[a-z][a-zA-Z0-9_]*$/.test(key) ? key : undefined);
      visit(value, nextHint);
    }
  };

  visit(parsed.root, undefined);
  return findings;
}

/**
 * Hallucination-replacement table — curated from openclaw-os trajectory
 * failure-mining (real names agents emit). Kept tight; long lists are noise.
 */
const COMPONENT_REPLACEMENTS: Record<string, string> = {
  Heading: 'CardHeader("Title", "Subtitle") or TextContent("Title", "large-heavy")',
  PageHeader: 'CardHeader("Title", "Subtitle")',
  Section:
    "SectionBlock([SectionItem(...)]) in chat / Accordion([AccordionItem(...)]) in apps — there is no plain Section",
  KpiCard:
    'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk") — there is no KPI component, this is the recipe',
  KPICard: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  KPI: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  StatCard: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  Stat: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  Metric: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  KeyValue: 'Card([TextContent("Label", "small"), TextContent(value, "large-heavy")], "sunk")',
  KeyValueList:
    "Stack of Cards with the KPI recipe (Card([TextContent(label,'small'), TextContent(value,'large-heavy')], 'sunk'))",
  Markdown: "MarkDownRenderer",
  Badge: 'Tag(text, null, "sm", "info" | "success" | "warning" | "danger")',
  Divider: "Separator()",
  Tab: 'TabItem("id", "Trigger", [content])',
  Grid: "two Stack rows of max 3 children — do NOT use wrap=true on a row of Cards",
  TextH1: 'TextContent("text", "large-heavy")',
  TextSmall: 'TextContent("text", "small")',
  TextMuted: 'TextContent("text", "small")',
  TextEyebrow: 'TextContent("text", "small")',
  FollowUp: 'FollowUpItem("text") — one arg only, the clickable text',
  FollowUpBlock:
    "chat-only — in apps, use a FollowUp-style row of Buttons or @Each(rows, 'r', Button(r.label, Action([@ToAssistant(r.msg)])))",
  ListBlock:
    "chat-only — in apps, use Table or @Each(rows, 'r', Card([...])) for clickable item lists",
  ListItem: "chat-only — see ListBlock note",
  SectionBlock: "chat-only — in apps, use Accordion([AccordionItem(...)])",
  SectionItem: "chat-only — see SectionBlock note",
  Map: "@Each(rows, 'item', Component(item.field))",
  JsonParse: "Query('exec', ...) auto-parses stdout that starts with { or [",
  ParseJSON: "Query('exec', ...) auto-parses stdout that starts with { or [",
  Length: "@Count(array)",
  Find: "@First(@Filter(array, 'field', '==', value))",
};

const REPLACEMENT_PRIMER =
  "Common hallucinations and their canonical replacements:\n" +
  Object.entries(COMPONENT_REPLACEMENTS)
    .slice(0, 12)
    .map(([k, v]) => `  ${k} → ${v}`)
    .join("\n");

function enrichHallucinationHint(finding: LintFinding): LintFinding {
  if (finding.code !== "unknown-component") return finding;
  const name = finding.component ?? "";
  const direct = COMPONENT_REPLACEMENTS[name] ?? COMPONENT_REPLACEMENTS[name.replace(/^@/, "")];
  const baseHint = finding.hint ?? "";
  if (direct) {
    return {
      ...finding,
      hint: `Use ${direct}. ${baseHint}`.trim(),
    };
  }
  return finding;
}

function summarize(findings: LintFinding[]): string {
  if (findings.length === 0) return "ok";
  return findings
    .map((f) => {
      const parts = [
        f.statement ? `[${f.statement}]` : undefined,
        f.component ? `${f.component}` : undefined,
        f.path || undefined,
        f.message,
      ].filter(Boolean);
      return parts.join(" ");
    })
    .join("\n");
}

const componentNames = COMPONENT_NAMES as string[];

/**
 * Parse the given openui-lang program and surface any fixable issues.
 * Only returns issues the LLM can correct by editing the source.
 */
export function lintOpenUICode(code: string): LintReport {
  if (typeof code !== "string" || code.trim().length === 0) {
    return {
      ok: false,
      findings: [
        {
          code: "empty-code",
          message: "Code is empty. Provide a valid openui-lang program.",
        },
      ],
      summary: "empty",
    };
  }

  const parser = getParser();
  let errors: OpenUIError[] = [];
  let unresolved: string[] = [];
  let orphaned: string[] = [];

  let semantic: LintFinding[] = [];
  let enumIssues: LintFinding[] = [];
  try {
    const result = parser.parse(code);
    errors = enrichErrors(result.meta.errors, LIBRARY_SCHEMA, componentNames);
    unresolved = result.meta.unresolved ?? [];
    orphaned = result.meta.orphaned ?? [];
    semantic = walkSemantic(result);
    enumIssues = walkEnumValidation(result);
  } catch (err) {
    return {
      ok: false,
      findings: [
        {
          code: "parse-exception",
          message: err instanceof Error ? err.message : "Parser threw while reading the program",
        },
      ],
      summary: "parse-exception",
    };
  }

  const rawFindings: LintFinding[] = [
    ...errors.map(
      (e): LintFinding => ({
        code: e.code,
        message: e.message,
        ...(e.statementId ? { statement: e.statementId } : {}),
        ...(e.component ? { component: e.component } : {}),
        ...(e.path ? { path: e.path } : {}),
        ...(e.hint ? { hint: e.hint } : {}),
      }),
    ),
    ...unresolved.map(unresolvedToFinding),
    ...orphaned.map(orphanedToFinding),
    ...semantic,
    ...enumIssues,
  ];

  const findings = rawFindings.map(enrichHallucinationHint);

  const hasUncatalogued = findings.some(
    (f) =>
      f.code === "unknown-component" &&
      !COMPONENT_REPLACEMENTS[f.component ?? ""] &&
      !COMPONENT_REPLACEMENTS[(f.component ?? "").replace(/^@/, "")],
  );

  return {
    ok: findings.length === 0,
    findings,
    summary: summarize(findings),
    ...(hasUncatalogued ? { hint: REPLACEMENT_PRIMER } : {}),
  };
}
