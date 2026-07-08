/**
 * The agent's tool surface — the union of the three reference systems:
 *
 *   openclaw-os  → app_create / app_update / get_app (save-first, lint-second,
 *                  patch-small loop with mergeStatements)
 *   agent-canvas → coding + automation capacity (exec, file tools, db,
 *                  http_fetch, automations CRUD)
 *   matrix-os    → agent drives the shell (os_ui: open apps/windows, notify)
 *
 * Every tool returns a JSON-serializable result; the loop stringifies it into
 * the tool message (truncated for the LLM, full result streamed to the UI).
 */
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { mergeStatements } from "@openuidev/lang-core";
import type {
  AgentEvent,
  CursorCommand,
  CursorResult,
  OsUiAction,
  UiSnapshot,
  WorkspaceEntry,
} from "../../shared/types.js";
import { lintOpenUICode, type LintReport } from "../lint/lint-openui.js";
import { generatorCatalogStore } from "../stores/generatorCatalogStore.js";
import { appStore } from "../stores/appStore.js";
import { installedAppStore } from "../platform/installedAppStore.js";
import { automationStore } from "../stores/automationStore.js";
import { invokeIntent } from "../capabilities/registry.js";
import { appendAudit } from "../platform/grantStore.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import { getActiveRoot, resolveProjectPath } from "../stores/projectStore.js";
import { resolveSystemAppId, SYSTEM_APP_CATALOG } from "../../shared/systemApps.js";
import { dbExecute, dbQuery } from "../stores/db.js";
import { skillStore } from "../skills/skillStore.js";
import { bus } from "../bus.js";
import { requestClientAction } from "./clientRequests.js";
import { isRiskyCommand, requestConfirmation } from "./confirmations.js";
import {
  checkWorkspaceQuota,
  invalidateWorkspaceUsage,
  quotaApplies,
  quotaLimitBytes,
  workspaceUsageBytes,
} from "./workspaceQuota.js";
import type { LlmToolDef } from "./llm.js";

const execAsync = promisify(execCb);

export interface ToolContext {
  sessionId: string;
  emit: (event: AgentEvent) => void;
  /**
   * True when a user is watching the stream and can answer confirmations.
   * Headless runs (automations) leave it false: risky commands auto-deny
   * instead of hanging a cron job for the confirmation timeout.
   */
  interactive?: boolean;
}

export interface AgentTool extends LlmToolDef {
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

/** Lint findings ride back on the tool result as correction hints. */
function lintPayload(lint: LintReport): Record<string, unknown> {
  if (lint.ok) return { validation: "ok" };
  return {
    validationErrors: lint.findings,
    validationSummary: lint.summary,
    ...(lint.hint ? { validationHint: lint.hint } : {}),
    note: "The app WAS saved. Fix the issues with a small app_update patch containing ONLY corrected statements.",
  };
}

const EXEC_ENV = {
  ...process.env,
  PATH: `${process.env.PATH ?? ""}:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`,
};

/**
 * Shell out inside the active project root (sandbox workspace when no folder
 * is open). Also backs the app runtime's exec queries. The 2-minute timeout
 * accommodates installs and builds in real repos.
 */
export async function runExec(command: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: getActiveRoot(),
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env: EXEC_ENV,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message ?? "exec failed",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}

// ── Agent cursor helpers ──────────────────────────────────────────────────────
//
// Cursor tools can't run headless: they emit a cursor_request event over the
// live SSE stream, park on the clientRequests promise, and return whatever the
// shell answered. The snapshot is re-compacted here into terse text lines —
// tool results are truncated for the LLM, and a busy desktop's raw JSON
// (rects, nesting) would blow that budget for no targeting benefit.

/** One element as the LLM sees it: `e12 button "Save" @420,310 [disabled]`. */
function formatElement(el: UiSnapshot["shell"][number]): string {
  const flags = [el.disabled ? "disabled" : "", el.value ? `value="${el.value}"` : ""]
    .filter(Boolean)
    .join(", ");
  return `${el.id} ${el.role} "${el.label}" @${el.rect.x},${el.rect.y}${flags ? ` [${flags}]` : ""}`;
}

function formatSnapshot(snap: UiSnapshot): Record<string, unknown> {
  return {
    screen: `${snap.screen.w}x${snap.screen.h}`,
    windows: snap.windows.map((w) => ({
      title: w.title,
      focused: w.focused || undefined,
      elements: w.elements.map(formatElement),
    })),
    shell: snap.shell.map(formatElement),
    ...(snap.opaqueRegions.length > 0 ? { notReachable: snap.opaqueRegions } : {}),
  };
}

/** Round-trip one cursor command through the attached shell. */
async function runCursorCommand(
  command: CursorCommand,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  if (!ctx.interactive) {
    return { error: "Cursor tools need a user watching the desktop — unavailable in headless runs." };
  }
  const { requestId, result } = requestClientAction<CursorResult>();
  ctx.emit({ type: "cursor_request", requestId, command });
  const res = await result;
  if (!res.ok) return { error: res.error ?? "Cursor command failed" };
  return {
    ...(res.outcome ? { outcome: res.outcome } : {}),
    ...(res.snapshot ? { screenAfter: formatSnapshot(res.snapshot) } : {}),
  };
}

/**
 * Invoke a capability intent as the agent, applying the agent-side policy:
 * reads run automatically, writes pause for user confirmation (headless runs
 * deny writes — the same semantics as risky exec commands). Every invocation
 * lands in the audit log with the agent's session identity, so app calls and
 * agent calls share one trail.
 */
async function agentInvokeIntent(
  intentId: string,
  params: Record<string, unknown>,
  description: string,
  ctx: ToolContext,
): Promise<unknown> {
  const caller = { kind: "agent" as const, sessionId: ctx.sessionId };
  const isWrite = intentMeta(intentId)?.access === "write";
  if (isWrite) {
    if (!ctx.interactive) {
      appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: false });
      return { error: "This action requires user approval and no user is attached. Skipped." };
    }
    const { confirmId, verdict } = requestConfirmation();
    ctx.emit({ type: "confirm_required", confirmId, command: description });
    const { approved } = await verdict;
    ctx.emit({ type: "confirm_resolved", confirmId, approved });
    if (!approved) {
      appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: false });
      return { error: "User denied this action. Do not retry it; ask what they'd like instead." };
    }
  }
  appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: true });
  return invokeIntent(intentId, params);
}

