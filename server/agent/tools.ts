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
  ApprovalMode,
  BrowserCommand,
  BrowserResult,
  ComputerCommand,
  ComputerResult,
  CursorCommand,
  CursorResult,
  OsUiAction,
  OsUiResult,
  UiSnapshot,
  WorkspaceEntry,
} from "../../shared/types.js";
import {
  buildShellAppCatalog,
  controlForResolvedApp,
  type ShellAppCatalogEntry,
} from "../../shared/agentAppCatalog.js";
import { lintOpenUICode, type LintReport } from "../lint/lint-openui.js";
import { generatorCatalogStore } from "../stores/generatorCatalogStore.js";
import { appStore } from "../stores/appStore.js";
import { installedAppStore } from "../platform/installedAppStore.js";
import { webAppStore } from "../stores/webAppStore.js";
import { automationStore } from "../stores/automationStore.js";
import { invokeIntent } from "../capabilities/registry.js";
import { appendAudit } from "../platform/grantStore.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import {
  getActiveRoot,
  getWorkspaceBackend,
  listWorkspaceRoots,
  resolveProjectPath,
  toWorkspaceRelative,
} from "../stores/workspaceStore.js";
import { checkpointStore } from "../stores/checkpointStore.js";
import { resolveSystemAppId } from "../../shared/systemApps.js";
import { dbExecute, dbQuery } from "../stores/db.js";
import { skillStore } from "../skills/skillStore.js";
import { bus } from "../bus.js";
import { requestClientAction } from "./clientRequests.js";
import { isRiskyCommand, requestConfirmation } from "./confirmations.js";
import { opsAgentTools } from "./opsTools.js";
import {
  MemoryAccessError,
  memoryStore,
} from "../memory/memoryStore.js";
import { MEMORY_KINDS } from "../memory/memoryGrantStore.js";
import type { MemoryKind } from "../../shared/capabilities/memory.js";
import { sessionSearchIndex } from "../stores/sessionSearchIndex.js";
import { sessionStore } from "../stores/sessionStore.js";
import { enqueueSessionResult } from "./sessionQueue.js";
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
  /** Authenticated Kosmos user (mail, github, …). Optional for headless. */
  userId?: string;
  /**
   * Composer approval posture for this turn. Defaults to "smart". Strict
   * write confirms are enforced in applyPolicy; internal gates (risky exec,
   * intent writes, skill save) only prompt when this is "smart" so we don't
   * double-confirm.
   */
  approvalMode?: ApprovalMode;
  /** Cancels long-running tools and pending confirmations with the turn. */
  signal?: AbortSignal;
  /** Agent profile id for this turn (agent:builtin, agent:user:…). */
  profileId?: string;
  /** Memory / ACL principal — usually equals profileId. */
  principalId?: string;
  /** Profile policy posture — overlays stored tool rules when set. */
  policyLevel?: import("../../shared/agents.js").AgentPolicyLevel;
}

/**
 * Internal tool gates (risky exec, capability writes, skill save) only run
 * their own confirm cards in smart mode. Strict already paused in applyPolicy
 * for write tools; full skips confirms entirely.
 */
