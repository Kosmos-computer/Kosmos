/**
 * Automation persistence — a single JSON file holding all automations.
 * Scheduling itself lives in server/automations/scheduler.ts; this store is
 * pure data (agent-canvas separates these the same way: UI/API vs sidecar).
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { Automation, AutomationRun } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const MAX_RUNS = 20;
const FILE = path.join(dataDirs.root, "automations.json");

async function readAll(): Promise<Automation[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return JSON.parse(raw) as Automation[];
  } catch {
    return [];
  }
}

async function writeAll(automations: Automation[]): Promise<void> {
  await fs.mkdir(dataDirs.root, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(automations, null, 2), "utf-8");
}

export class AutomationStore {
  async list(): Promise<Automation[]> {
    return readAll();
  }

  async get(id: string): Promise<Automation | null> {
    return (await readAll()).find((a) => a.id === id) ?? null;
  }

  async create(data: Pick<Automation, "name" | "schedule" | "prompt">): Promise<Automation> {
    const automation: Automation = {
      id: crypto.randomUUID(),
      ...data,
      enabled: true,
      createdAt: new Date().toISOString(),
      runs: [],
    };
    const all = await readAll();
    all.push(automation);
    await writeAll(all);
    return automation;
  }

  async update(
    id: string,
    patch: Partial<Pick<Automation, "name" | "schedule" | "prompt" | "enabled">>,
  ): Promise<Automation> {
    const all = await readAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Automation not found: ${id}`);
    all[idx] = { ...all[idx], ...patch };
    await writeAll(all);
    return all[idx];
  }

  async delete(id: string): Promise<void> {
    const all = await readAll();
    await writeAll(all.filter((a) => a.id !== id));
  }

  async recordRun(id: string, run: AutomationRun): Promise<void> {
    const all = await readAll();
    const target = all.find((a) => a.id === id);
    if (!target) return;
    const existing = target.runs.findIndex((r) => r.id === run.id);
    if (existing >= 0) target.runs[existing] = run;
    else target.runs.unshift(run);
    while (target.runs.length > MAX_RUNS) target.runs.pop();
    target.lastRun = run.startedAt;
    await writeAll(all);
  }
}

export const automationStore = new AutomationStore();
