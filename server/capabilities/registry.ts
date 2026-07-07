/**
 * Capability registry — resolves "who provides this contract" and dispatches
 * intents to that provider. Callers (apps, the agent, the shell) never name
 * an implementation; they invoke intents and the registry routes them.
 *
 * v1 ships with the system providers only. The provider table exists so a
 * conforming app can later take over a contract ("default apps") without any
 * caller changing.
 */
import fs from "node:fs";
import path from "node:path";
import type { CalendarEventInput } from "../../shared/capabilities/calendar.js";
import { CALCULATOR_CONTRACT_ID } from "../../shared/capabilities/calculator.js";
import { CALENDAR_CONTRACT_ID } from "../../shared/capabilities/calendar.js";
import { DOCS_CONTRACT_ID, EMPTY_DOC_JSON } from "../../shared/capabilities/docs.js";
import { DOC_MIME, FILES_CONTRACT_ID, SHEET_MIME, type FileCreateInput } from "../../shared/capabilities/files.js";
import { EMPTY_SHEET_JSON, SHEETS_CONTRACT_ID } from "../../shared/capabilities/sheets.js";
import { exportDocToMarkdown } from "../../shared/docFormat.js";
import { VOICE_CONTRACT_ID } from "../../shared/capabilities/voice.js";
import { TASKS_CONTRACT_ID } from "../../shared/capabilities/tasks.js";
import type { TaskInput, TaskStatus } from "../../shared/capabilities/tasks.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import { calculatorService } from "../services/calculatorService.js";
import { calendarService } from "../services/calendarService.js";
import { tasksService } from "../services/tasksService.js";
import { filesService } from "../services/filesService.js";
import { dataDirs } from "../env.js";

const PROVIDERS_FILE = path.join(dataDirs.root, "capability-providers.json");

/** contractId → providing appId, or "system" for the built-in service. */
const DEFAULT_PROVIDERS: Record<string, string> = {
  [CALCULATOR_CONTRACT_ID]: "system",
  [CALENDAR_CONTRACT_ID]: "system",
  [FILES_CONTRACT_ID]: "system",
  [DOCS_CONTRACT_ID]: "system",
  [SHEETS_CONTRACT_ID]: "system",
  [VOICE_CONTRACT_ID]: "system",
  [TASKS_CONTRACT_ID]: "system",
};

/** Where the Pipecat voice service listens (voice-server/bot.py). */
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL ?? "http://localhost:4630";

export function getProviders(): Record<string, string> {
  try {
    const stored = JSON.parse(fs.readFileSync(PROVIDERS_FILE, "utf-8")) as Record<string, string>;
    return { ...DEFAULT_PROVIDERS, ...stored };
  } catch {
    return { ...DEFAULT_PROVIDERS };
  }
}

export function setProvider(contractId: string, providerId: string): void {
  const stored = getProviders();
  stored[contractId] = providerId;
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(stored, null, 2), "utf-8");
}

// ── System intent handlers ────────────────────────────────────────────────────

type IntentHandler = (params: Record<string, unknown>) => unknown | Promise<unknown>;

