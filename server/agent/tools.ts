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
import { appStore } from "../stores/appStore.js";
import { automationStore } from "../stores/automationStore.js";
import { invokeIntent } from "../capabilities/registry.js";
import { appendAudit } from "../platform/grantStore.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import { getActiveRoot, resolveProjectPath } from "../stores/projectStore.js";
import { dbExecute, dbQuery } from "../stores/db.js";
import { skillStore } from "../skills/skillStore.js";
import { bus } from "../bus.js";
import { requestClientAction } from "./clientRequests.js";
import { isRiskyCommand, requestConfirmation } from "./confirmations.js";
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
      },
      required: ["title", "code"],
    },
    execute: async (args, ctx) => {
      const title = String(args.title ?? "Untitled app");
      const code = String(args.code ?? "");
      const lint = lintOpenUICode(code);
      // Save unconditionally — rejecting outright forces full-rewrite retries,
      // which is the failure mode the patch loop exists to avoid.
      const app = await appStore.create({ title, content: code, sessionId: ctx.sessionId });
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
      return runExec(command);
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
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
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
      "Schedule a recurring agent run. The prompt is the automation's ONLY context at fire time — name targets explicitly (db namespace + schema, or app id). Cron syntax: '0 9 * * *' = daily 9am.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        schedule: { type: "string", description: "5-field cron expression" },
        prompt: { type: "string", description: "The self-contained instruction to run on schedule" },
      },
      required: ["name", "schedule", "prompt"],
    },
    execute: async (args, ctx) => {
      const automation = await automationStore.create({
        name: String(args.name),
        schedule: String(args.schedule),
        prompt: String(args.prompt),
      });
      bus.emit("automations_changed");
      ctx.emit({ type: "automations_changed" });
      return { id: automation.id, name: automation.name, schedule: automation.schedule };
    },
  },
  {
    name: "list_automations",
    description: "List scheduled automations.",
    parameters: { type: "object", properties: {} },
    execute: async () => {
      const all = await automationStore.list();
      return all.map((a) => ({
        id: a.id,
        name: a.name,
        schedule: a.schedule,
        enabled: a.enabled,
        lastRun: a.lastRun,
      }));
    },
  },
  {
    name: "update_automation",
    description: "Update an automation's name, schedule, prompt, or enabled state.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        schedule: { type: "string" },
        prompt: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      const patch: Record<string, unknown> = {};
      for (const key of ["name", "schedule", "prompt", "enabled"] as const) {
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
      "Drive the Arco desktop: open an app window (action=open_app + appId — a generated app id or an installed app id like core.calendar), open a system app (action=open_system + app one of: chat, apps, automations, files, terminal, settings, studio), show a notification (action=notify + message), or focus a Studio drawer tab (action=open_workspace_tab + tab one of: files, diffs, terminal, preview, browser; optional path — a file to select, or a URL when tab=browser, e.g. after starting a dev server).",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["open_app", "open_system", "notify", "open_workspace_tab"],
        },
        appId: {
          type: "string",
          description: "App id (for open_app): a generated app id or an installed app id like core.calendar",
        },
        app: { type: "string", description: "System app id (for open_system)" },
        message: { type: "string", description: "Notification text (for notify)" },
        tab: {
          type: "string",
          enum: ["files", "diffs", "terminal", "preview"],
          description: "Studio drawer tab (for open_workspace_tab)",
        },
        path: {
          type: "string",
          description: "Workspace file to select in the tab (for open_workspace_tab)",
        },
      },
      required: ["action"],
    },
    execute: async (args, ctx) => {
      let action: OsUiAction;
      if (args.action === "open_app" && typeof args.appId === "string") {
        action = { action: "open_app", appId: args.appId };
      } else if (args.action === "open_system" && typeof args.app === "string") {
        action = { action: "open_system", app: args.app };
      } else if (args.action === "notify" && typeof args.message === "string") {
        action = { action: "notify", message: args.message };
      } else if (
        args.action === "open_workspace_tab" &&
        (args.tab === "files" || args.tab === "diffs" || args.tab === "terminal" || args.tab === "preview")
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