import { webSearch } from "../services/searchService.js";

// ── App id resolution for os_ui ──────────────────────────────────────────────

/**
 * Map whatever the model called the app — an exact id, a system id (possibly
 * qualified like "core.settings"), or a display title ("Tasks") — onto a real
 * app id. A miss returns the full catalog so the model self-corrects in one
 * iteration instead of reporting phantom success.
 */
async function resolveAppId(
  raw: string,
): Promise<{ appId: string } | { error: string; availableApps: { id: string; title: string }[] }> {
  const wanted = raw.trim();
  const lower = wanted.toLowerCase();

  const systemAppId = resolveSystemAppId(wanted);
  if (systemAppId) return { appId: systemAppId };

  const generated = await appStore.list();
  const installed = installedAppStore.list().filter((a) => a.enabled);
  if (
    generated.some((a) => a.id === wanted) ||
    installed.some((a) => a.manifest.id === wanted)
  ) {
    return { appId: wanted };
  }

  const byTitle =
    generated.find((a) => a.title.toLowerCase() === lower) ??
    generated.find((a) => a.title.toLowerCase().includes(lower));
  if (byTitle) return { appId: byTitle.id };
  const byName =
    installed.find((a) => a.manifest.name.toLowerCase() === lower) ??
    installed.find((a) => a.manifest.name.toLowerCase().includes(lower));
  if (byName) return { appId: byName.manifest.id };

  return {
    error: `No app matches "${raw}". Pick an id from availableApps. Built-in shell apps (Podcasts, Music, Tasks, …) are listed as system apps — use open_app with their title or id. Only use app_create when the user wants a new custom app.`,
    availableApps: [
      ...SYSTEM_APP_CATALOG.map((entry) => ({ id: entry.id, title: `${entry.title} (system app)` })),
      ...installed.map((a) => ({ id: a.manifest.id, title: a.manifest.name })),
      ...generated.map((a) => ({ id: a.id, title: a.title })),
    ],
  };
}

