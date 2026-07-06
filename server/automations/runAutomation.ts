/**
 * Execute one automation run — shared by cron scheduler, manual dispatch,
 * and webhook ingress.
 */
import crypto from "node:crypto";
import type { AutomationRun } from "../../shared/types.js";
import { bus } from "../bus.js";
import { runAgentTurn } from "../agent/loop.js";
import { channelGateway } from "../channels/gateway.js";
import { automationStore } from "../stores/automationStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { broadcastShellEvent } from "../shellChannel.js";

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
      emit: () => {},
    });
    run.status = "ok";
    run.summary = finalText.slice(0, 500);

    if (automation.deliver && finalText.trim()) {
      try {
        await channelGateway.send(
          automation.deliver.channelId,
          automation.deliver.chatId,
          finalText,
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : "delivery failed";
        run.summary = `[delivery failed: ${reason}] ${run.summary}`.slice(0, 500);
      }
    }
  } catch (err) {
    run.status = "error";
    run.errorDetail = err instanceof Error ? err.message : "Automation run failed";
    run.summary = run.errorDetail;
  }

  run.finishedAt = new Date().toISOString();
  await automationStore.recordRun(id, run);

  broadcastShellEvent({
    type: "automation_run_finished",
    automationId: id,
    automationName: automation.name,
    status: run.status === "ok" ? "ok" : "error",
    summary: run.summary,
  });
  bus.emit("automations_changed");

  return run;
}
