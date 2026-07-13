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
import { DOC_MIME, FILES_CONTRACT_ID, SHEET_MIME, SLIDES_MIME, type FileCreateInput } from "../../shared/capabilities/files.js";
import { EMPTY_SHEET_JSON, SHEETS_CONTRACT_ID } from "../../shared/capabilities/sheets.js";
import { EMPTY_SLIDES_JSON, SLIDES_CONTRACT_ID } from "../../shared/capabilities/slides.js";
import { VOICE_CONTRACT_ID } from "../../shared/capabilities/voice.js";
import { SHARES_CONTRACT_ID } from "../../shared/capabilities/shares.js";
import type { ShareCreateInput } from "../../shared/capabilities/shares.js";
import { TASKS_CONTRACT_ID } from "../../shared/capabilities/tasks.js";
import type { TaskInput, TaskStatus } from "../../shared/capabilities/tasks.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import {
  exportDoc,
  exportSheet,
  exportSlides,
  importDoc,
  importSheet,
  importSlides,
  type DocFormat,
  type SheetFormat,
  type SlidesFormat,
  type WorkbookDoc,
} from "../../packages/doc-interop/src/index.js";
import { expandRange, evaluateFormula } from "../../shared/sheetFormula.js";
import { calculatorService } from "../services/calculatorService.js";
import { calendarService } from "../services/calendarService.js";
import { tasksService } from "../services/tasksService.js";
import { filesService } from "../services/filesService.js";
import { shareService } from "../services/shareService.js";
import { dataDirs } from "../env.js";

const PROVIDERS_FILE = path.join(dataDirs.root, "capability-providers.json");

/** contractId → providing appId, or "system" for the built-in service. */
const DEFAULT_PROVIDERS: Record<string, string> = {
  [CALCULATOR_CONTRACT_ID]: "system",
  [CALENDAR_CONTRACT_ID]: "system",
  [FILES_CONTRACT_ID]: "system",
  [DOCS_CONTRACT_ID]: "system",
  [SHEETS_CONTRACT_ID]: "system",
  [SLIDES_CONTRACT_ID]: "system",
  [VOICE_CONTRACT_ID]: "system",
  [TASKS_CONTRACT_ID]: "system",
  [SHARES_CONTRACT_ID]: "system",
};

function ensureArcoName(name: string, suffix: string): string {
  if (name.toLowerCase().endsWith(suffix)) return name;
  const base = name.replace(/\.[^.]+$/i, "");
  return `${base}${suffix}`;
}

