import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, Globe, Play, Send, Trash2 } from "lucide-react";
import type { Automation, AutomationRun, ChannelInfo } from "@shared/types";
import { api } from "../../lib/api";
import { useWindowStore } from "../../os/windowStore";
import { useOsStore } from "../../os/osStore";
import { primeComposer } from "../chat/composerBus";
import { Button, Switch } from "../../components/ui";
import { describeSchedule, formatEventOn } from "./scheduleUtils";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EditAutomationModal } from "./EditAutomationModal";

function deliveryLabel(automation: Automation, channels: ChannelInfo[]): string | null {
  if (!automation.deliver) return null;
  const match = channels
    .filter((ch) => ch.config.enabled)
    .flatMap((ch) =>
      ch.peers.map((p) => ({
        value: `${ch.config.id}:${p.chatId}`,
        label: `${ch.config.name} · ${p.label}`,
      })),
    )
    .find((o) => o.value === `${automation.deliver?.channelId}:${automation.deliver?.chatId}`);
  return match?.label ?? automation.deliver.channelId;
}

function RunRow({ run }: { run: AutomationRun }) {
  const openWindow = useWindowStore((s) => s.open);
  return (
    <button
      type="button"
      className={`arco-run arco-run--${run.status === "ok" ? "ok" : run.status === "running" ? "running" : "error"}`}
      onClick={() => {
        openWindow({ type: "system", app: "chat" }, "Chat");
        primeComposer({
          text: `Show me what happened in automation run session ${run.sessionId}`,
          submit: false,
        });
      }}
    >
      {run.status} · {new Date(run.startedAt).toLocaleString()}
      {run.summary ? ` — ${run.summary.slice(0, 80)}` : ""}
    </button>
  );
}

export function AutomationDetailView({
  automationId,
  channels,
  onBack,
  onChanged,
}: {
  automationId: string;
  channels: ChannelInfo[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const notify = useOsStore((s) => s.notify);
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [runTotal, setRunTotal] = useState(0);
  const [runLimit, setRunLimit] = useState(20);
  const [running, setRunning] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [detail, history] = await Promise.all([
        api.getAutomation(automationId),
        api.listAutomationRuns(automationId, { limit: runLimit, offset: 0 }),
      ]);
      setAutomation(detail);
      setRuns(history.runs);
      setRunTotal(history.total);
    } catch {
      setAutomation(null);
    }
  }, [automationId, runLimit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!automation) {
    return (
      <div className="arco-module__inner">
        <Button onClick={onBack}>
          <ArrowLeft size={13} /> Back
        </Button>
        <p>Automation not found.</p>
      </div>
    );
  }

  const deliver = deliveryLabel(automation, channels);
  const scheduleLabel =
    automation.trigger.type === "event"
      ? `${automation.trigger.source ?? "event"} · ${formatEventOn(automation.trigger.on)}`
      : (automation.trigger.scheduleHuman ?? describeSchedule(automation.trigger.schedule ?? automation.schedule));

  return (
    <div className="arco-module__inner">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Button onClick={onBack}>
          <ArrowLeft size={13} /> Back
        </Button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="arco-module__title" style={{ margin: 0 }}>
            {automation.name}
          </h2>
          <p className="arco-module__subtitle">{scheduleLabel}</p>
        </div>
        <Switch
          checked={automation.enabled}
          aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
          onChange={() =>
            void api.updateAutomation(automation.id, { enabled: !automation.enabled }).then(() => {
              onChanged();
              void refresh();
            })
          }
        />
      </div>

      <section className="arco-module-card" style={{ marginBottom: 16 }}>
        <div className="arco-module-card__head">
          <span className="arco-module-card__icon" aria-hidden="true">
            {automation.trigger.type === "event" ? <Globe size={16} /> : <Clock size={16} />}
          </span>
          <div className="arco-module-card__body">
            <h3 className="arco-module-card__title">Configuration</h3>
            <div className="arco-module-card__meta">
              Created {new Date(automation.createdAt).toLocaleString()}
              {automation.lastRun ? ` · Last run ${new Date(automation.lastRun).toLocaleString()}` : " · Never run"}
            </div>
          </div>
        </div>
        <div className="arco-module-card__pills">
          <span className="arco-module-card__pill">{scheduleLabel}</span>
          {deliver ? (
            <span className="arco-module-card__pill">
              <Send size={10} style={{ verticalAlign: "-1px" }} /> {deliver}
            </span>
          ) : (
            <span className="arco-module-card__pill">In Arco only</span>
          )}
        </div>
        {automation.trigger.type === "event" ? (
          <p className="arco-module-card__desc">
            Webhook: <code>/api/webhooks/automations/{automation.id}</code>
            {automation.webhookSecret ? (
              <>
                {" "}
                · Header <code>X-Arco-Webhook-Signature: {automation.webhookSecret}</code>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="arco-module-card__desc">{automation.prompt}</p>
        <div className="arco-module-card__actions">
          <Button
            disabled={running || !automation.enabled}
            onClick={() => {
              setRunning(true);
              void api
                .runAutomation(automation.id)
                .then(() => {
                  notify(`Automation "${automation.name}" started`);
                  onChanged();
                  void refresh();
                })
                .catch((err) => notify(err instanceof Error ? err.message : "Run failed"))
                .finally(() => setRunning(false));
            }}
          >
            <Play size={13} /> {running ? "Running…" : "Run now"}
          </Button>
          <Button onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={13} />
          </Button>
        </div>
      </section>

      <section>
        <h3 className="arco-module__sectiontitle">Activity log</h3>
        {runs.length === 0 ? (
          <p className="arco-listrow__sub">No runs yet.</p>
        ) : (
          <div className="arco-runs">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
        {runTotal > runs.length ? (
          <Button style={{ marginTop: 8 }} onClick={() => setRunLimit((value) => value + 20)}>
            Load more runs
          </Button>
        ) : null}
      </section>

      <EditAutomationModal
        automation={automation}
        channels={channels}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          onChanged();
          void refresh();
        }}
      />

      <DeleteConfirmModal
        name={automation.name}
        open={deleteOpen}
        onConfirm={() => {
          void api.deleteAutomation(automation.id).then(() => {
            onChanged();
            onBack();
          });
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