function shouldConfirmInternally(ctx: ToolContext): boolean {
  return (ctx.approvalMode ?? "smart") === "smart";
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
export async function runExec(command: string, signal?: AbortSignal): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  if (getWorkspaceBackend() === "drive") {
    return {
      stdout: "",
      stderr: "Exec is unavailable while the Studio workspace backend is Drive.",
      exitCode: 1,
    };
  }
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: getActiveRoot(),
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env: EXEC_ENV,
      signal,
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

/** Cap interactive elements per window so tool results stay under the 6k budget. */
const MAX_ELEMENTS_PER_WINDOW = 40;

/** One element as the LLM sees it: `e12 button "Save" @420,310 [disabled]`. */
function formatElement(el: UiSnapshot["shell"][number]): string {
  const flags = [el.disabled ? "disabled" : "", el.value ? `value="${el.value}"` : ""]
    .filter(Boolean)
    .join(", ");
  return `${el.id} ${el.role} "${el.label}" @${el.rect.x},${el.rect.y}${flags ? ` [${flags}]` : ""}`;
}

function formatSnapshot(snap: UiSnapshot): Record<string, unknown> {
  return {
    hostMode: snap.hostMode,
    screen: `${snap.screen.w}x${snap.screen.h}`,
    windows: snap.windows.map((w) => {
      const truncated = w.elements.length > MAX_ELEMENTS_PER_WINDOW;
      const elements = w.elements.slice(0, MAX_ELEMENTS_PER_WINDOW).map(formatElement);
      return {
        title: w.title,
        windowId: w.windowId,
        focused: w.focused || undefined,
        minimized: w.minimized || undefined,
        control: w.control,
        reason: w.reason,
        elements,
        ...(truncated
          ? {
              truncated: true,
              note: `Showing ${MAX_ELEMENTS_PER_WINDOW}/${w.elements.length} elements. Call ui_snapshot again with windowTitle="${w.title}" to focus this window.`,
            }
          : {}),
      };
    }),
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
  if (!res.ok) {
    return {
      error: res.error ?? "Cursor command failed",
      ...(res.focusAppId ? { focusAppId: res.focusAppId } : {}),
      ...(res.focusTitle ? { focusTitle: res.focusTitle } : {}),
    };
  }
  const screenKey = command.kind === "snapshot" ? "screen" : "screenAfter";
  return {
    ...(res.outcome ? { outcome: res.outcome } : {}),
    ...(res.snapshot ? { [screenKey]: formatSnapshot(res.snapshot) } : {}),
  };
}

async function runBrowserCommand(
  command: BrowserCommand,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  if (!ctx.interactive) {
    return { error: "Browser tools need an open Studio Browser tab." };
  }
  const { requestId, result } = requestClientAction<BrowserResult>();
  ctx.emit({ type: "browser_request", requestId, command });
  const res = await result;
  if (!res.ok) return { error: res.error ?? "Browser command failed" };
  return {
    ...(res.outcome ? { outcome: res.outcome } : {}),
    ...(res.snapshot ? { snapshot: res.snapshot } : {}),
  };
}

async function runComputerCommand(
  command: ComputerCommand,
  ctx: ToolContext,
): Promise<Record<string, unknown>> {
  if (!ctx.interactive) {
    return { error: "Computer use needs the desktop app with Accessibility permission." };
  }
  const { requestId, result } = requestClientAction<ComputerResult>();
  ctx.emit({ type: "computer_request", requestId, command });
  const res = await result;
  if (!res.ok) return { error: res.error ?? "Computer command failed" };
  return {
    ...(res.outcome ? { outcome: res.outcome } : {}),
    ...(res.imageDataUrl ? { imageDataUrl: res.imageDataUrl } : {}),
  };
}

/** Round-trip one os_ui action; waits for the shell to settle the window. */
async function runOsUiAction(
  action: OsUiAction,
  ctx: ToolContext,
  meta?: { control?: string; toolHint?: string; note?: string },
): Promise<Record<string, unknown>> {
  if (!ctx.interactive) {
    // Headless automations can still emit for attached desktops later; no round-trip.
    ctx.emit({ type: "os_ui", action });
    return { ok: true, ...(meta ?? {}), note: meta?.note ?? "Emitted without wait (headless)." };
  }
  const { requestId, result } = requestClientAction<OsUiResult>();
  ctx.emit({ type: "os_ui", action, requestId });
  const res = await result;
  if (!res.ok) return { error: res.error ?? "os_ui failed", ...(meta ?? {}) };
  return {
    ok: true,
    windowId: res.windowId,
    title: res.title,
    focused: res.focused,
    minimized: res.minimized,
    control: res.control ?? meta?.control,
    toolHint: res.toolHint ?? meta?.toolHint,
    note: res.note ?? meta?.note,
    windows: res.windows,
  };
}

async function loadShellCatalog(): Promise<ShellAppCatalogEntry[]> {
  const generated = await appStore.list();
  const installed = installedAppStore.list();
  const web = webAppStore.list();
  return buildShellAppCatalog({
    generated: generated.map((a) => ({ id: a.id, title: a.title, updatedAt: a.updatedAt })),
    installed,
    web: web.map((a) => ({ id: a.id, name: a.name })),
  });
}

type ResolveOk = { appId: string; kind: ShellAppCatalogEntry["kind"]; control: string; toolHint?: string; title: string };
type ResolveErr = {
  error: string;
  availableApps: ShellAppCatalogEntry[];
  matches?: ShellAppCatalogEntry[];
};

/**
 * Map whatever the model called the app onto a real id. Exact id wins; when a
 * display title matches both a system app and an installed app, return both
 * so the model can pick an explicit id instead of getting a silent shadow.
 */
async function resolveAppId(raw: string): Promise<ResolveOk | ResolveErr> {
  const wanted = raw.trim();
  const lower = wanted.toLowerCase();
  const catalog = await loadShellCatalog();

  const exact = catalog.find((e) => e.id === wanted || e.id.toLowerCase() === lower);
  if (exact) {
    return {
      appId: exact.id,
      kind: exact.kind,
      control: exact.control,
      toolHint: exact.toolHint,
      title: exact.title,
    };
  }

  const titleExact = catalog.filter((e) => e.title.toLowerCase() === lower);
  if (titleExact.length > 1) {
    return {
      error: `Multiple apps named "${raw}". Pick an id from matches (system titles can shadow installed apps like core.calendar).`,
      matches: titleExact,
      availableApps: catalog,
    };
  }
  if (titleExact.length === 1) {
    const hit = titleExact[0]!;
    return {
      appId: hit.id,
      kind: hit.kind,
      control: hit.control,
      toolHint: hit.toolHint,
      title: hit.title,
    };
  }

  const systemAppId = resolveSystemAppId(wanted);
  if (systemAppId) {
    const meta = controlForResolvedApp(systemAppId, catalog);
    return {
      appId: systemAppId,
      kind: "system",
      control: meta.control,
      toolHint: meta.toolHint,
      title: meta.title,
    };
  }

  const titlePartial = catalog.filter(
    (e) => e.title.toLowerCase().includes(lower) || lower.includes(e.title.toLowerCase()),
  );
  if (titlePartial.length === 1) {
    const hit = titlePartial[0]!;
    return {
      appId: hit.id,
      kind: hit.kind,
      control: hit.control,
      toolHint: hit.toolHint,
      title: hit.title,
    };
  }
  if (titlePartial.length > 1) {
    return {
      error: `Ambiguous app name "${raw}". Pick an id from matches.`,
      matches: titlePartial,
      availableApps: catalog,
    };
  }

  return {
    error: `No app matches "${raw}". Pick an id from availableApps. Use list_apps for the full catalog (system, installed, generated, web). Only use app_create when the user wants a new custom app.`,
    availableApps: catalog,
  };
}

function noteForControl(control: string, toolHint?: string): string | undefined {
  if (control === "tools") {
    return `This app is best operated with domain tools${toolHint ? ` (${toolHint})` : ""}, not mouse_click. Opening the window alone is not enough.`;
  }
  if (control === "open_only") {
    return "This app has no UI bridge and no domain tools yet. You can open/focus the window only — do not retry mouse_click. Prefer apps with control=cursor (including bridged iframes) or control=tools.";
  }
  if (control === "cursor" && toolHint?.includes("bridge")) {
    return "Cursor-driveable via AppHost UI bridge (path #2). Snapshot element ids look like g:installed:…:eN.";
  }
  return undefined;
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
    // Lifecycle column moves are expected mid-turn — don't interrupt for confirm.
    const skipConfirm = intentId === "board.move";
    // Headless never auto-writes via intents, even in full approval mode.
    if (!ctx.interactive && !skipConfirm) {
      appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: false });
      return { error: "This action requires user approval and no user is attached. Skipped." };
    }
    // Smart mode shows the confirm card; strict already paused in applyPolicy.
    if (!skipConfirm && shouldConfirmInternally(ctx)) {
      const { confirmId, verdict } = requestConfirmation(ctx.signal);
      ctx.emit({ type: "confirm_required", confirmId, command: description });
      const { approved } = await verdict;
      ctx.emit({ type: "confirm_resolved", confirmId, approved });
      if (!approved) {
        appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: false });
        return { error: "User denied this action. Do not retry it; ask what they'd like instead." };
      }
    }
  }
  appendAudit({ caller, method: `intent.invoke:${intentId}`, detail: description, allowed: true });
  return invokeIntent(intentId, params);
}