async function retainSourceSibling(
  name: string,
  parentId: string | null,
  bytes: Uint8Array,
  retain: boolean,
): Promise<string | undefined> {
  if (!retain) return undefined;
  const created = filesService.create({
    name: `${name}.source`,
    kind: "file",
    parentId,
    mimeType: "application/octet-stream",
    contentBase64: Buffer.from(bytes).toString("base64"),
  });
  return created.id;
}

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
    const format = String(p.format ?? "json") as DocFormat;
    let doc: unknown;
    try {
      doc = JSON.parse(file.content);
    } catch {
      throw new Error("Document content is not valid JSON");
    }
    if (format === "json") {
      return { id: file.id, name: file.name, format, content: file.content };
    }
    const exported = await exportDoc(doc as never, format);
    return {
      id: file.id,
      name: file.name,
      format,
      content: format === "markdown" || format === "html" ? new TextDecoder().decode(exported.bytes) : undefined,
      contentBase64: Buffer.from(exported.bytes).toString("base64"),
      mimeType: exported.mimeType,
      filenameExt: exported.filenameExt,
      warnings: exported.warnings,
    };
  },
  "docs.import": async (p) => {
    const format = String(p.format ?? "markdown") as DocFormat;
    const bytes = Buffer.from(String(p.contentBase64 ?? ""), "base64");
    const imported = await importDoc(new Uint8Array(bytes), format);
    const parentId = p.parentId == null ? null : String(p.parentId);
    const name = ensureArcoName(String(p.name ?? "Imported.doc.json"), ".doc.json");
    const created = filesService.create({
      name,
      kind: "file",
      mimeType: DOC_MIME,
      parentId,
      content: JSON.stringify(imported.content),
    });
    const sourceId = await retainSourceSibling(
      name,
      parentId,
      new Uint8Array(bytes),
      p.retainSource !== false && (format === "odt" || format === "docx"),
    );
    return { ...created, warnings: imported.warnings, sourceId };
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
  "sheets.query": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    const workbook = JSON.parse(file.content) as WorkbookDoc;
    const sheetName = typeof p.sheet === "string" ? p.sheet : undefined;
    const sheet =
      workbook.sheets.find((s) => s.id === sheetName || s.name === sheetName) ?? workbook.sheets[0];
    if (!sheet) throw new Error("Workbook has no sheets");
    const range = String(p.range ?? "A1");
    const addresses = expandRange(range);
    const values = addresses.map((addr) => {
      const cell = sheet.cells[addr];
      if (!cell) return null;
      if (cell.formula?.startsWith("=")) return evaluateFormula(cell.formula, sheet.cells);
      return cell.value ?? null;
    });
    // Shape as 2D grid when range spans rows/cols
    const parts = range.split(":");
    if (parts.length === 1) {
      return { id: file.id, sheet: sheet.name, range, values: [[values[0] ?? null]] };
    }
    const a = addresses[0];
    const b = addresses[addresses.length - 1];
    const startCol = a.replace(/\d+/g, "");
    const endCol = b.replace(/\d+/g, "");
    const startRow = Number(a.replace(/[A-Z]/gi, ""));
    const endRow = Number(b.replace(/[A-Z]/gi, ""));
    const colCount =
      endCol.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) -
      startCol.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) +
      1;
    const rows: (string | number | null)[][] = [];
    for (let r = startRow; r <= endRow; r++) {
      rows.push(values.splice(0, colCount) as (string | number | null)[]);
    }
    return { id: file.id, sheet: sheet.name, range, values: rows };
  },
  "sheets.write_range": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    const workbook = JSON.parse(file.content) as WorkbookDoc;
    const sheetName = typeof p.sheet === "string" ? p.sheet : undefined;
    const sheet =
      workbook.sheets.find((s) => s.id === sheetName || s.name === sheetName) ?? workbook.sheets[0];
    if (!sheet) throw new Error("Workbook has no sheets");
    const start = String(p.start ?? "A1").toUpperCase();
    const startMatch = start.match(/^([A-Z]+)(\d+)$/);
    if (!startMatch) throw new Error("Invalid start address");
    const startCol = startMatch[1].split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const startRow = Number(startMatch[2]) - 1;
    const values = Array.isArray(p.values) ? (p.values as unknown[][]) : [];
    values.forEach((row, ri) => {
      (Array.isArray(row) ? row : []).forEach((value, ci) => {
        let colLabel = "";
        let col = startCol + ci;
        while (col >= 0) {
          colLabel = String.fromCharCode(65 + (col % 26)) + colLabel;
          col = Math.floor(col / 26) - 1;
        }
        const addr = `${colLabel}${startRow + ri + 1}`;
        if (typeof value === "string" && value.startsWith("=")) {
          sheet.cells[addr] = { formula: value, value };
        } else if (value === null || value === undefined || value === "") {
          delete sheet.cells[addr];
        } else {
          sheet.cells[addr] = {
            value: typeof value === "number" ? value : String(value),
          };
        }
      });
    });
    filesService.writeContent(file.id, JSON.stringify(workbook));
    return { id: file.id, sheet: sheet.name, written: values.length };
  },
  "sheets.export": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    const format = String(p.format ?? "json") as SheetFormat;
    const workbook = JSON.parse(file.content) as WorkbookDoc;
    if (format === "json") {
      return { id: file.id, name: file.name, format, content: file.content };
    }
    const exported = await exportSheet(workbook, format);
    return {
      id: file.id,
      name: file.name,
      format,
      contentBase64: Buffer.from(exported.bytes).toString("base64"),
      mimeType: exported.mimeType,
      filenameExt: exported.filenameExt,
      warnings: exported.warnings,
    };
  },
  "sheets.import": async (p) => {
    const format = String(p.format ?? "csv") as SheetFormat;
    const bytes = Buffer.from(String(p.contentBase64 ?? ""), "base64");
    const imported = await importSheet(new Uint8Array(bytes), format);
    const parentId = p.parentId == null ? null : String(p.parentId);
    const name = ensureArcoName(String(p.name ?? "Imported.sheet.json"), ".sheet.json");
    const created = filesService.create({
      name,
      kind: "file",
      mimeType: SHEET_MIME,
      parentId,
      content: JSON.stringify(imported.content),
    });
    const sourceId = await retainSourceSibling(
      name,
      parentId,
      new Uint8Array(bytes),
      p.retainSource !== false && (format === "ods" || format === "xlsx"),
    );
    return { ...created, warnings: imported.warnings, sourceId };
  },

  // os.slides@1
  "slides.create": (p) => {
    const name = ensureArcoName(String(p.name ?? "Untitled.slides.json"), ".slides.json");
    const contentObj =
      typeof p.content === "object" && p.content !== null ? p.content : EMPTY_SLIDES_JSON;
    return filesService.create({
      name,
      kind: "file",
      mimeType: SLIDES_MIME,
      parentId: p.parentId == null ? null : String(p.parentId),
      content: JSON.stringify(contentObj),
    });
  },
  "slides.open": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    let deck: Record<string, unknown>;
    try {
      const parsed = JSON.parse(file.content || "null");
      deck =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : { ...EMPTY_SLIDES_JSON };
    } catch {
      throw new Error("Presentation content is not valid JSON");
    }
    if (typeof deck.width !== "number") deck.width = EMPTY_SLIDES_JSON.width;
    if (typeof deck.height !== "number") deck.height = EMPTY_SLIDES_JSON.height;
    if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
      deck.slides = [...EMPTY_SLIDES_JSON.slides];
    }
    return { id: file.id, name: file.name, mimeType: file.mimeType, deck };
  },
  "slides.export": async (p) => {
    const file = filesService.readContent(String(p.id ?? ""));
    const format = String(p.format ?? "json") as SlidesFormat;
    const deck = JSON.parse(file.content);
    if (format === "json") {
      return { id: file.id, name: file.name, format, content: file.content };
    }
    const exported = await exportSlides(deck, format);
    return {
      id: file.id,
      name: file.name,
      format,
      content: format === "html" ? new TextDecoder().decode(exported.bytes) : undefined,
      contentBase64: Buffer.from(exported.bytes).toString("base64"),
      mimeType: exported.mimeType,
      filenameExt: exported.filenameExt,
      warnings: exported.warnings,
    };
  },
  "slides.import": async (p) => {
    const format = String(p.format ?? "html") as SlidesFormat;
    const bytes = Buffer.from(String(p.contentBase64 ?? ""), "base64");
    const imported = await importSlides(new Uint8Array(bytes), format);
    const parentId = p.parentId == null ? null : String(p.parentId);
    const name = ensureArcoName(String(p.name ?? "Imported.slides.json"), ".slides.json");
    const created = filesService.create({
      name,
      kind: "file",
      mimeType: SLIDES_MIME,
      parentId,
      content: JSON.stringify(imported.content),
    });
    const sourceId = await retainSourceSibling(
      name,
      parentId,
      new Uint8Array(bytes),
      p.retainSource !== false && (format === "odp" || format === "pptx"),
    );
    return { ...created, warnings: imported.warnings, sourceId };
  },

  // os.shares@1 — scoped public links over os.files@1
  "shares.create": (p) =>
    shareService.create(p as unknown as ShareCreateInput, String(p.actorId ?? "system")),
  "shares.list": (p) =>
    shareService.list({
      ...(typeof p.fileId === "string" ? { fileId: p.fileId } : {}),
      ...(typeof p.actorId === "string" ? { createdBy: p.actorId } : {}),
    }),
  "shares.revoke": (p) => shareService.revoke(String(p.id ?? "")),
  "shares.update": (p) => {
    const { id, ...patch } = p;
    return shareService.update(String(id ?? ""), patch);
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
