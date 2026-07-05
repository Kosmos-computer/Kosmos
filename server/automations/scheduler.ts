/**
 * Cron scheduler for automations — the deterministic "Flows for automations"
 * shape: each firing runs the automation's prompt through the same agent loop
 * as chat, headlessly, in a fresh automation-kind session (its prompt is its
 * only context). Run history is capped and browsable in the Automations app.
 */
import cron, { type ScheduledTask } from "node-cron";
import crypto from "node:crypto";
import type { AutomationRun } from "../../shared/types.js";
import { bus } from "../bus.js";
import { runAgentTurn } from "../agent/loop.js";
import { automationStore } from "../stores/automationStore.js";
import { sessionStore } from "../stores/sessionStore.js";

const tasks = new Map<string, ScheduledTask>();

export async function runAutomationNow(id: string): Promise<AutomationRun> {
  const automation = await automationStore.get(id);
  if (!automation) throw new Error(`Automation not found: ${id}`);

  const session = await sessionStore.create("automation", `⚙ ${automation.name}`);
  const run: AutomationRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    status: "running",
    summary: "",
    sessionId: session.id,
  };
  await automationStore.recordRun(id, run);

  try {
    const finalText = await runAgentTurn({
      sessionId: session.id,
      userMessage: automation.prompt,
      emit: () => {}, // headless — no client attached
    });
    run.status = "ok";
    run.summary = finalText.slice(0, 500);
  } catch (err) {
    run.status = "error";
    run.summary = err instanceof Error ? err.message : "Automation run failed";
  }
  run.finishedAt = new Date().toISOString();
  await automationStore.recordRun(id, run);
  return run;
}

/** Rebuild all cron tasks from the store. Called at boot and on any change. */
export async function resyncSchedules(): Promise<void> {
  for (const task of tasks.values()) task.stop();
  tasks.clear();

  const automations = await automationStore.list();
  for (const automation of automations) {
    if (!automation.enabled) continue;
    if (!cron.validate(automation.schedule)) {
      console.warn(`[scheduler] invalid cron "${automation.schedule}" for ${automation.name}`);
      continue;
    }
    const task = cron.schedule(automation.schedule, () => {
      runAutomationNow(automation.id).catch((err) =>
        console.error(`[scheduler] run failed for ${automation.name}:`, err),
      );
    });
    tasks.set(automation.id, task);
  }
  console.log(`[scheduler] ${tasks.size} automation(s) scheduled`);
}

export function startScheduler(): void {
  bus.on("automations_changed", () => {
    resyncSchedules().catch((err) => console.error("[scheduler] resync failed:", err));
  });
  resyncSchedules().catch((err) => console.error("[scheduler] initial sync failed:", err));
}