import { webSearch } from "../services/searchService.js";

export const agentTools: AgentTool[] = [
  // ── Generative apps (openclaw-os pipeline) ─────────────────────────────────
  {
    name: "app_create",
    description:
      "Create a live interactive app (or replace an existing generated app with the same title). Pass the complete openui-lang code. The app is stored, appears in the dock, and opens on the user's desktop. Prefer list_apps first — if a similar generated app already exists, open it or app_update it instead of minting a new title. Same-title creates upsert (reused:true) unless forceNew is set.",
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
        forceNew: {
          type: "boolean",
          description:
            "When true, always mint a new app id even if a same-title app exists. Default false (upsert by title).",
        },
      },
      required: ["title", "code"],
    },
    execute: async (args, ctx) => {
      const title = String(args.title ?? "Untitled app");
      const code = String(args.code ?? "");
      const lint = lintOpenUICode(code);
      // Save unconditionally — rejecting outright forces full-rewrite retries,
      // which is the failure mode the patch loop exists to avoid. Same-title
      // creates upsert so those retries update one app instead of flooding
      // the launcher with duplicates.
      const app = await appStore.create(
        {
          title,
          content: code,
          sessionId: ctx.sessionId,
          ...(typeof args.icon === "string" ? { icon: args.icon } : {}),
        },
        { forceNew: args.forceNew === true },
      );
      ctx.emit({ type: "apps_changed" });
      ctx.emit({ type: "os_ui", action: { action: "open_app", appId: app.id } });
      return {
        id: app.id,
        title: app.title,
        reused: app.reused,
        ...lintPayload(lint),
      };
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
    description:
      "List every launchable shell app: system, installed, generated, and web. Each entry includes kind and control mode (cursor = mouse-driveable, tools = use domain tools like calendar_*/mail_*, open_only = window only — cursor cannot drive content).",
    parameters: { type: "object", properties: {} },
    execute: async () => loadShellCatalog(),
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
      // Risky commands pause here in smart mode until the user clicks
      // Allow/Deny. Strict already confirmed via applyPolicy; full skips.
      // Headless contexts skip the wait and deny outright.
      if (shouldConfirmInternally(ctx) && isRiskyCommand(command)) {
        if (!ctx.interactive) {
          return { error: "Command requires user approval and no user is attached. Skipped." };
        }
        const { confirmId, verdict } = requestConfirmation(ctx.signal);
        ctx.emit({ type: "confirm_required", confirmId, command });
        const { approved } = await verdict;
        ctx.emit({ type: "confirm_resolved", confirmId, approved });
        if (!approved) {
          return { error: "User denied this command. Do not retry it; ask what they'd like instead." };
        }
      }
      const result = await runExec(command, ctx.signal);
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
      if (getWorkspaceBackend() === "drive") {
        const { readDriveWorkspace } = await import("../stores/driveWorkspace.js");
        return readDriveWorkspace(String(args.path ?? ""));
      }
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
      if (getWorkspaceBackend() === "drive") {
        const { writeDriveWorkspace, readDriveWorkspace } = await import("../stores/driveWorkspace.js");
        const pathStr = String(args.path ?? "");
        const content = String(args.content ?? "");
        let before: string | null = null;
        try {
          before = readDriveWorkspace(pathStr).content;
        } catch {
          before = null;
        }
        const result = writeDriveWorkspace(pathStr, content);
        ctx.emit({ type: "file_changed", path: pathStr, before, after: content });
        void checkpointStore.recordEdit(ctx.sessionId, { path: pathStr, before, after: content });
        return result;
      }
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
      const relPath = String(args.path ?? "");
      ctx.emit({ type: "file_changed", path: relPath, before, after: content });
      void checkpointStore.recordEdit(ctx.sessionId, { path: relPath, before, after: content });
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
      if (getWorkspaceBackend() === "drive") {
        const { listDriveWorkspace } = await import("../stores/driveWorkspace.js");
        return listDriveWorkspace(String(args.path ?? "."));
      }
      const rel = String(args.path ?? ".");
      const roots = listWorkspaceRoots();
      if ((rel === "." || rel === "") && roots.length > 1) {
        const now = new Date().toISOString();
        return roots.map((r) => ({
          name: r.name,
          path: r.name,
          type: "dir" as const,
          size: 0,
          modifiedAt: now,
        }));
      }
      const abs = resolveProjectPath(rel);
      const entries = await fs.readdir(abs, { withFileTypes: true });
      const out: WorkspaceEntry[] = [];
      for (const e of entries) {
        const full = path.join(abs, e.name);
        const stat = await fs.stat(full);
        out.push({
          name: e.name,
          path: toWorkspaceRelative(full),
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

  // ── Downloads / BitTorrent (os.downloads@1) ─────────────────────────────────
  {
    name: "torrents_list",
    description:
      "List torrents in the Downloads app (BitTorrent client). Returns name, progress, status, speeds, and save path.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => agentInvokeIntent("torrents.list", {}, "List torrents", ctx),
  },
  {
    name: "torrents_add",
    description:
      "Add a torrent by magnet URI or http(s) .torrent URL. Downloads to data/torrents; small completed files may import into Drive. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "magnet:?xt=urn:btih:… or https://…/file.torrent",
        },
        paused: { type: "boolean", description: "Add in paused state" },
      },
      required: ["source"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "torrents.add",
        {
          source: String(args.source ?? ""),
          ...(typeof args.paused === "boolean" ? { paused: args.paused } : {}),
        },
        `Add torrent ${String(args.source ?? "").slice(0, 80)}`,
        ctx,
      ),
  },
  {
    name: "torrents_pause",
    description: "Pause a torrent by id (info hash from torrents_list).",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("torrents.pause", args, `Pause torrent ${String(args.id ?? "")}`, ctx),
  },
  {
    name: "torrents_resume",
    description: "Resume a paused or stopped torrent by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("torrents.resume", args, `Resume torrent ${String(args.id ?? "")}`, ctx),
  },
  {
    name: "torrents_remove",
    description:
      "Remove a torrent by id. Set deleteFiles=true to also delete downloaded data. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        deleteFiles: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "torrents.remove",
        {
          id: String(args.id ?? ""),
          ...(typeof args.deleteFiles === "boolean" ? { deleteFiles: args.deleteFiles } : {}),
        },
        `Remove torrent ${String(args.id ?? "")}`,
        ctx,
      ),
  },

  // ── Music library (os.music@1) ──────────────────────────────────────────────
  {
    name: "music_list_tracks",
    description:
      "List tracks in the Music app library (seed + user imports). Returns id, title, artists, album, origin.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) =>
      agentInvokeIntent("music.tracks.list", {}, "List music tracks", ctx),
  },
  {
    name: "music_import",
    description:
      "Import audio into the Music library so it appears in the Music app. Prefer torrentId after a download finishes (imports all completed MP3/M4A/etc from that torrent), or path under data/torrents, or driveFileId. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        torrentId: {
          type: "string",
          description: "Torrent info-hash from torrents_list — imports completed audio files",
        },
        fileName: {
          type: "string",
          description: "Optional: only import this file from the torrent",
        },
        path: {
          type: "string",
          description: "Absolute path under data/torrents, MUSIC_SEED_DIR, or workspace",
        },
        driveFileId: { type: "string", description: "Drive file id for an audio blob" },
        title: { type: "string" },
        artists: { type: "string" },
        album: { type: "string" },
      },
    },
    execute: async (args, ctx) => {
      const label =
        typeof args.torrentId === "string"
          ? `Import music from torrent ${args.torrentId}`
          : typeof args.path === "string"
            ? `Import music from ${args.path}`
            : typeof args.driveFileId === "string"
              ? `Import music from Drive ${args.driveFileId}`
              : "Import music";
      const result = await agentInvokeIntent("music.tracks.import", args, label, ctx);
      if (!(result && typeof result === "object" && "error" in result)) {
        ctx.emit({ type: "os_ui", action: { action: "open_system", app: "music" } });
      }
      return result;
    },
  },
  {
    name: "music_scan_downloads",
    description:
      "Scan torrent downloads (or the seed folder) for audio files and import any new ones into the Music library. Use after torrents finish downloading. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        source: {
          type: "string",
          enum: ["torrents", "seed", "path"],
          description: "Default torrents (data/torrents). Use seed for MUSIC_SEED_DIR extras.",
        },
        path: { type: "string", description: "Required when source=path (must be under torrents/seed/workspace)" },
      },
    },
    execute: async (args, ctx) => {
      const result = await agentInvokeIntent(
        "music.tracks.scan",
        {
          ...(typeof args.source === "string" ? { source: args.source } : {}),
          ...(typeof args.path === "string" ? { path: args.path } : {}),
        },
        "Scan for music to import",
        ctx,
      );
      if (!(result && typeof result === "object" && "error" in result)) {
        ctx.emit({ type: "os_ui", action: { action: "open_system", app: "music" } });
      }
      return result;
    },
  },
  {
    name: "music_remove_track",
    description:
      "Remove a user-imported track from the Music library (seed tracks cannot be removed). Pauses for user approval.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "music.tracks.remove",
        { id: String(args.id ?? "") },
        `Remove music track ${String(args.id ?? "")}`,
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

  // ── Board work items (os.board@1) ──────────────────────────────────────────
  {
    name: "board_list",
    description:
      "List SDLC work items on the Board. Columns: backlog, ready, in_progress, review, done. Prefer this over tasks_* for shipping jobs tied to Studio sessions.",
    parameters: {
      type: "object",
      properties: {
        columnId: {
          type: "string",
          enum: ["backlog", "ready", "in_progress", "review", "done"],
        },
        projectId: { type: "string" },
        archived: { type: "boolean" },
      },
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "board.list",
        {
          ...(typeof args.columnId === "string" ? { columnId: args.columnId } : {}),
          ...(typeof args.projectId === "string" ? { projectId: args.projectId } : {}),
          ...(typeof args.archived === "boolean" ? { archived: args.archived } : {}),
        },
        "List board work items",
        ctx,
      ),
  },
  {
    name: "board_get",
    description: "Get a Board work item by id (includes linked sessionIds, branch, worktree).",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("board.get", args, `Get work item ${String(args.id ?? "")}`, ctx),
  },
  {
    name: "board_create",
    description: "Create a Board work item. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        columnId: {
          type: "string",
          enum: ["backlog", "ready", "in_progress", "review", "done"],
        },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        projectId: { type: "string" },
        worktreePath: { type: "string" },
        branch: { type: "string" },
        sessionIds: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "board.create",
        args,
        `Create work item "${String(args.title ?? "")}"`,
        ctx,
      ),
  },
  {
    name: "board_update",
    description: "Update a Board work item by id. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        columnId: {
          type: "string",
          enum: ["backlog", "ready", "in_progress", "review", "done"],
        },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        projectId: { type: "string" },
        worktreePath: { type: "string" },
        branch: { type: "string" },
        sessionIds: { type: "array", items: { type: "string" } },
        archived: { type: "boolean" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "board.update",
        args,
        `Update work item ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "board_move",
    description:
      "Move a Board work item to a lifecycle column. Use when the job's meaning changes: start work → in_progress; ready for human/PR check → review; accepted/merged → done. Do NOT move to done merely because a turn finished. No confirmation pause.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        columnId: {
          type: "string",
          enum: ["backlog", "ready", "in_progress", "review", "done"],
        },
        position: { type: "number" },
      },
      required: ["id", "columnId"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "board.move",
        args,
        `Move work item ${String(args.id ?? "")} → ${String(args.columnId ?? "")}`,
        ctx,
      ),
  },
  {
    name: "board_delete",
    description: "Permanently delete a Board work item. Pauses for user approval.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "board.delete",
        args,
        `Delete work item ${String(args.id ?? "")}`,
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
      "Read a Drive file's content by id (get ids from docs_list). Works for text docs and for structured JSON like .slides.json / sheets — returns the raw string.",
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
    name: "docs_export",
    description:
      "Export an Arco document (TipTap JSON in Drive) to markdown, html, odt, docx, or json.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        format: { type: "string", enum: ["json", "markdown", "html", "odt", "docx"] },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "docs.export",
        { id: args.id, format: args.format ?? "markdown" },
        `Export document ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "sheets_query",
    description:
      "Read a cell range from a spreadsheet in Drive (A1 notation). Returns evaluated values.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Workbook file id" },
        sheet: { type: "string" },
        range: { type: "string", description: "e.g. A1:C10" },
      },
      required: ["id", "range"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("sheets.query", args, `Query sheet range ${String(args.range ?? "")}`, ctx),
  },
  {
    name: "sheets_write_range",
    description: "Write a 2D values array into a spreadsheet starting at an A1 address.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        sheet: { type: "string" },
        start: { type: "string", default: "A1" },
        values: { type: "array", items: { type: "array" } },
      },
      required: ["id", "values"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent("sheets.write_range", args, `Write sheet range on ${String(args.id ?? "")}`, ctx),
  },
  {
    name: "slides_create",
    description:
      "Create a designed presentation in Drive (os.slides@1) and open it. ALWAYS pass a full DeckDoc in content (multi-slide with positioned text/shape boxes on a 960×540 canvas) — never create an empty shell. Read the slides-authoring skill first.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: 'File name ending in .slides.json, e.g. "Q3 Review.slides.json"' },
        parentId: { type: "string", description: "Drive folder id; omit for root" },
        content: {
          type: "object",
          description:
            'DeckDoc: { version:1, title, width:960, height:540, slides:[{ id, boxes:[{ id, kind:"text"|"shape"|"image", x,y,w,h, content?, fill?, stroke?, color?, shape?, textAlign? }] }] }. Text content may be a plain string or TipTap doc JSON.',
        },
        open: {
          type: "boolean",
          description: "Open the deck in Slides after create (default true)",
          default: true,
        },
      },
      required: ["name", "content"],
    },
    execute: async (args, ctx) => {
      const result = await agentInvokeIntent(
        "slides.create",
        {
          name: args.name,
          ...(typeof args.parentId === "string" ? { parentId: args.parentId } : {}),
          content: args.content,
        },
        `Create presentation ${String(args.name ?? "")}`,
        ctx,
      );
      const shouldOpen = args.open !== false;
      const id =
        result && typeof result === "object" && "id" in result
          ? String((result as { id: unknown }).id ?? "")
          : "";
      if (shouldOpen && id && !("error" in (result as object))) {
        ctx.emit({
          type: "os_ui",
          action: { action: "open_app", appId: "core.slides", fileId: id },
        });
      }
      return result;
    },
  },
  {
    name: "slides_open",
    description:
      "Open/read a presentation by Drive file id. Returns { id, name, deck } with the full DeckDoc JSON so you can inspect or revise slides.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Presentation file id from slides_create or docs_list" },
        show: {
          type: "boolean",
          description: "Also open the deck in the Slides app window (default true)",
          default: true,
        },
      },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      const result = await agentInvokeIntent(
        "slides.open",
        { id: args.id },
        `Open presentation ${String(args.id ?? "")}`,
        ctx,
      );
      if (args.show !== false && result && typeof result === "object" && "id" in result) {
        ctx.emit({
          type: "os_ui",
          action: {
            action: "open_app",
            appId: "core.slides",
            fileId: String((result as { id: unknown }).id ?? args.id),
          },
        });
      }
      return result;
    },
  },
  {
    name: "slides_write",
    description:
      "Replace a presentation's full DeckDoc by id (after slides_open). Use to revise layouts, add slides/boxes, or restyle. Pass the complete deck object, not a patch.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        content: {
          type: "object",
          description:
            "Full DeckDoc JSON (version, width 960, height 540, slides with positioned boxes).",
        },
      },
      required: ["id", "content"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "slides.write",
        { id: args.id, content: args.content },
        `Update presentation ${String(args.id ?? "")}`,
        ctx,
      ),
  },
  {
    name: "slides_export",
    description: "Export a presentation to html, odp, pptx, pdf, or json.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        format: { type: "string", enum: ["json", "html", "odp", "pptx", "pdf"] },
      },
      required: ["id"],
    },
    execute: async (args, ctx) =>
      agentInvokeIntent(
        "slides.export",
        { id: args.id, format: args.format ?? "pptx" },
        `Export presentation ${String(args.id ?? "")}`,
        ctx,
      ),
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
      "Draft a reusable skill proposal — distill a lesson, preference, or procedure from this conversation into standing instructions. Creates a proposal for the user to Apply (go live) or Reject in Skills; does not enable the skill immediately. Pauses for user approval. Write the description so a future agent knows WHEN to read the skill.",
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
      // Proposals still need sign-off when a user is attached. Smart mode
      // shows a confirm card; strict already paused in applyPolicy; full
      // skips the card. Headless always denies.
      if (!ctx.interactive) {
        return { error: "Saving a skill requires user approval and no user is attached. Skipped." };
      }
      if (shouldConfirmInternally(ctx)) {
        const { confirmId, verdict } = requestConfirmation(ctx.signal);
        ctx.emit({
          type: "confirm_required",
          confirmId,
          command: `Propose skill "${name}" — ${description}`,
        });
        const { approved } = await verdict;
        ctx.emit({ type: "confirm_resolved", confirmId, approved });
        if (!approved) {
          return { error: "User declined to save this skill. Do not retry; ask what they'd like instead." };
        }
      }
      const proposal = skillStore.createProposal({ name, description, body });
      return {
        id: proposal.id,
        name: proposal.name,
        proposed: true,
        status: proposal.status,
        note: "Skill drafted as a proposal. The user can Apply it in Skills to make it live.",
      };
    },
  },
  {
    name: "patch_skill",
    description:
      "Propose an update to an existing skill (body/description). Creates a proposal targeting that skill for the user to Apply or Reject — does not change the live skill until applied. Prefer this over save_skill when improving a skill you already used.",
    parameters: {
      type: "object",
      properties: {
        skillId: { type: "string", description: "Existing skill id to patch" },
        name: { type: "string", description: "Optional new display name" },
        description: {
          type: "string",
          description: "Updated when-to-read description",
        },
        body: { type: "string", description: "Updated full instructions, markdown" },
      },
      required: ["skillId", "description", "body"],
    },
    execute: async (args, ctx) => {
      const skillId = String(args.skillId ?? "").trim();
      const existing = skillStore.get(skillId);
      if (!existing) return { error: `Unknown skill: ${skillId}` };
      const name = String(args.name ?? existing.name).trim() || existing.name;
      const description = String(args.description ?? "").trim();
      const body = String(args.body ?? "").trim();
      if (!description || !body) {
        return { error: "description and body are required" };
      }
      if (!ctx.interactive) {
        return { error: "Patching a skill requires user approval and no user is attached. Skipped." };
      }
      if (shouldConfirmInternally(ctx)) {
        const { confirmId, verdict } = requestConfirmation();
        ctx.emit({
          type: "confirm_required",
          confirmId,
          command: `Propose patch to skill "${existing.name}" (${skillId})`,
        });
        const { approved } = await verdict;
        ctx.emit({ type: "confirm_resolved", confirmId, approved });
        if (!approved) {
          return { error: "User declined to patch this skill. Do not retry; ask what they'd like instead." };
        }
      }
      const proposal = skillStore.createProposal({
        name,
        description,
        body,
        gates: existing.gates,
        targetSkillId: skillId,
      });
      return {
        id: proposal.id,
        targetSkillId: skillId,
        name: proposal.name,
        proposed: true,
        status: proposal.status,
        note: "Skill patch drafted as a proposal. Apply in Skills to update the live skill.",
      };
    },
  },

  // ── Shell navigation (agent-canvas canvas_ui pattern) ──────────────────────
  {
    name: "os_ui",
    description:
      "Drive the Arco desktop and wait until the window settles. Actions: open_app / open_system / close_app / focus_app / minimize_app / restore_app / notify / open_workspace_tab. Prefer list_apps first. For Drive documents, pass fileId with open_app (e.g. appId core.slides + fileId) so the editor opens that file. Result includes control mode — when control=tools use calendar_*/mail_*/slides_* instead of the cursor; when control=open_only the window opens but content is not mouse-driveable (iframe). Use focus_app when a click reports a covered target.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "open_app",
            "open_system",
            "close_app",
            "focus_app",
            "minimize_app",
            "restore_app",
            "notify",
            "open_workspace_tab",
          ],
        },
        appId: {
          type: "string",
          description:
            "App id (for open/close/focus/minimize/restore): system id, generated id, installed id like core.docs / core.slides, or web app id — or a display title",
        },
        fileId: {
          type: "string",
          description:
            "Drive file id to open inside the app (Docs/Sheets/Slides). Use with open_app / open_system.",
        },
        app: { type: "string", description: "System app id (for open_system)" },
        message: { type: "string", description: "Notification text (for notify)" },
        tab: {
          type: "string",
          enum: ["files", "diffs", "terminal", "browser"],
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
      const appActions = new Set([
        "open_app",
        "close_app",
        "focus_app",
        "minimize_app",
        "restore_app",
      ]);
      let action: OsUiAction;
      let meta: { control?: string; toolHint?: string; note?: string } | undefined;

      if (appActions.has(String(args.action)) && typeof args.appId === "string") {
        const resolved = await resolveAppId(args.appId);
        if ("error" in resolved) return resolved;
        meta = {
          control: resolved.control,
          toolHint: resolved.toolHint,
          note: noteForControl(resolved.control, resolved.toolHint),
        };
        if (args.action === "open_app") {
          action = {
            action: "open_app",
            appId: resolved.appId,
            ...(typeof args.fileId === "string" ? { fileId: args.fileId } : {}),
          };
        } else {
          action = {
            action: args.action as
              | "close_app"
              | "focus_app"
              | "minimize_app"
              | "restore_app",
            appId: resolved.appId,
          };
        }
      } else if (args.action === "open_system" && typeof args.app === "string") {
        const systemAppId = resolveSystemAppId(args.app);
        if (systemAppId) {
          const catalog = await loadShellCatalog();
          const resolved = controlForResolvedApp(systemAppId, catalog);
          meta = {
            control: resolved.control,
            toolHint: resolved.toolHint,
            note: noteForControl(resolved.control, resolved.toolHint),
          };
          action = {
            action: "open_system",
            app: systemAppId,
            ...(typeof args.fileId === "string" ? { fileId: args.fileId } : {}),
          };
        } else {
          const resolved = await resolveAppId(args.app);
          if ("error" in resolved) return resolved;
          meta = {
            control: resolved.control,
            toolHint: resolved.toolHint,
            note: noteForControl(resolved.control, resolved.toolHint),
          };
          action = { action: "open_app", appId: resolved.appId };
        }
      } else if (args.action === "notify" && typeof args.message === "string") {
        action = { action: "notify", message: args.message };
      } else if (
        args.action === "open_workspace_tab" &&
        (args.tab === "files" ||
          args.tab === "diffs" ||
          args.tab === "terminal" ||
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
      return runOsUiAction(action, ctx, meta);
    },
  },

  // ── Agent cursor (virtual mouse over the live desktop) ─────────────────────
  {
    name: "ui_snapshot",
    description:
      "See the user's desktop via a DOM inventory of interactive elements (not a screen reader). Returns hostMode, windows (including minimized metadata), control/reason per window, and element ids. Call before mouse_click/type_text. Optional windowTitle focuses one window when the desktop is crowded. Opaque iframes / native host / Monaco are not mouse-driveable — use domain tools or os_ui only.",
    parameters: {
      type: "object",
      properties: {
        windowTitle: {
          type: "string",
          description: "Optional window title filter to reduce snapshot size",
        },
      },
    },
    execute: async (args, ctx) =>
      runCursorCommand(
        {
          kind: "snapshot",
          ...(typeof args.windowTitle === "string" ? { windowTitle: args.windowTitle } : {}),
        },
        ctx,
      ),
  },
  {
    name: "mouse_click",
    description:
      "Move the visible AI cursor to an element and click it. Target by element id from ui_snapshot (preferred) or raw x/y. Fails clearly when hostMode is native, the target is in an iframe, or another window covers the click point (then use os_ui focus_app).",
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
      "Click into an input, textarea, or contenteditable (TipTap/Notes) by element id and type text with the visible AI cursor. Set submit=true to press Enter afterwards. Replaces existing content for input/textarea; inserts into contenteditable.",
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
    name: "select_option",
    description:
      "Set a native <select> element's value by element id from ui_snapshot (synthetic dropdown open is unreliable).",
    parameters: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "Element id of the select" },
        value: { type: "string", description: "Option value to select" },
      },
      required: ["targetId", "value"],
    },
    execute: async (args, ctx) =>
      runCursorCommand(
        {
          kind: "select",
          targetId: String(args.targetId ?? ""),
          value: String(args.value ?? ""),
        },
        ctx,
      ),
  },

  // ── Studio Browser automation (webview) ────────────────────────────────────
  {
    name: "browser_snapshot",
    description:
      "Snapshot interactive elements in the Techno Studio Browser webview (URL, title, selectors). Open Studio → Browser and load a page first.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => runBrowserCommand({ kind: "snapshot" }, ctx),
  },
  {
    name: "browser_click",
    description: "Click a CSS selector in the Studio Browser webview.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector, e.g. '#submit' or 'button.primary'" },
      },
      required: ["selector"],
    },
    execute: async (args, ctx) =>
      runBrowserCommand({ kind: "click", selector: String(args.selector ?? "") }, ctx),
  },
  {
    name: "browser_fill",
    description: "Fill an input/textarea in the Studio Browser webview by CSS selector.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string" },
        value: { type: "string" },
      },
      required: ["selector", "value"],
    },
    execute: async (args, ctx) =>
      runBrowserCommand(
        { kind: "fill", selector: String(args.selector ?? ""), value: String(args.value ?? "") },
        ctx,
      ),
  },

  // ── OS computer use (outside Arco DOM) ─────────────────────────────────────
  {
    name: "computer_screenshot",
    description:
      "Capture a screenshot of the user's desktop (Kosmos desktop app). Prefer ui_snapshot for in-Arco UI.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => runComputerCommand({ kind: "screenshot" }, ctx),
  },
  {
    name: "computer_click",
    description:
      "Click screen coordinates outside Arco (macOS Accessibility). Prefer mouse_click for in-Arco UI.",
    parameters: {
      type: "object",
      properties: {
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["x", "y"],
    },
    execute: async (args, ctx) =>
      runComputerCommand(
        { kind: "click", x: Number(args.x ?? 0), y: Number(args.y ?? 0) },
        ctx,
      ),
  },
  {
    name: "computer_type",
    description: "Type text via OS keyboard events (macOS Accessibility). Prefer type_text in Arco.",
    parameters: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    execute: async (args, ctx) =>
      runComputerCommand({ kind: "type", text: String(args.text ?? "") }, ctx),
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

  // ── Memory (Phase 1 document store — keyword search, ACL-gated) ────────────
  //
  // Principal comes from ToolContext (agent profile). Channel turns should
  // pass agent:channel:<id> or the bound profile principal (Phase 2 bindings).
  {
    name: "memory_write",
    description:
      "Create a durable memory entry (working, episodic, semantic, procedural, identity, or reference). Use for facts, preferences, session outcomes, and standing notes the user wants remembered across chats. Pauses for user approval in interactive mode.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["working", "episodic", "semantic", "procedural", "identity", "reference"],
          description: "Memory kind — prefer semantic for stable facts, episodic for what happened",
        },
        title: { type: "string", description: "Short title" },
        summary: { type: "string", description: "One or two sentence summary (searchable)" },
        body: { type: "string", description: "Optional longer body" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags",
        },
      },
      required: ["kind", "title", "summary"],
    },
    execute: async (args, ctx) => {
      const kind = String(args.kind ?? "") as MemoryKind;
      if (!(MEMORY_KINDS as string[]).includes(kind)) {
        return { error: `Invalid kind. Use one of: ${MEMORY_KINDS.join(", ")}` };
      }
      const title = String(args.title ?? "").trim();
      const summary = String(args.summary ?? "").trim();
      if (!title || !summary) return { error: "title and summary are required" };

      const principalId = ctx.principalId ?? "agent:builtin";

      if (!ctx.interactive) {
        return {
          error:
            "Writing memory requires user approval and no user is attached. Skipped.",
        };
      }
      if (shouldConfirmInternally(ctx)) {
        const { confirmId, verdict } = requestConfirmation();
        ctx.emit({
          type: "confirm_required",
          confirmId,
          command: `Remember (${kind}): ${title}`,
        });
        const { approved } = await verdict;
        ctx.emit({ type: "confirm_resolved", confirmId, approved });
        if (!approved) {
          return {
            error: "User declined to save this memory. Do not retry; ask what they'd like instead.",
          };
        }
      }

      try {
        const entry = memoryStore.createEntry(principalId, {
          kind,
          title,
          summary,
          ...(typeof args.body === "string" ? { body: args.body } : {}),
          ...(Array.isArray(args.tags) ? { tags: args.tags.map(String) } : {}),
          source: `session:${ctx.sessionId}`,
          sourceSessionId: ctx.sessionId,
        });
        return {
          id: entry.id,
          kind: entry.kind,
          title: entry.title,
          collectionId: entry.collectionId,
          saved: true,
        };
      } catch (err) {
        if (err instanceof MemoryAccessError) {
          return { error: err.message };
        }
        return { error: err instanceof Error ? err.message : "Failed to write memory" };
      }
    },
  },
  {
    name: "memory_read",
    description: "Fetch a memory entry by id (full title, summary, body, tags, status).",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Memory entry id" },
      },
      required: ["id"],
    },
    execute: async (args, ctx) => {
      const id = String(args.id ?? "").trim();
      if (!id) return { error: "id is required" };
      const principalId = ctx.principalId ?? "agent:builtin";
      try {
        const entry = memoryStore.getEntry(principalId, id);
        if (!entry) return { error: `Memory entry not found: ${id}` };
        return entry;
      } catch (err) {
        if (err instanceof MemoryAccessError) return { error: err.message };
        return { error: err instanceof Error ? err.message : "Failed to read memory" };
      }
    },
  },
  {
    name: "memory_search",
    description:
      "Keyword search over memory entries the agent may read (title, summary, body). Filter by kind. Returns a limited list — use memory_read for full body.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        kind: {
          type: "string",
          enum: ["working", "episodic", "semantic", "procedural", "identity", "reference"],
          description: "Optional single-kind filter",
        },
        limit: {
          type: "integer",
          description: "Max results (1–20, default 8)",
        },
      },
      required: ["query"],
    },
    execute: async (args, ctx) => {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: "query is required" };
      const principalId = ctx.principalId ?? "agent:builtin";
      const kind = typeof args.kind === "string" ? (args.kind as MemoryKind) : undefined;
      const limit =
        typeof args.limit === "number" && Number.isFinite(args.limit)
          ? Math.min(Math.max(Math.floor(args.limit), 1), 20)
          : 8;
      try {
        const hits = memoryStore.search(principalId, {
          query,
          ...(kind && (MEMORY_KINDS as string[]).includes(kind) ? { kinds: [kind] } : {}),
          limit,
        });
        return {
          query,
          count: hits.length,
          results: hits.map((e) => ({
            id: e.id,
            kind: e.kind,
            title: e.title,
            summary: e.summary,
            tags: e.tags,
            status: e.status,
            updatedAt: e.updatedAt,
          })),
        };
      } catch (err) {
        if (err instanceof MemoryAccessError) return { error: err.message };
        return { error: err instanceof Error ? err.message : "Search failed" };
      }
    },
  },

  {
    name: "session_search",
    description:
      "Full-text search over past conversation transcripts (FTS5). Returns snippets with session id and message index — zero LLM cost. Use to recall what was said in earlier chats. Optionally scope to one sessionId.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        sessionId: {
          type: "string",
          description: "Optional: limit search to one session",
        },
        limit: {
          type: "integer",
          description: "Max hits (1–30, default 8)",
        },
      },
      required: ["query"],
    },
    execute: async (args) => {
      const query = String(args.query ?? "").trim();
      if (!query) return { error: "query is required" };
      const limit =
        typeof args.limit === "number" && Number.isFinite(args.limit)
          ? Math.min(Math.max(Math.floor(args.limit), 1), 30)
          : 8;
      const sessionId =
        typeof args.sessionId === "string" && args.sessionId.trim()
          ? args.sessionId.trim()
          : undefined;
      const hits = sessionSearchIndex.search({ query, sessionId, limit });
      return {
        query,
        count: hits.length,
        results: hits,
      };
    },
  },

  {
    name: "delegate_task",
    description:
      "Spawn an isolated headless sub-agent for a focused subtask and return its final text summary. Use for parallelizable research or multi-step work that would clutter this transcript. Does not share this conversation's tool confirmations.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Clear instructions for the sub-agent",
        },
        label: {
          type: "string",
          description: "Short label for the delegate session title",
        },
      },
      required: ["prompt"],
    },
    execute: async (args, ctx) => {
      const prompt = String(args.prompt ?? "").trim();
      if (!prompt) return { error: "prompt is required" };
      const label = String(args.label ?? "").trim() || "Delegated task";

      const child = await sessionStore.create("automation", `↳ ${label}`, {
        profileId: ctx.profileId ?? null,
      });

      // Dynamic import avoids a circular dependency with loop.ts.
      const { runAgentTurn } = await import("./loop.js");

      try {
        const text = await enqueueSessionResult(`delegate:${child.id}`, () =>
          runAgentTurn({
            sessionId: child.id,
            userMessage: prompt,
            emit: () => {},
            interactive: false,
            profileId: ctx.profileId,
            skipBackgroundReview: true,
            toolsetIds: ["core", "coding", "memory"],
          }),
        );
        return {
          sessionId: child.id,
          label,
          summary: text || "(no reply)",
        };
      } catch (err) {
        return {
          sessionId: child.id,
          error: err instanceof Error ? err.message : "delegate_task failed",
        };
      }
    },
  },

  // ── Deploy / ops (shared with kosmos-ops MCP) ───────────────────────────────
  ...opsAgentTools,
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