export const agentTools: AgentTool[] = [
  // ── Generative apps (openclaw-os pipeline) ─────────────────────────────────
  {
    name: "app_create",
    description:
      "Create a live interactive app. Pass the complete openui-lang code. The app is stored, appears in the dock, and opens on the user's desktop. Use when the user asks to build a dashboard, app, tracker, or interactive view.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short display title for the app" },
        code: { type: "string", description: "Complete openui-lang source code for the app" },
        icon: {
          type: "string",
          description:
            "Optional Lucide icon name (kebab-case), e.g. list-todo, cloud-sun, gamepad-2. Omit to auto-pick from the title.",
        },
      },
      required: ["title", "code"],
    },
    execute: async (args, ctx) => {
      const title = String(args.title ?? "Untitled app");
      const code = String(args.code ?? "");
      const lint = lintOpenUICode(code);
      // Save unconditionally — rejecting outright forces full-rewrite retries,
      // which is the failure mode the patch loop exists to avoid.
      const app = await appStore.create({
        title,
        content: code,
        sessionId: ctx.sessionId,
        ...(typeof args.icon === "string" ? { icon: args.icon } : {}),
      });
      ctx.emit({ type: "apps_changed" });
      ctx.emit({ type: "os_ui", action: { action: "open_app", appId: app.id } });
      return { id: app.id, title: app.title, ...lintPayload(lint) };
    },
  },
  {
    name: "get_app",
    description:
      "Fetch the current openui-lang code of an app by id. Call this before app_update to see the current state.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "The app id" } },
      required: ["id"],
    },
    execute: async (args) => {
      const app = await appStore.get(String(args.id));
      if (!app) return { error: "App not found", id: args.id };
      return { id: app.id, title: app.title, content: app.content };
    },
  },
  {
    name: "app_update",
    description:
      "Apply an incremental edit patch to an existing app. Pass ONLY changed/new openui-lang statements — the runtime merges by statement name. Call get_app first to see the current code.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "The app id" },
        patch: { type: "string", description: "openui-lang statements to merge (changed/new only)" },
        title: { type: "string", description: "Optional new title" },
        icon: {
          type: "string",
          description: "Optional Lucide icon name (kebab-case) for the dock and app library",
        },
      },
      required: ["id", "patch"],
    },
    execute: async (args, ctx) => {
      const id = String(args.id);
      const existing = await appStore.get(id);
      if (!existing) return { error: "App not found", id };
      const merged = mergeStatements(existing.content, String(args.patch ?? ""));
      const lint = lintOpenUICode(merged);
      const updated = await appStore.update(id, {
        content: merged,
        ...(typeof args.title === "string" ? { title: args.title } : {}),
        ...(typeof args.icon === "string" ? { icon: args.icon } : {}),
      });
      ctx.emit({ type: "apps_changed" });
      return { id: updated.id, updatedAt: updated.updatedAt, ...lintPayload(lint) };
    },
  },
  {
    name: "list_apps",
    description: "List all generated apps (id, title, updatedAt).",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const apps = await appStore.list();
      return apps.map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt }));
    },
  },

  // ── Coding capacity (agent-canvas spirit) ──────────────────────────────────
  {
    name: "exec",
    description:
      "Run a shell command in the active project root (the open folder, or the sandbox workspace if none). 120s timeout. Use for git, builds, tests, scripts, installs. Destructive commands (push, hard reset, rm -rf) pause for user approval.",
    parameters: {
      type: "object",
      properties: { command: { type: "string", description: "The shell command to run" } },
      required: ["command"],
    },
    execute: async (args, ctx) => {
      const command = String(args.command ?? "");
      // Risky commands pause here until the user clicks Allow/Deny in the
      // chat. Headless contexts skip the wait and deny outright.
      if (isRiskyCommand(command)) {
        if (!ctx.interactive) {
          return { error: "Command requires user approval and no user is attached. Skipped." };
        }
        const { confirmId, verdict } = requestConfirmation();
        ctx.emit({ type: "confirm_required", confirmId, command });
        const { approved } = await verdict;
        ctx.emit({ type: "confirm_resolved", confirmId, approved });
        if (!approved) {
          return { error: "User denied this command. Do not retry it; ask what they'd like instead." };
        }
      }
      const result = await runExec(command);
      // Commands can write arbitrary files — re-measure and surface an
      // over-quota state so the model stops piling on before write_file
      // starts refusing.
      if (quotaApplies()) {
        invalidateWorkspaceUsage();
        const used = await workspaceUsageBytes();
        const limit = quotaLimitBytes();
        if (used > limit) {
          return {
            ...result,
            quotaWarning:
              `Workspace is over its disk quota (${Math.round(used / 1048576)}MB used of ` +
              `${Math.round(limit / 1048576)}MB). Further file writes will be refused — ` +
              `delete files to free space.`,
          };
        }
      }
      return result;
    },
  },
  {
    name: "read_file",
    description: "Read a file from the workspace (relative path).",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Workspace-relative file path" } },
      required: ["path"],
    },
    execute: async (args) => {
      const abs = resolveProjectPath(String(args.path ?? ""));
      const content = await fs.readFile(abs, "utf-8");
      return { path: args.path, content };
    },
  },
  {
    name: "write_file",
    description:
      "Write a file into the workspace (relative path, parent dirs auto-created). Use for data scripts that generated apps call via Query(\"exec\").",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Workspace-relative file path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
    execute: async (args, ctx) => {
      const abs = resolveProjectPath(String(args.path ?? ""));
      const content = String(args.content ?? "");
      // Capture the previous content before overwriting — the file_changed
      // event lets the Studio render a real before/after diff without the
      // LLM ever carrying the old text through its context.
      const before = await fs.readFile(abs, "utf-8").catch(() => null);
      // Overwrites only count the growth against the quota.
      const incoming = Math.max(
        0,
        Buffer.byteLength(content, "utf-8") - (before === null ? 0 : Buffer.byteLength(before, "utf-8")),
      );
      const quota = await checkWorkspaceQuota(incoming);
      if (!quota.ok) return { error: quota.error };
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      invalidateWorkspaceUsage();
      ctx.emit({ type: "file_changed", path: String(args.path ?? ""), before, after: content });
      return { path: args.path, bytes: content.length };
    },
  },
  {
    name: "list_files",
    description: "List files in a workspace directory (default: workspace root).",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Workspace-relative directory path" } },
    },
    execute: async (args) => {
      const abs = resolveProjectPath(String(args.path ?? "."));
      const entries = await fs.readdir(abs, { withFileTypes: true });
      const out: WorkspaceEntry[] = [];
      for (const e of entries) {
        const full = path.join(abs, e.name);
        const stat = await fs.stat(full);
        out.push({
          name: e.name,
          path: path.relative(getActiveRoot(), full),
          type: e.isDirectory() ? "dir" : "file",
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
      return out;
    },
  },
  {
    name: "web_search",
    description:
      "Search the web and get back the top results (title, url, snippet). Use for current events, looking things up, or finding pages to read. Follow up with http_fetch on a result URL to read the full page.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        maxResults: { type: "number", description: "Max results to return (default 6, max 10)" },
      },
      required: ["query"],
    },
    execute: async (args) => {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: "query is required" };
      const max = Math.min(Math.max(Number(args.maxResults) || 6, 1), 10);
      const results = await webSearch(query, max);
      if (results.length === 0) {
        return { results: [], note: "No results — try different keywords." };
      }
      return { results };
    },
  },
  {
    name: "http_fetch",
    description:
      "Fetch a URL (GET or POST). Returns status + body text (truncated). For repeated/scheduled fetching, prefer writing a script and calling it from the app's Query(\"exec\").",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        method: { type: "string", enum: ["GET", "POST"] },
        body: { type: "string", description: "Request body for POST" },
        headers: { type: "object", additionalProperties: { type: "string" } },
      },
      required: ["url"],
    },
    execute: async (args) => {
      const res = await fetch(String(args.url), {
        method: args.method === "POST" ? "POST" : "GET",
        headers: (args.headers as Record<string, string>) ?? undefined,
        body: args.method === "POST" ? String(args.body ?? "") : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 20_000) };
    },
  },

  // ── Persistent app state ───────────────────────────────────────────────────
  {
    name: "db_query",
    description:
      "Read from a namespaced SQLite database. Use PRAGMA table_info(<table>) to inspect schemas. Generated apps read the same databases via Query(\"db_query\", ...).",
    parameters: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SQL to run (SELECT / PRAGMA)" },
        params: {
          type: "object",
          additionalProperties: true,
          description: "Named parameters for $placeholders, e.g. { text: 'Buy milk' }",
        },
        namespace: {
          type: "string",
          description: "Logical database name. One namespace per app. Defaults to 'default'.",
        },
      },
      required: ["sql"],
    },
    execute: async (args) =>
      dbQuery(
        String(args.sql),
        args.params as Record<string, unknown> | undefined,
        typeof args.namespace === "string" ? args.namespace : "default",
      ),
  },
  {
    name: "db_execute",
    description:
      "Write to a namespaced SQLite database (CREATE/INSERT/UPDATE/DELETE). Use to set up schemas and seed data for apps.",
    parameters: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SQL statement to execute" },
        params: { type: "object", additionalProperties: true },
        namespace: { type: "string" },
      },
      required: ["sql"],
    },
    execute: async (args) => {
      const result = dbExecute(
        String(args.sql),
        args.params as Record<string, unknown> | undefined,
        typeof args.namespace === "string" ? args.namespace : "default",
      );
      return { ...result, lastInsertRowid: Number(result.lastInsertRowid) };
    },
  },

  // ── Automations (agent-canvas pattern: primary surface, not buried) ───────
  {
    name: "create_automation",
    description:
      "Schedule a recurring or event-triggered agent run. The prompt is the automation's ONLY context at fire time — name targets explicitly (db namespace + schema, or app id). Cron: '0 9 * * *' = daily 9am. For event triggers set trigger.type to 'event' with source/on fields.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        schedule: { type: "string", description: "5-field cron expression (schedule triggers)" },
        prompt: { type: "string", description: "The self-contained instruction to run" },
        trigger: {
          type: "object",
          description: "Optional trigger override ({ type: 'schedule'|'event', schedule?, source?, on?, filter? })",
        },
        deliver_channel_id: { type: "string", description: "Optional channel id for result delivery" },
        deliver_chat_id: { type: "string", description: "Optional channel chat id for result delivery" },
      },
      required: ["name", "prompt"],
    },
    execute: async (args, ctx) => {
      const deliver =
        typeof args.deliver_channel_id === "string" &&
        typeof args.deliver_chat_id === "string" &&
        args.deliver_channel_id &&
        args.deliver_chat_id
          ? { channelId: String(args.deliver_channel_id), chatId: String(args.deliver_chat_id) }
          : undefined;
      const trigger =
        args.trigger && typeof args.trigger === "object"
          ? (args.trigger as import("../../shared/types.js").AutomationTrigger)
          : undefined;
      const automation = await automationStore.create({
        name: String(args.name),
        prompt: String(args.prompt),
        ...(trigger ? { trigger } : { schedule: String(args.schedule ?? "0 9 * * *") }),
        ...(deliver ? { deliver } : {}),
      });
      bus.emit("automations_changed");
      ctx.emit({ type: "automations_changed" });
      return {
        id: automation.id,
        name: automation.name,
        schedule: automation.schedule,
        trigger: automation.trigger,
        webhookUrl:
          automation.trigger.type === "event"
            ? `/api/webhooks/automations/${automation.id}`
            : undefined,
      };
    },
  },
  {
    name: "list_automations",
    description: "List scheduled automations.",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const { automations } = await automationStore.list({ limit: 10_000, offset: 0 });
      return automations.map((a) => ({
        id: a.id,
        name: a.name,
        schedule: a.schedule,
        trigger: a.trigger,
        enabled: a.enabled,
        lastRun: a.lastRun,
      }));
    },
  },
  {
    name: "update_automation",
    description: "Update an automation's name, schedule, prompt, trigger, or enabled state.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        schedule: { type: "string" },
        prompt: { type: "string" },
        enabled: { type: "boolean" },
        trigger: { type: "object" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      const patch: Record<string, unknown> = {};
      for (const key of ["name", "schedule", "prompt", "enabled", "trigger"] as const) {
        if (args[key] !== undefined) patch[key] = args[key];
      }
      const updated = await automationStore.update(String(args.id), patch);
      bus.emit("automations_changed");
      ctx.emit({ type: "automations_changed" });
      return { id: updated.id, name: updated.name, enabled: updated.enabled };
    },
  },
  {
    name: "delete_automation",
    description: "Delete an automation by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      await automationStore.delete(String(args.id));
      bus.emit("automations_changed");
      ctx.emit({ type: "automations_changed" });
      return { deleted: true };
    },
  },
  {
    name: "run_automation",
    description: "Dispatch an automation immediately (run now).",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args) => {
      const { runAutomationNow } = await import("../automations/runAutomation.js");
      const run = await runAutomationNow(String(args.id));
      return { runId: run.id, status: run.status, sessionId: run.sessionId };
    },
  },

  // ── System calendar (os.calendar@1 — contract-level, provider-agnostic) ──
  //
  // These go through the capability registry, not any particular calendar
  // app, so they keep working if the user swaps calendar implementations.
  {
    name: "calendar_list_events",
    description:
      "List calendar events, optionally within a date range. Returns events from the system calendar (whatever calendar app the user has installed reads the same store).",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO date-time — only events ending at/after this" },
        to: { type: "string", description: "ISO date-time — only events starting at/before this" },
      },
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "calendar.events.list",
        {
          ...(typeof args.from === "string" ? { from: args.from } : {}),
          ...(typeof args.to === "string" ? { to: args.to } : {}),
        },
        "List calendar events",
        ctx,
      ),
  },
  {
    name: "calendar_create_event",
    description:
      "Create a calendar event. Pauses for user approval before writing. Times are ISO 8601; for all-day events pass allDay=true with midnight boundaries.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: { type: "string", description: "ISO 8601 start, e.g. 2026-07-10T12:00:00" },
        end: { type: "string", description: "ISO 8601 end" },
        allDay: { type: "boolean" },
        location: { type: "string" },
        notes: { type: "string" },
      },
      required: ["title", "start", "end"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "calendar.event.create",
        args,
        `Create calendar event "${String(args.title ?? "")}" (${String(args.start ?? "")} → ${String(args.end ?? "")})`,
        ctx,
      ),
  },
  {
    name: "calendar_update_event",
    description:
      "Update fields of an existing calendar event by id (get ids from calendar_list_events). Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        allDay: { type: "boolean" },
        location: { type: "string" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "calendar.event.update",
        args,
        `Update calendar event ${String(args.id ?? "")}${typeof args.title === "string" ? ` → "${args.title}"` : ""}`,
        ctx,
      ),
  },
  {
    name: "calendar_delete_event",
    description: "Delete a calendar event by id. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "calendar.event.delete",
        args,
        `Delete calendar event ${String(args.id ?? "")}`,
        ctx,
      ),
  },

  // ── System tasks (os.tasks@1) ──────────────────────────────────────────────
  {
    name: "tasks_list",
    description:
      "List tasks from the system task store. Returns open tasks by default (not archived). Use status to filter, or archived=true for archived tasks.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        archived: { type: "boolean" },
        dueBefore: { type: "string", description: "ISO date YYYY-MM-DD" },
        dueAfter: { type: "string", description: "ISO date YYYY-MM-DD" },
      },
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.list",
        {
          ...(typeof args.status === "string" ? { status: args.status } : {}),
          ...(typeof args.archived === "boolean" ? { archived: args.archived } : {}),
          ...(typeof args.dueBefore === "string" ? { dueBefore: args.dueBefore } : {}),
          ...(typeof args.dueAfter === "string" ? { dueAfter: args.dueAfter } : {}),
        },
        "List tasks",
        ctx,
      ),
  },
  {
    name: "tasks_create",
    description:
      "Create a task. Pauses for user approval before writing. Assign to the agent with assignee { kind: \"agent\", name: \"Agent\" }.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        dueDateISO: { type: "string", description: "Due date YYYY-MM-DD" },
        assignee: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["self", "agent", "contact", "custom"] },
            name: { type: "string" },
            contactId: { type: "string" },
          },
        },
      },
      required: ["title"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.create",
        args,
        `Create task "${String(args.title ?? "")}"`,
        ctx,
      ),
  },
  {
    name: "tasks_update",
    description: "Update a task by id (get ids from tasks_list). Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        dueDateISO: { type: "string" },
        assignee: { type: "object" },
        archived: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.update",
        args,
        `Update task ${String(args.id ?? "")}${typeof args.title === "string" ? ` → "${args.title}"` : ""}`,
        ctx,
      ),
  },
  {
    name: "tasks_complete",
    description: "Mark a task complete or reopen it. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        completed: { type: "boolean", description: "true to complete, false to reopen" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.complete",
        args,
        `${args.completed === false ? "Reopen" : "Complete"} task ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "tasks_archive",
    description: "Archive or restore a task. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        archived: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.archive",
        args,
        `${args.archived === false ? "Restore" : "Archive"} task ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "tasks_delete",
    description: "Permanently delete a task by id. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "tasks.delete",
        args,
        `Delete task ${String(args.id ?? "")}`,
        ctx,
      ),
  },

  // ── User documents (os.files@1 — contract-level, provider-agnostic) ────────
  //
  // The OS document store behind Drive/Docs — NOT the coding workspace
  // (read_file/write_file work on the active project's disk). Documents here
  // have ids, folders, trash, and show up live in the Drive app.
  {
    name: "docs_list",
    description:
      "List the user's documents/folders in the OS file store (what the Drive app shows). Pass parentId to enter a folder, or query to search by name. This is NOT the coding workspace — use list_files for project source.",
    parameters: {
      type: "object",
      properties: {
        parentId: { type: "string", description: "Folder id to list; omit for the root" },
        query: { type: "string", description: "Search all documents by name instead of listing a folder" },
      },
    },
    execute: async (args, ctx) =>
      typeof args.query === "string" && args.query.trim()
        ? agentInvokeIntent("files.search", { query: args.query }, "Search documents", ctx)
        : agentInvokeIntent(
            "files.list",
            typeof args.parentId === "string" ? { parentId: args.parentId } : {},
            "List documents",
            ctx,
          ),
  },
  {
    name: "docs_read",
    description:
      "Read a document's text content from the OS file store by id (get ids from docs_list).",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("files.content.read", args, "Read document", ctx),
  },
  {
    name: "docs_create",
    description:
      "Create a document or folder in the OS file store (appears in Drive). Pauses for user approval. For documents, pass content and a mimeType (text/plain, text/markdown, …).",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        kind: { type: "string", enum: ["file", "folder"] },
        parentId: { type: "string", description: "Destination folder id; omit for the root" },
        mimeType: { type: "string", description: "Defaults to text/plain" },
        content: { type: "string", description: "Initial text content (files only)" },
      },
      required: ["name", "kind"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "files.create",
        args,
        `Create ${String(args.kind ?? "file")} "${String(args.name ?? "")}" in documents`,
        ctx,
      ),
  },
  {
    name: "docs_write",
    description:
      "Replace a document's text content in the OS file store by id. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        content: { type: "string", description: "Full replacement content" },
      },
      required: ["id", "content"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "files.content.write",
        args,
        `Overwrite document ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "docs_manage",
    description:
      "Manage a document/folder in the OS file store: rename, move, star, trash, restore, or permanently delete. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["rename", "move", "star", "unstar", "trash", "restore", "delete"],
        },
        id: { type: "string" },
        name: { type: "string", description: "New name (rename)" },
        parentId: { type: "string", description: "Destination folder id (move); omit for the root" },
      },
      required: ["action", "id"],
    },
    execute: async (args, ctx) => {
      const id = String(args.id ?? "");
      switch (args.action) {
        case "rename":
          return agentInvokeIntent(
            "files.rename",
            { id, name: args.name },
            `Rename document ${id} → "${String(args.name ?? "")}"`,
            ctx,
          );
        case "move":
          return agentInvokeIntent(
            "files.move",
            { id, parentId: typeof args.parentId === "string" ? args.parentId : null },
            `Move document ${id}`,
            ctx,
          );
        case "star":
        case "unstar":
          return agentInvokeIntent(
            "files.star",
            { id, starred: args.action === "star" },
            `${args.action === "star" ? "Star" : "Unstar"} document ${id}`,
            ctx,
          );
        case "trash":
          return agentInvokeIntent("files.trash", { id }, `Move document ${id} to trash`, ctx);
        case "restore":
          return agentInvokeIntent("files.restore", { id }, `Restore document ${id}`, ctx);
        case "delete":
          return agentInvokeIntent(
            "files.delete",
            { id },
            `Permanently delete document ${id}`,
            ctx,
          );
        default:
          return { error: `Unknown action: ${String(args.action)}` };
      }
    },
  },

  {
    name: "share_create",
    description:
      "Create a public share link for a Drive file or folder. Pauses for user approval. Returns an opaque URL — never expose internal file ids in external messages.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Drive file or folder id" },
        mode: { type: "string", enum: ["download", "view"], default: "download" },
        allowDownload: { type: "boolean" },
        password: { type: "string", description: "Optional link password" },
        expiresAt: { type: "string", description: "ISO date or YYYY-MM-DD" },
        label: { type: "string" },
      },
      required: ["fileId"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "shares.create",
        {
          fileId: String(args.fileId ?? ""),
          ...(typeof args.mode === "string" ? { mode: args.mode } : {}),
          ...(typeof args.allowDownload === "boolean" ? { allowDownload: args.allowDownload } : {}),
          ...(typeof args.password === "string" ? { password: args.password } : {}),
          ...(typeof args.expiresAt === "string" ? { expiresAt: args.expiresAt } : {}),
          ...(typeof args.label === "string" ? { label: args.label } : {}),
          actorId: `agent:${ctx.sessionId}`,
        },
        `Create share link for file ${String(args.fileId ?? "")}`,
        ctx,
      ),
  },
  {
    name: "share_list",
    description: "List active share links for a Drive file (or all links created in this session context).",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "Optional filter by file id" },
      },
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "shares.list",
        {
          ...(typeof args.fileId === "string" ? { fileId: args.fileId } : {}),
          actorId: `agent:${ctx.sessionId}`,
        },
        "List share links",
        ctx,
      ),
  },
  {
    name: "share_revoke",
    description: "Revoke a public share link by its internal share id. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Internal share id from share_list" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "shares.revoke",
        { id: String(args.id ?? "") },
        `Revoke share ${String(args.id ?? "")}`,
        ctx,
      ),
  },

  // ── Skills (demand-paged knowledge) ─────────────────────────────────────────
  {
    name: "read_skill",
    description:
      "Read a skill's full instructions by id (ids are in the Skills index of your system prompt). Required before using any tool the skill gates. Read a skill once per session; its guidance then applies for the rest of the conversation.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", description: "Skill id, e.g. meeting-notes" } },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      const skill = skillStore.get(String(args.id ?? ""));
      if (!skill || !skill.enabled) {
        return { error: `Unknown or disabled skill: ${String(args.id)}. Check the Skills index.` };
      }
      // Reading disarms this skill's tool gates for the session (persisted,
      // so a server restart doesn't force a re-read mid-conversation).
      skillStore.markRead(ctx.sessionId, skill.id);
      return { id: skill.id, name: skill.name, instructions: skill.body };
    },
  },
  {
    name: "save_skill",
    description:
      "Save a reusable skill — distill a lesson, preference, or procedure from this conversation into standing instructions for future sessions. Pauses for user approval. Write the description so a future agent knows WHEN to read the skill.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short display name, e.g. 'Weekly report format'" },
        description: {
          type: "string",
          description: "One or two sentences: when should a future session read this skill?",
        },
        body: { type: "string", description: "The full instructions, markdown" },
      },
      required: ["name", "description", "body"],
    },
    execute: async (args, ctx) => {
      const name = String(args.name ?? "").trim();
      const description = String(args.description ?? "").trim();
      const body = String(args.body ?? "").trim();
      if (!name || !description || !body) {
        return { error: "name, description, and body are all required" };
      }
      // Additions to the user's standing instructions need their sign-off —
      // same internal gate as calendar writes and risky exec commands.
      if (!ctx.interactive) {
        return { error: "Saving a skill requires user approval and no user is attached. Skipped." };
      }
      const { confirmId, verdict } = requestConfirmation();
      ctx.emit({ type: "confirm_required", confirmId, command: `Save skill "${name}" — ${description}` });
      const { approved } = await verdict;
      ctx.emit({ type: "confirm_resolved", confirmId, approved });
      if (!approved) {
        return { error: "User declined to save this skill. Do not retry; ask what they'd like instead." };
      }
      const skill = skillStore.create({ name, description, body, source: "user" });
      return { id: skill.id, name: skill.name, saved: true };
    },
  },

  // ── Shell navigation (agent-canvas canvas_ui pattern) ──────────────────────
  {
    name: "os_ui",
    description:
      "Drive the Arco desktop: open an app window (action=open_app + appId — an app id or the app's display title, e.g. \"Tasks\" or \"Docs\"), open a system app (action=open_system + app — a system id like settings or a display name like Docs; non-system names resolve to open_app), close an app's window (action=close_app + appId — id or title), show a notification (action=notify + message), or focus a Studio drawer tab (action=open_workspace_tab + tab one of: files, diffs, terminal, preview, browser; optional path — a file to select, or a URL when tab=browser, e.g. after starting a dev server). If the app isn't found the result lists every available app.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["open_app", "open_system", "close_app", "notify", "open_workspace_tab"],
        },
        appId: {
          type: "string",
          description:
            "App id (for open_app / close_app): a generated app id, an installed app id like core.calendar, or a system app id like settings",
        },
        app: { type: "string", description: "System app id (for open_system)" },
        message: { type: "string", description: "Notification text (for notify)" },
        tab: {
          type: "string",
          enum: ["files", "diffs", "terminal", "preview", "browser"],
          description: "Studio drawer tab (for open_workspace_tab)",
        },
        path: {
          type: "string",
          description:
            "Workspace file to select in the tab, or URL when tab=browser (for open_workspace_tab)",
        },
      },
      required: ["action"],
    },
    execute: async (args, ctx) => {
      let action: OsUiAction;
      if (
        (args.action === "open_app" || args.action === "close_app") &&
        typeof args.appId === "string"
      ) {
        // Resolve before emitting: a made-up id would no-op silently in the
        // shell while the model reports success. Exact id first, then a
        // case-insensitive title match ("Tasks" → the Tasks app's id).
        const resolved = await resolveAppId(args.appId);
        if ("error" in resolved) return resolved;
        action = { action: args.action, appId: resolved.appId };
      } else if (args.action === "open_system" && typeof args.app === "string") {
        const systemAppId = resolveSystemAppId(args.app);
        if (systemAppId) {
          action = { action: "open_system", app: systemAppId };
        } else {
          // Installed/generated apps (e.g. "Docs" → core.docs) are not system
          // apps — resolve and open through the unified open_app path.
          const resolved = await resolveAppId(args.app);
          if ("error" in resolved) return resolved;
          action = { action: "open_app", appId: resolved.appId };
        }
      } else if (args.action === "notify" && typeof args.message === "string") {
        action = { action: "notify", message: args.message };
      } else if (
        args.action === "open_workspace_tab" &&
        (args.tab === "files" ||
          args.tab === "diffs" ||
          args.tab === "terminal" ||
          args.tab === "preview" ||
          args.tab === "browser")
      ) {
        action = {
          action: "open_workspace_tab",
          tab: args.tab,
          ...(typeof args.path === "string" ? { path: args.path } : {}),
        };
      } else {
        return { error: "Invalid os_ui action or missing argument" };
      }
      ctx.emit({ type: "os_ui", action });
      return { ok: true };
    },
  },

  // ── Agent cursor (virtual mouse over the live desktop) ─────────────────────
  {
    name: "ui_snapshot",
    description:
      "See the user's desktop: returns every visible window and its interactive elements (buttons, inputs, links) with stable element ids. Call this before mouse_click/type_text, and again whenever the UI may have changed. Element ids stay valid until the element unmounts.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => runCursorCommand({ kind: "snapshot" }, ctx),
  },
  {
    name: "mouse_click",
    description:
      "Move the visible AI cursor to an element and click it, like a human demonstrating the UI. Target by element id from ui_snapshot (preferred — survives window moves) or raw x/y screen coordinates. Returns what was clicked plus a fresh snapshot of the screen after the click.",
    parameters: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "Element id from ui_snapshot, e.g. 'e12'" },
        x: { type: "number", description: "Screen x (only when no targetId fits)" },
        y: { type: "number", description: "Screen y (only when no targetId fits)" },
      },
    },
    execute: async (args, ctx) =>
      runCursorCommand(
        {
          kind: "click",
          ...(typeof args.targetId === "string" ? { targetId: args.targetId } : {}),
          ...(typeof args.x === "number" ? { x: args.x } : {}),
          ...(typeof args.y === "number" ? { y: args.y } : {}),
        },
        ctx,
      ),
  },
  {
    name: "type_text",
    description:
      "Click into a text input/textarea (by element id from ui_snapshot) and type text character-by-character with the visible AI cursor. Set submit=true to press Enter afterwards. Replaces the field's existing content.",
    parameters: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "Element id of the input, e.g. 'e7'" },
        text: { type: "string", description: "The text to type" },
        submit: { type: "boolean", description: "Press Enter after typing" },
      },
      required: ["targetId", "text"],
    },
    execute: async (args, ctx) =>
      runCursorCommand(
        {
          kind: "type",
          targetId: String(args.targetId ?? ""),
          text: String(args.text ?? ""),
          ...(args.submit === true ? { submit: true } : {}),
        },
        ctx,
      ),
  },
  {
    name: "generator_catalog_add",
    description:
      "Save an inline openui-lang component to the Generator app's catalog so the user can browse and reuse it later. Use after designing a static UI block in chat or when the user asks to add a component to the catalog.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Human-readable catalog label" },
        code: { type: "string", description: "Complete openui-lang program with a root assignment" },
        prompt: { type: "string", description: "Optional originating user prompt" },
      },
      required: ["label", "code"],
    },
    execute: async (args) => {
      const code = String(args.code ?? "").trim();
      const label = String(args.label ?? "").trim() || "Generated UI";
      if (!code) return { error: "code is required" };
      const lint = lintOpenUICode(code);
      const entry = await generatorCatalogStore.add({
        label,
        code,
        prompt: typeof args.prompt === "string" ? args.prompt : undefined,
        tier: "saved",
      });
      return {
        id: entry.id,
        label: entry.label,
        validation: lint.ok ? "ok" : "warn",
        ...(lint.ok ? {} : { lintSummary: lint.summary }),
      };
    },
  },
];

export const toolDefs: LlmToolDef[] = agentTools.map(({ name, description, parameters }) => ({
  name,
  description,
  parameters,
}));

export function findTool(name: string): AgentTool | undefined {
  return agentTools.find((t) => t.name === name);
}

// ── App runtime tool bridge ───────────────────────────────────────────────────
// Backs the client's Query/Mutation toolProvider (POST /api/tools/invoke).
// Mirrors openclaw-os `openclawos.tools.invoke`: direct execution, no LLM.

export async function invokeRuntimeTool(
  tool: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (tool) {
    case "exec": {
      const result = await runExec(String(params.command ?? ""));
      const trimmed = result.stdout.trim();
      // Auto-parse JSON stdout so app bindings access fields directly.
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // fall through to raw shape
        }
      }
      return result;
    }
    case "read": {
      const abs = resolveProjectPath(String(params.file_path ?? params.path ?? ""));
      const content = await fs.readFile(abs, "utf-8");
      const trimmed = content.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // fall through
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
    case "db_execute": {
      const result = dbExecute(
        String(params.sql ?? ""),
        params.params as Record<string, unknown> | undefined,
        typeof params.namespace === "string" ? params.namespace : "default",
      );
      return { ...result, lastInsertRowid: Number(result.lastInsertRowid) };
    }
    default:
      throw new Error(
        `Unknown runtime tool "${tool}" — apps may only call exec, read, db_query, db_execute`,
      );
  }
}
