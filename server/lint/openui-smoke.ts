/**
 * Post-create/update smoke: invoke static Query("exec"|"read"|"db_query") calls
 * so agents learn whether the data path works before declaring success.
 */
import { createParser, type ASTNode, type LibraryJSONSchema } from "@openuidev/lang-core";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbQuery } from "../stores/db.js";
import {
  getActiveRoot,
  getWorkspaceBackend,
  resolveProjectPath,
} from "../stores/workspaceStore.js";

const execAsync = promisify(execCb);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "generated", "openui-schema.json"), "utf-8"),
) as { schema: LibraryJSONSchema };

const parser = createParser(schemaJson.schema);

const EXEC_ENV = {
  ...process.env,
  PATH: `${process.env.PATH ?? ""}:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
};

/** Minimal exec for smoke — duplicated from tools.runExec to avoid import cycles. */
async function smokeExec(command: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  if (getWorkspaceBackend() === "drive") {
    return { stdout: "", stderr: "Exec unavailable on Drive backend", exitCode: 1 };
  }
  const cwd = getActiveRoot();
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: EXEC_ENV,
      timeout: 30_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { stdout: String(stdout), stderr: String(stderr), exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: String(e.stdout ?? ""),
      stderr: String(e.stderr ?? (err instanceof Error ? err.message : String(err))),
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}

async function invokeSmokeTool(tool: string, params: Record<string, unknown>): Promise<unknown> {
  switch (tool) {
    case "exec": {
      const result = await smokeExec(String(params.command ?? ""));
      const trimmed = result.stdout.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          /* fall through */
        }
      }
      if (result.exitCode !== 0) {
        throw new Error(result.stderr.trim() || `exit ${result.exitCode}`);
      }
      return result;
    }
    case "read": {
      const abs = resolveProjectPath(String(params.file_path ?? params.path ?? ""));
      const content = await fsPromises.readFile(abs, "utf-8");
      const trimmed = content.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          /* fall through */
        }
      }
      return { content };
    }
    case "db_query":
      return dbQuery(
        String(params.sql ?? ""),
        params.params as Record<string, unknown> | undefined,
        typeof params.namespace === "string" ? params.namespace : "default",
      );
    default:
      throw new Error(`Unknown runtime tool "${tool}"`);
  }
}

export interface RuntimeCheck {
  statementId: string;
  tool: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  preview?: string;
}

function astString(node: ASTNode | null | undefined): string | null {
  if (!node || typeof node !== "object") return null;
  const n = node as { k?: string; v?: unknown; n?: unknown };
  if (n.k === "Str" && typeof n.v === "string") return n.v;
  if (n.k === "Str" && typeof n.n === "string") return n.n;
  return null;
}

function astObject(node: ASTNode | null | undefined): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null;
  const n = node as { k?: string; entries?: Array<{ key?: unknown; value?: unknown }> };
  if (n.k !== "Obj" || !Array.isArray(n.entries)) return null;
  const out: Record<string, unknown> = {};
  for (const entry of n.entries) {
    const key =
      typeof entry.key === "string"
        ? entry.key
        : astString(entry.key as ASTNode | null) ??
          (entry.key && typeof entry.key === "object" && "n" in (entry.key as object)
            ? String((entry.key as { n?: unknown }).n ?? "")
            : "");
    if (!key) return null;
    const valueNode = entry.value as ASTNode | null;
    const str = astString(valueNode);
    if (str !== null) {
      out[key] = str;
      continue;
    }
    // Skip reactive / complex args — cannot smoke without $state.
    if (valueNode && typeof valueNode === "object") {
      const k = (valueNode as { k?: string }).k;
      if (k === "StateRef" || k === "Ref" || k === "BinOp" || k === "Comp") return null;
    }
    return null;
  }
  return out;
}

/**
 * Run smoke checks for Query statements with fully static args.
 * Queries that reference $state are skipped (not failed).
 */
export async function smokeOpenUIQueries(code: string): Promise<RuntimeCheck[]> {
  let parsed;
  try {
    parsed = parser.parse(code);
  } catch (err) {
    return [
      {
        statementId: "parse",
        tool: "parse",
        ok: false,
        error: err instanceof Error ? err.message : "parse failed",
      },
    ];
  }

  const checks: RuntimeCheck[] = [];
  for (const q of parsed.queryStatements) {
    if (!q.complete) continue;
    const tool = astString(q.toolAST);
    if (!tool) {
      checks.push({
        statementId: q.statementId,
        tool: "?",
        ok: true,
        skipped: true,
        reason: "tool name is not a static string",
      });
      continue;
    }
    if (tool !== "exec" && tool !== "read" && tool !== "db_query") {
      checks.push({
        statementId: q.statementId,
        tool,
        ok: false,
        error: `Unknown runtime tool "${tool}" — apps may only call exec, read, db_query, db_execute`,
      });
      continue;
    }
    const args = astObject(q.argsAST);
    if (!args) {
      checks.push({
        statementId: q.statementId,
        tool,
        ok: true,
        skipped: true,
        reason: "args reference $state or non-literal values — skipped smoke",
      });
      continue;
    }
    try {
      const result = await invokeSmokeTool(tool, args);
      const preview =
        typeof result === "string"
          ? result.slice(0, 200)
          : JSON.stringify(result).slice(0, 200);
      checks.push({
        statementId: q.statementId,
        tool,
        ok: true,
        preview,
      });
    } catch (err) {
      checks.push({
        statementId: q.statementId,
        tool,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return checks;
}

export function smokePayload(checks: RuntimeCheck[]): Record<string, unknown> {
  if (checks.length === 0) return {};
  const failed = checks.filter((c) => !c.ok && !c.skipped);
  return {
    runtimeChecks: checks,
    ...(failed.length > 0
      ? {
          runtimeFailed: true,
          note:
            "Some Query smoke checks failed. Fix the script/SQL/path with write_file + exec, then app_update — do not call app_create again.",
        }
      : { runtimeFailed: false }),
  };
}
