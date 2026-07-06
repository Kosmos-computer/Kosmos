/**
 * Cron scheduler for automations — each schedule trigger runs the automation's
 * prompt through the agent loop headlessly. Event triggers are handled by the
 * webhook ingress in server/index.ts.
 */
import cron, { type ScheduledTask } from "node-cron";
import { bus } from "../bus.js";
import { automationStore } from "../stores/automationStore.js";
import { runAutomationNow } from "./runAutomation.js";

const tasks = new Map<string, ScheduledTask>();

export { runAutomationNow };

/** Rebuild all cron tasks from the store. Called at boot and on any change. */
export async function resyncSchedules(): Promise<void> {
  for (const task of tasks.values()) task.stop();
  tasks.clear();

  const { automations } = await automationStore.list({ limit: 10_000, offset: 0 });
  for (const automation of automations) {
    if (!automation.enabled) continue;
    if (automation.trigger.type !== "schedule") continue;
    const schedule = automation.trigger.schedule ?? automation.schedule;
    if (!schedule || !cron.validate(schedule)) {
      console.warn(`[scheduler] invalid cron "${schedule}" for ${automation.name}`);
      continue;
    }
    const task = cron.schedule(schedule, () => {
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