const systemHandlers: Record<string, IntentHandler> = {
  "calculator.evaluate": (p) =>
    calculatorService.evaluate(String(p.expression ?? "")),
  "calculator.history.list": (p) =>
    calculatorService.listHistory({
      ...(typeof p.limit === "number" ? { limit: p.limit } : {}),
    }),

  "calendar.events.list": (p) =>
    calendarService.list({
      ...(typeof p.from === "string" ? { from: p.from } : {}),
      ...(typeof p.to === "string" ? { to: p.to } : {}),
    }),
  "calendar.event.get": (p) => {
    const event = calendarService.get(String(p.id ?? ""));
    if (!event) throw new Error(`Event not found: ${String(p.id)}`);
    return event;
  },
  "calendar.event.create": (p) => calendarService.create(p as unknown as CalendarEventInput),
  "calendar.event.update": (p) => {
    const { id, ...patch } = p;
    return calendarService.update(String(id ?? ""), patch as Partial<CalendarEventInput>);
  },
  "calendar.event.delete": (p) => ({ deleted: calendarService.delete(String(p.id ?? "")) }),

  "tasks.list": (p) =>
    tasksService.list({
      ...(typeof p.status === "string" ? { status: p.status as TaskStatus } : {}),
      ...(typeof p.archived === "boolean" ? { archived: p.archived } : {}),
      ...(typeof p.dueBefore === "string" ? { dueBefore: p.dueBefore } : {}),
      ...(typeof p.dueAfter === "string" ? { dueAfter: p.dueAfter } : {}),
    }),
  "tasks.get": (p) => {
    const task = tasksService.get(String(p.id ?? ""));
    if (!task) throw new Error(`Task not found: ${String(p.id)}`);
    return task;
  },
  "tasks.create": (p) => tasksService.create(p as unknown as TaskInput),
  "tasks.update": (p) => {
    const { id, ...patch } = p;
    return tasksService.update(String(id ?? ""), patch as Partial<TaskInput>);
  },
  "tasks.complete": (p) =>
    tasksService.complete(String(p.id ?? ""), p.completed !== false),
  "tasks.archive": (p) =>
    tasksService.archive(String(p.id ?? ""), p.archived !== false),
  "tasks.delete": (p) => ({ deleted: tasksService.delete(String(p.id ?? "")) }),

  // os.files@1 — the OS-owned virtual file store (server/services/filesService.ts)
  "files.list": (p) =>
    filesService.list({
      ...(p.parentId !== undefined ? { parentId: p.parentId === null ? null : String(p.parentId) } : {}),
      ...(typeof p.trashed === "boolean" ? { trashed: p.trashed } : {}),
      ...(typeof p.starred === "boolean" ? { starred: p.starred } : {}),
    }),
  "files.get": (p) => filesService.get(String(p.id ?? "")),
  "files.search": (p) => filesService.search(String(p.query ?? "")),
  "files.create": (p) => filesService.create(p as unknown as FileCreateInput),
  "files.rename": (p) => filesService.rename(String(p.id ?? ""), String(p.name ?? "")),
  "files.move": (p) =>
    filesService.move(String(p.id ?? ""), p.parentId == null ? null : String(p.parentId)),
  "files.star": (p) => filesService.star(String(p.id ?? ""), p.starred === true),
  "files.trash": (p) => filesService.trash(String(p.id ?? "")),
  "files.restore": (p) => filesService.restore(String(p.id ?? "")),
  "files.delete": (p) => ({ deleted: filesService.delete(String(p.id ?? "")) }),
  "files.content.read": (p) => filesService.readContent(String(p.id ?? "")),
  "files.content.write": (p) =>
    filesService.writeContent(String(p.id ?? ""), String(p.content ?? "")),

  // os.docs@1 — thin wrappers over the file store
  "docs.create": (p) => {
    const name = String(p.name ?? "Untitled");
    const contentObj =
      typeof p.content === "object" && p.content !== null ? p.content : EMPTY_DOC_JSON;
    return filesService.create({
      name,
      kind: "file",
      mimeType: DOC_MIME,
      parentId: p.parentId == null ? null : String(p.parentId),
      content: JSON.stringify(contentObj),
    });
  },
  "docs.open": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    let doc: unknown;
    try {
      doc = JSON.parse(file.content);
    } catch {
      throw new Error("Document content is not valid JSON");
    }
    return { ...file, doc };
  },
  "docs.export": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    const format = String(p.format ?? "json");
    if (format === "markdown") {
      let doc: unknown;
      try {
        doc = JSON.parse(file.content);
      } catch {
        throw new Error("Document content is not valid JSON");
      }
      return { id: file.id, name: file.name, format, content: exportDocToMarkdown(doc as never) };
    }
    return { id: file.id, name: file.name, format: "json", content: file.content };
  },

  // os.sheets@1 — thin wrappers over the file store
  "sheets.create": (p) => {
    const name = String(p.name ?? "Untitled");
    const contentObj =
      typeof p.content === "object" && p.content !== null ? p.content : EMPTY_SHEET_JSON;
    return filesService.create({
      name,
      kind: "file",
      mimeType: SHEET_MIME,
      parentId: p.parentId == null ? null : String(p.parentId),
      content: JSON.stringify(contentObj),
    });
  },
  "sheets.open": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    let workbook: unknown;
    try {
      workbook = JSON.parse(file.content);
    } catch {
      throw new Error("Spreadsheet content is not valid JSON");
    }
    return { ...file, workbook };
  },

  // os.voice@1 — the session itself is desktop-owned (the browser holds the
  // microphone), so start/stop can only be initiated from the shell. status
  // is the one intent the server can answer: it probes the voice service.
  "voice.status": async () => {
    try {
      const res = await fetch(`${VOICE_SERVER_URL}/status`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!res.ok) return { available: false, reason: `voice server responded ${res.status}` };
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      if (body?.status !== "ready") {
        return { available: false, reason: "voice server status is not ready" };
      }
      return { available: true, ...body };
    } catch {
      return { available: false, reason: "voice server unreachable" };
    }
  },
  "voice.start": () => {
    throw new Error(
      "Voice sessions are desktop-owned (the browser holds the microphone) — start voice from the shell's mic button",
    );
  },
  "voice.stop": () => {
    throw new Error(
      "Voice sessions are desktop-owned — stop voice from the shell's voice bar",
    );
  },
};

/**
 * Dispatch an intent to its contract's current provider. Permission checks
 * happen in the bridge (for apps) or the tool layer (for the agent) BEFORE
 * this runs — this function only routes.
 */
export async function invokeIntent(
  intentId: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const meta = intentMeta(intentId);
  if (!meta) throw new Error(`Unknown intent: ${intentId}`);
  const provider = getProviders()[meta.contractId] ?? "system";
  if (provider !== "system") {
    // App-hosted providers need a dispatch channel into the app (headless
    // entry or open window) — Phase 4 work. Until then the system service
    // remains authoritative and swapping means "which UI", not "which store".
    throw new Error(
      `Contract ${meta.contractId} is assigned to app "${provider}", but app-hosted providers aren't supported yet`,
    );
  }
  const handler = systemHandlers[intentId];
  if (!handler) throw new Error(`No system handler for intent: ${intentId}`);
  return await handler(params);
}
