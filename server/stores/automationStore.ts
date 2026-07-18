/**
 * Automation persistence — automations.json plus automation-runs.json for
 * paginated history. Scheduling lives in scheduler.ts; this store is pure data.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type {
  Automation,
  AutomationRun,
  AutomationTrigger,
  AutomationsListResponse,
  AutomationRunsResponse,
  DeliveryTarget,
} from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { writeSecureJsonAsync } from "../security/secureFs.js";
import { describeSchedule, syncScheduleFields } from "../automations/scheduleUtils.js";

const MAX_EMBEDDED_RUNS = 5;
const FILE = path.join(dataDirs.root, "automations.json");
const RUNS_FILE = path.join(dataDirs.root, "automation-runs.json");

type RunsIndex = Record<string, AutomationRun[]>;

interface StoredAutomation extends Partial<Automation> {
  id: string;
  name: string;
  prompt: string;
  enabled: boolean;
  createdAt: string;
  schedule?: string;
  trigger?: AutomationTrigger;
  runs?: AutomationRun[];
}

async function readRunsIndex(): Promise<RunsIndex> {
  try {
    const raw = await fs.readFile(RUNS_FILE, "utf-8");
    return JSON.parse(raw) as RunsIndex;
  } catch {
    return {};
  }
}

async function writeRunsIndex(index: RunsIndex): Promise<void> {
  await fs.mkdir(dataDirs.root, { recursive: true });
  await fs.writeFile(RUNS_FILE, JSON.stringify(index, null, 2), "utf-8");
}

function normalizeRun(run: AutomationRun): AutomationRun {
  return run;
}

function normalizeTrigger(raw: StoredAutomation): AutomationTrigger {
  if (raw.trigger?.type === "event") {
    return raw.trigger;
  }
  if (raw.trigger?.type === "schedule") {
    return raw.trigger;
  }
  const schedule = raw.schedule ?? "0 9 * * *";
  return {
    type: "schedule",
    schedule,
    scheduleHuman: describeSchedule(schedule),
  };
}

function normalizeAutomation(raw: StoredAutomation, runs: AutomationRun[]): Automation {
  const trigger = normalizeTrigger(raw);
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const automation: Automation = {
    id: raw.id,
    name: raw.name,
    trigger,
    schedule: trigger.type === "schedule" ? (trigger.schedule ?? raw.schedule ?? "0 9 * * *") : "",
    prompt: raw.prompt,
    enabled: raw.enabled,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    lastRun: raw.lastRun,
    runs: runs.slice(0, MAX_EMBEDDED_RUNS).map(normalizeRun),
    timezone: raw.timezone,
    model: raw.model,
    mcpServerIds: raw.mcpServerIds,
    webhookSecret: raw.webhookSecret,
    deliver: raw.deliver,
    checkIn: raw.checkIn,
  };
  syncScheduleFields(automation);
  return automation;
}

async function readAll(): Promise<Automation[]> {
  let stored: StoredAutomation[] = [];
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    stored = JSON.parse(raw) as StoredAutomation[];
  } catch {
    stored = [];
  }

  const runsIndex = await readRunsIndex();
  let migrated = false;

  for (const item of stored) {
    if (item.runs?.length) {
      const existing = runsIndex[item.id] ?? [];
      const merged = [...item.runs.map(normalizeRun), ...existing];
      const seen = new Set<string>();
      runsIndex[item.id] = merged.filter((run) => {
        if (seen.has(run.id)) return false;
        seen.add(run.id);
        return true;
      });
      delete item.runs;
      migrated = true;
    }
  }

  if (migrated) {
    await writeAllRaw(stored);
    await writeRunsIndex(runsIndex);
  }

  return stored.map((item) => normalizeAutomation(item, runsIndex[item.id] ?? []));
}

async function writeAllRaw(stored: StoredAutomation[]): Promise<void> {
  await writeSecureJsonAsync(FILE, stored);
}

async function writeAll(automations: Automation[]): Promise<void> {
  const stored: StoredAutomation[] = automations.map((a) => {
    const { runs: _runs, ...rest } = a;
    return rest;
  });
  await writeAllRaw(stored);
}

export type AutomationCreateInput = {
  name: string;
  prompt: string;
  trigger?: AutomationTrigger;
  schedule?: string;
  timezone?: string;
  model?: string;
  mcpServerIds?: string[];
  webhookSecret?: string;
  deliver?: DeliveryTarget;
  checkIn?: boolean;
  profileId?: string | null;
};

export type AutomationUpdatePatch = Partial<
  Pick<
    Automation,
    | "name"
    | "prompt"
    | "enabled"
    | "timezone"
    | "model"
    | "mcpServerIds"
    | "webhookSecret"
    | "deliver"
    | "trigger"
    | "schedule"
    | "checkIn"
    | "profileId"
  >
>;

export class AutomationStore {
  async list(params: { limit?: number; offset?: number } = {}): Promise<AutomationsListResponse> {
    const all = await readAll();
    const { limit = 50, offset = 0 } = params;
    return {
      automations: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  async get(id: string): Promise<Automation | null> {
    const all = await readAll();
    return all.find((a) => a.id === id) ?? null;
  }

  async create(data: AutomationCreateInput): Promise<Automation> {
    const now = new Date().toISOString();
    const trigger: AutomationTrigger =
      data.trigger ??
      ({
        type: "schedule",
        schedule: data.schedule ?? "0 9 * * *",
      } as AutomationTrigger);

    const automation: Automation = {
      id: crypto.randomUUID(),
      name: data.name,
      prompt: data.prompt,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      trigger,
      schedule: trigger.type === "schedule" ? (trigger.schedule ?? data.schedule ?? "0 9 * * *") : "",
      runs: [],
      timezone: data.timezone,
      model: data.model,
      mcpServerIds: data.mcpServerIds,
      webhookSecret: data.webhookSecret ?? (trigger.type === "event" ? crypto.randomUUID().slice(0, 16) : undefined),
      deliver: data.deliver,
      checkIn: data.checkIn,
      profileId: data.profileId ?? null,
    };
    syncScheduleFields(automation);

    const all = await readAll();
    all.push(automation);
    await writeAll(all);
    return automation;
  }

  async update(id: string, patch: AutomationUpdatePatch): Promise<Automation> {
    const all = await readAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Automation not found: ${id}`);

    const current = all[idx];
    if (typeof patch.name === "string") current.name = patch.name;
    if (typeof patch.prompt === "string") current.prompt = patch.prompt;
    if (typeof patch.enabled === "boolean") current.enabled = patch.enabled;
    if (typeof patch.timezone === "string") current.timezone = patch.timezone;
    if (typeof patch.model === "string") current.model = patch.model;
    if (Array.isArray(patch.mcpServerIds)) current.mcpServerIds = patch.mcpServerIds;
    if (typeof patch.webhookSecret === "string") current.webhookSecret = patch.webhookSecret;

    if (patch.trigger) {
      current.trigger = patch.trigger;
    } else if (typeof patch.schedule === "string") {
      current.trigger = {
        type: "schedule",
        schedule: patch.schedule,
      };
    }

    if ("deliver" in patch) {
      if (patch.deliver) current.deliver = patch.deliver;
      else delete current.deliver;
    }
    if (typeof patch.checkIn === "boolean") {
      if (patch.checkIn) current.checkIn = true;
      else delete current.checkIn;
    }
    if ("profileId" in patch) {
      current.profileId = patch.profileId ?? null;
    }

    syncScheduleFields(current);
    current.updatedAt = new Date().toISOString();
    current.runs = (await this.listRuns(id, { limit: MAX_EMBEDDED_RUNS })).runs;

    all[idx] = current;
    await writeAll(all);
    return current;
  }

  async delete(id: string): Promise<void> {
    const all = await readAll();
    await writeAll(all.filter((a) => a.id !== id));
    const runsIndex = await readRunsIndex();
    delete runsIndex[id];
    await writeRunsIndex(runsIndex);
  }

  async listRuns(
    id: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<AutomationRunsResponse> {
    const runsIndex = await readRunsIndex();
    const all = (runsIndex[id] ?? []).map(normalizeRun);
    const { limit = 50, offset = 0 } = params;
    return {
      runs: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  async recordRun(id: string, run: AutomationRun): Promise<void> {
    const normalized = normalizeRun(run);
    const runsIndex = await readRunsIndex();
    const list = runsIndex[id] ?? [];
    const existing = list.findIndex((r) => r.id === normalized.id);
    if (existing >= 0) list[existing] = normalized;
    else list.unshift(normalized);
    runsIndex[id] = list;
    await writeRunsIndex(runsIndex);

    const all = await readAll();
    const target = all.find((a) => a.id === id);
    if (!target) return;
    target.lastRun = normalized.startedAt;
    target.runs = list.slice(0, MAX_EMBEDDED_RUNS);
    target.updatedAt = new Date().toISOString();
    await writeAll(all);
  }
}

export const automationStore = new AutomationStore();
