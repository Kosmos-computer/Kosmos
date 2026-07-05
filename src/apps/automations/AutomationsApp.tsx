/**
 * Automations — a primary surface (agent-canvas lesson: don't bury cron in
 * settings): list with enable toggles, run-now, run history, and a create
 * form. The agent can also manage these via its automation tools.
 */
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Play, Plus, Send, Trash2 } from "lucide-react";
import type { Automation, ChannelInfo, DeliveryTarget } from "@shared/types";
import { api } from "../../lib/api";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";

/**
 * Delivery destinations flattened for a <select>: every approved chat of
 * every enabled channel, encoded as "channelId:chatId" option values.
 */
function deliveryOptions(channels: ChannelInfo[]): { value: string; label: string }[] {
  return channels
    .filter((ch) => ch.config.enabled)
    .flatMap((ch) =>
      ch.peers.map((p) => ({
        value: `${ch.config.id}:${p.chatId}`,
        label: `${ch.config.name} · ${p.label}`,
      })),
    );
}

/** "channelId:chatId" ⇄ DeliveryTarget. Chat ids never contain ":". */
function parseTarget(value: string): DeliveryTarget | undefined {
  const idx = value.indexOf(":");
  if (idx <= 0) return undefined;
  return { channelId: value.slice(0, idx), chatId: value.slice(idx + 1) };
}

export function AutomationsApp() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", schedule: "0 9 * * *", prompt: "", deliver: "" });
  const [runningId, setRunningId] = useState<string | null>(null);
  const openWindow = useWindowStore((s) => s.open);

  const refresh = useCallback(async () => {
    try {
      setAutomations(await api.listAutomations());
      setChannels(await api.listChannels());
    } catch {
      // Server unreachable — keep stale list.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const create = useCallback(async () => {
    if (!form.name.trim() || !form.prompt.trim()) return;
    const deliver = parseTarget(form.deliver);
    await api.createAutomation({
      name: form.name,
      schedule: form.schedule,
      prompt: form.prompt,
      ...(deliver ? { deliver } : {}),
    });
    setForm({ name: "", schedule: "0 9 * * *", prompt: "", deliver: "" });
    setCreating(false);
    void refresh();
  }, [form, refresh]);

  const runNow = useCallback(
    async (id: string) => {
      setRunningId(id);
      try {
        await api.runAutomation(id);
      } finally {
        setRunningId(null);
        void refresh();
      }
    },
    [refresh],
  );

  return (
    <div className="arco-panel arco-scroll">
      <div className="arco-panel__header">
        <strong>Automations</strong>
        <button className="arco-btn arco-btn--primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={13} /> New
        </button>
      </div>

      {creating && (
        <div className="arco-form">
          <label className="arco-label" htmlFor="auto-name">
            Name
          </label>
          <input
            id="auto-name"
            className="arco-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Morning briefing"
          />
          <label className="arco-label" htmlFor="auto-schedule">
            Schedule (cron)
          </label>
          <input
            id="auto-schedule"
            className="arco-input"
            value={form.schedule}
            onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
            placeholder="0 9 * * *"
          />
          <label className="arco-label" htmlFor="auto-prompt">
            Prompt (the automation's only context)
          </label>
          <textarea
            id="auto-prompt"
            className="arco-input"
            rows={3}
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            placeholder="Update app <id> with today's weather for Berlin…"
          />
          {deliveryOptions(channels).length > 0 && (
            <>
              <label className="arco-label" htmlFor="auto-deliver">
                Deliver result to
              </label>
              <select
                id="auto-deliver"
                className="arco-input"
                value={form.deliver}
                onChange={(e) => setForm((f) => ({ ...f, deliver: e.target.value }))}
              >
                <option value="">In Arco only</option>
                {deliveryOptions(channels).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="arco-btn arco-btn--primary" onClick={() => void create()}>
              Create
            </button>
            <button className="arco-btn" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {automations.length === 0 && !creating && (
        <div className="arco-empty">
          <CalendarClock size={22} />
          <span>
            No automations. Create one here, or ask Arco: “every morning at 9, update my dashboard”.
          </span>
        </div>
      )}

      {automations.map((a) => (
        <div key={a.id} className="arco-card">
          <div className="arco-listrow" style={{ border: "none", padding: 0 }}>
            <label className="arco-switch">
              <input
                type="checkbox"
                checked={a.enabled}
                onChange={() =>
                  void api.updateAutomation(a.id, { enabled: !a.enabled }).then(refresh)
                }
                aria-label={`${a.enabled ? "Disable" : "Enable"} ${a.name}`}
              />
              <span className="arco-switch__track" />
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{a.name}</div>
              <div className="arco-listrow__sub">
                <code>{a.schedule}</code>
                {a.lastRun ? ` · last run ${new Date(a.lastRun).toLocaleString()}` : " · never run"}
                {a.deliver && (
                  <span title={`Delivers to ${a.deliver.channelId}`}>
                    {" · "}
                    <Send size={10} style={{ verticalAlign: "-1px" }} />{" "}
                    {deliveryOptions(channels).find(
                      (o) => o.value === `${a.deliver?.channelId}:${a.deliver?.chatId}`,
                    )?.label ?? a.deliver.channelId}
                  </span>
                )}
              </div>
            </div>
            <button
              className="arco-btn"
              disabled={runningId === a.id}
              onClick={() => void runNow(a.id)}
            >
              <Play size={13} /> {runningId === a.id ? "Running…" : "Run now"}
            </button>
            <button
              className="arco-btn arco-btn--danger"
              onClick={() => void api.deleteAutomation(a.id).then(refresh)}
              aria-label={`Delete ${a.name}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="arco-listrow__sub" style={{ marginTop: 6 }}>{a.prompt}</div>
          {a.runs.length > 0 && (
            <div className="arco-runs">
              {a.runs.slice(0, 5).map((run) => (
                <button
                  key={run.id}
                  className={`arco-run arco-run--${run.status}`}
                  title={run.summary || run.status}
                  onClick={() => {
                    openWindow({ type: "system", app: "chat" }, "Chat");
                    primeComposer({
                      text: `Show me what happened in automation run session ${run.sessionId}`,
                      submit: false,
                    });
                  }}
                >
                  {run.status} · {new Date(run.startedAt).toLocaleTimeString()}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
