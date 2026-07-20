/**
 * Execute one automation run — shared by cron scheduler, manual dispatch,
 * and webhook ingress.
 */
import crypto from "node:crypto";
import type { AutomationRun } from "../../shared/types.js";
import { bus } from "../bus.js";
import { pickTurnRunner, resolveAcpCommand, resolveTurnKind } from "../agent/turnRunner.js";
import { withProfileActivity } from "../agents/activity.js";
import { resolveProfileForTurn } from "../agents/resolveProfile.js";
import { channelGateway } from "../channels/gateway.js";
import { automationStore } from "../stores/automationStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { broadcastShellEvent } from "../shellChannel.js";

/** Silence tokens / empty replies for check-in automations (OpenClaw HEARTBEAT_OK). */
const CHECKIN_SILENCE = /^(CHECKIN_OK|HEARTBEAT_OK)\s*$/i;

function isQuietCheckIn(finalText: string): boolean {
  const trimmed = finalText.trim();
  return !trimmed || CHECKIN_SILENCE.test(trimmed);
}

export async function runAutomationNow(id: string): Promise<AutomationRun> {
  const automation = await automationStore.get(id);
  if (!automation) throw new Error(`Automation not found: ${id}`);

  const profile = resolveProfileForTurn({ profileId: automation.profileId });
  const session = await sessionStore.create("automation", `⚙ ${automation.name}`, {
    profileId: profile.id,
  });
  const run: AutomationRun = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    status: "running",
    summary: "",
    sessionId: session.id,
  };
  await automationStore.recordRun(id, run);

  try {
    const kind = resolveTurnKind(profile);
    const runner = pickTurnRunner(kind);
    const finalText = await withProfileActivity(profile.id, () =>
      runner({
        sessionId: session.id,
        userMessage: automation.prompt,
        emit: () => {},
        slot: "automations.chat",
        profileId: profile.id,
        ...(kind === "acp" ? { acpCommand: resolveAcpCommand(profile) } : {}),
      }),
    );
    run.status = "ok";
    run.summary = finalText.slice(0, 500);

    const quiet = Boolean(automation.checkIn) && isQuietCheckIn(finalText);
    if (quiet) {
      run.summary = "[quiet check-in]";
    } else if (automation.deliver && finalText.trim()) {
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

  broadcastShellEvent(
    {
      type: "automation_run_finished",
      automationId: id,
      automationName: automation.name,
      status: run.status === "ok" ? "ok" : "error",
      summary: run.summary,
    },
    session.id,
  );
  bus.emit("automations_changed");

  return run;
}
