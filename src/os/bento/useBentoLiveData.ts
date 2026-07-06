/**
 * Live data for bento widgets — polls Arco APIs so cards can demo real connectivity.
 * STUB boundary: swap fetch intervals or add SSE when widget APIs stabilize.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useOsStore } from "../osStore";
import type { BentoLiveSnapshot, BentoWidgetContent } from "./types";

function useClockValue(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function useBentoLiveData(): BentoLiveSnapshot {
  const appCount = useOsStore((s) => s.apps.length + s.webApps.length + s.installedApps.length);
  const agentBusy = useOsStore((s) => s.agentBusy);
  const clock = useClockValue();
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [automationCount, setAutomationCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const [sessions, automations] = await Promise.all([api.listSessions(), api.listAutomations()]);
        if (cancelled) return;
        setSessionCount(sessions.length);
        setAutomationCount(automations.total);
      } catch {
        if (!cancelled) {
          setSessionCount((prev) => prev ?? 0);
          setAutomationCount((prev) => prev ?? 0);
        }
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return useMemo(
    () => ({
      apps: {
        label: "Installed apps",
        value: String(appCount),
        meta: "Generated + web + installed",
        tone: "accent" as const,
      },
      sessions: {
        label: "Sessions",
        value: sessionCount === null ? "…" : String(sessionCount),
        meta: "From /api/sessions",
        tone: "default" as const,
      },
      automations: {
        label: "Automations",
        value: automationCount === null ? "…" : String(automationCount),
        meta: "From /api/automations",
        tone: "default" as const,
      },
      agent: {
        label: "Agent",
        value: agentBusy ? "Working" : "Idle",
        meta: agentBusy ? "Turn in progress" : "Ready for requests",
        tone: agentBusy ? ("warning" as const) : ("success" as const),
      },
      clock: {
        label: "Local time",
        value: clock,
        meta: new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      },
    }),
    [agentBusy, appCount, automationCount, clock, sessionCount],
  );
}

export function resolveBentoContent(
  content: BentoWidgetContent,
  live: BentoLiveSnapshot,
): BentoWidgetContent {
  if (!content.liveKey) return content;
  const snapshot = live[content.liveKey];
  return {
    ...content,
    ...snapshot,
    kind: content.kind,
    liveKey: content.liveKey,
    percent: content.percent,
  };
}
