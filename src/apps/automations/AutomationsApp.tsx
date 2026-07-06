/**
 * Automations — primary dashboard (agent-canvas lesson: don't bury cron in
 * settings): search, grid/list toggle, active/inactive groups, run history,
 * and create form. The agent can also manage these via its automation tools.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock,
  LayoutGrid,
  List,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { Automation, ChannelInfo, DeliveryTarget } from "@shared/types";
import { api } from "../../lib/api";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";
import {
  ModuleCardGrid,
  ModuleHeader,
  ModuleInner,
  ModuleList,
  ModulePage,
  ModuleSection,
  ModuleToolbar,
} from "../../components/patterns/ModuleDashboard";
import { Button, EmptyState, Switch } from "../../components/ui";

type AutomationView = "grid" | "list";
const VIEW_KEY = "arco:automations-view";

function readView(): AutomationView {
  const stored = localStorage.getItem(VIEW_KEY);
  return stored === "list" ? "list" : "grid";
}

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

function parseTarget(value: string): DeliveryTarget | undefined {
  const idx = value.indexOf(":");
  if (idx <= 0) return undefined;
  return { channelId: value.slice(0, idx), chatId: value.slice(idx + 1) };
}

function ViewToggle({ view, onChange }: { view: AutomationView; onChange: (view: AutomationView) => void }) {
  return (
    <div className="arco-chip-row" role="group" aria-label="Automations view">
      <button
        type="button"
        className={`arco-chip${view === "grid" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
      >
        <LayoutGrid size={13} aria-hidden="true" /> Cards
      </button>
      <button
        type="button"
        className={`arco-chip${view === "list" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        <List size={13} aria-hidden="true" /> List
      </button>
    </div>
  );
}

function AutomationCard({
  automation,
  channels,
  runningId,
  onToggle,
  onRunNow,
  onDelete,
}: {
  automation: Automation;
  channels: ChannelInfo[];
  runningId: string | null;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const deliverLabel = automation.deliver
    ? deliveryOptions(channels).find(
        (o) => o.value === `${automation.deliver?.channelId}:${automation.deliver?.chatId}`,
      )?.label ?? automation.deliver.channelId
    : null;

  return (
    <article className="arco-module-card">
      <div className="arco-module-card__head">
        <span className="arco-module-card__icon" aria-hidden="true">
          <Clock size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{automation.name}</h3>
          <div className="arco-module-card__meta">
            <code>{automation.schedule}</code>
            {automation.lastRun
              ? ` · last run ${new Date(automation.lastRun).toLocaleString()}`
              : " · never run"}
          </div>
        </div>
        <div className="arco-module-card__actions">
          <Switch
            checked={automation.enabled}
            aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
            onChange={onToggle}
          />
        </div>
      </div>
      <p className="arco-module-card__desc">{automation.prompt}</p>
      <div className="arco-module-card__pills">
        {deliverLabel ? (
          <span className="arco-module-card__pill">
            <Send size={10} style={{ verticalAlign: "-1px" }} /> {deliverLabel}
          </span>
        ) : (
          <span className="arco-module-card__pill">In Arco only</span>
        )}
      </div>
      <div className="arco-module-card__actions">
        <Button disabled={runningId === automation.id} onClick={onRunNow}>
          <Play size={13} /> {runningId === automation.id ? "Running…" : "Run now"}
        </Button>
        <Button variant="danger" onClick={onDelete} aria-label={`Delete ${automation.name}`}>
          <Trash2 size={13} />
        </Button>
      </div>
      {automation.runs.length > 0 ? (
        <div className="arco-runs">
          {automation.runs.slice(0, 5).map((run) => (
            <RunChip key={run.id} run={run} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function AutomationListRow({
  automation,
  channels,
  runningId,
  onToggle,
  onRunNow,
  onDelete,
}: {
  automation: Automation;
  channels: ChannelInfo[];
  runningId: string | null;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const deliverLabel = automation.deliver
    ? deliveryOptions(channels).find(
        (o) => o.value === `${automation.deliver?.channelId}:${automation.deliver?.chatId}`,
      )?.label ?? automation.deliver.channelId
    : null;

  return (
    <div className="arco-listrow">
      <Switch
        checked={automation.enabled}
        aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
        onChange={onToggle}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{automation.name}</div>
        <div className="arco-listrow__sub">
          <code>{automation.schedule}</code>
          {automation.lastRun
            ? ` · last run ${new Date(automation.lastRun).toLocaleString()}`
            : " · never run"}
          {deliverLabel ? (
            <span>
              {" · "}
              <Send size={10} style={{ verticalAlign: "-1px" }} /> {deliverLabel}
            </span>
          ) : null}
        </div>
        <div className="arco-listrow__sub" style={{ whiteSpace: "normal" }}>
          {automation.prompt}
        </div>
        {automation.runs.length > 0 ? (
          <div className="arco-runs">
            {automation.runs.slice(0, 5).map((run) => (
              <RunChip key={run.id} run={run} />
            ))}
          </div>
        ) : null}
      </div>
      <Button disabled={runningId === automation.id} onClick={onRunNow}>
        <Play size={13} /> {runningId === automation.id ? "Running…" : "Run now"}
      </Button>
      <Button variant="danger" onClick={onDelete} aria-label={`Delete ${automation.name}`}>
        <Trash2 size={13} />
      </Button>
    </div>
  );
}

function RunChip({ run }: { run: Automation["runs"][number] }) {
  const openWindow = useWindowStore((s) => s.open);
  return (
    <button
      type="button"
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
  );
}

function AutomationGroup({
  title,
  automations,
  view,
  channels,
  runningId,
  onToggle,
  onRunNow,
  onDelete,
}: {
  title: string;
  automations: Automation[];
  view: AutomationView;
  channels: ChannelInfo[];
  runningId: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (automations.length === 0) return null;

  return (
    <ModuleSection title={title} count={automations.length}>
      {view === "grid" ? (
        <ModuleCardGrid>
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              channels={channels}
              runningId={runningId}
              onToggle={() => onToggle(automation.id, !automation.enabled)}
              onRunNow={() => onRunNow(automation.id)}
              onDelete={() => onDelete(automation.id)}
            />
          ))}
        </ModuleCardGrid>
      ) : (
        <ModuleList>
          {automations.map((automation) => (
            <AutomationListRow
              key={automation.id}
              automation={automation}
              channels={channels}
              runningId={runningId}
              onToggle={() => onToggle(automation.id, !automation.enabled)}
              onRunNow={() => onRunNow(automation.id)}
              onDelete={() => onDelete(automation.id)}
            />
          ))}
        </ModuleList>
      )}
    </ModuleSection>
  );
}

export function AutomationsApp() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<AutomationView>(() => readView());
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", schedule: "0 9 * * *", prompt: "", deliver: "" });
  const [runningId, setRunningId] = useState<string | null>(null);

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
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return automations;
    return automations.filter(
      (automation) =>
        automation.name.toLowerCase().includes(normalized) ||
        automation.prompt.toLowerCase().includes(normalized) ||
        automation.schedule.toLowerCase().includes(normalized),
    );
  }, [automations, search]);

  const active = useMemo(() => filtered.filter((automation) => automation.enabled), [filtered]);
  const inactive = useMemo(() => filtered.filter((automation) => !automation.enabled), [filtered]);

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

  const handleViewChange = (next: AutomationView) => {
    localStorage.setItem(VIEW_KEY, next);
    setView(next);
  };

  return (
    <div className="arco-panel" style={{ padding: 0 }}>
      <ModulePage>
        <ModuleInner>
          <ModuleHeader
            title="Automations"
            subtitle="Scheduled agent runs on a cron. Each automation gets only its prompt — no chat history — and can optionally deliver results to a channel."
            actions={
              <Button variant="primary" onClick={() => setCreating((value) => !value)}>
                <Plus size={13} /> New
              </Button>
            }
          />

          {creating ? (
            <div className="arco-form">
              <label className="arco-label" htmlFor="auto-name">
                Name
              </label>
              <input
                id="auto-name"
                className="arco-input"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Morning briefing"
              />
              <label className="arco-label" htmlFor="auto-schedule">
                Schedule (cron)
              </label>
              <input
                id="auto-schedule"
                className="arco-input"
                value={form.schedule}
                onChange={(e) => setForm((current) => ({ ...current, schedule: e.target.value }))}
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
                onChange={(e) => setForm((current) => ({ ...current, prompt: e.target.value }))}
                placeholder="Update app <id> with today's weather for Berlin…"
              />
              {deliveryOptions(channels).length > 0 ? (
                <>
                  <label className="arco-label" htmlFor="auto-deliver">
                    Deliver result to
                  </label>
                  <select
                    id="auto-deliver"
                    className="arco-input"
                    value={form.deliver}
                    onChange={(e) => setForm((current) => ({ ...current, deliver: e.target.value }))}
                  >
                    <option value="">In Arco only</option>
                    {deliveryOptions(channels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" onClick={() => void create()}>
                  Create
                </Button>
                <Button onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          ) : null}

          {automations.length > 0 ? (
            <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search automations">
              <ViewToggle view={view} onChange={handleViewChange} />
            </ModuleToolbar>
          ) : null}

          {automations.length === 0 && !creating ? (
            <EmptyState title="No automations yet">
              <CalendarClock size={22} />
              <span>
                Create one here, or ask Arco: “every morning at 9, update my dashboard”.
              </span>
            </EmptyState>
          ) : null}

          {filtered.length === 0 && automations.length > 0 ? (
            <EmptyState title="No matching automations">Try a different search term.</EmptyState>
          ) : null}

          <AutomationGroup
            title="Active"
            automations={active}
            view={view}
            channels={channels}
            runningId={runningId}
            onToggle={(id, enabled) => void api.updateAutomation(id, { enabled }).then(refresh)}
            onRunNow={(id) => void runNow(id)}
            onDelete={(id) => void api.deleteAutomation(id).then(refresh)}
          />

          <AutomationGroup
            title="Inactive"
            automations={inactive}
            view={view}
            channels={channels}
            runningId={runningId}
            onToggle={(id, enabled) => void api.updateAutomation(id, { enabled }).then(refresh)}
            onRunNow={(id) => void runNow(id)}
            onDelete={(id) => void api.deleteAutomation(id).then(refresh)}
          />
        </ModuleInner>
      </ModulePage>
    </div>
  );
}
