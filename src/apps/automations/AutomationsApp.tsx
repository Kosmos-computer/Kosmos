/**
 * Automations — primary dashboard (OpenHands agent-canvas parity): search,
 * grid/list, active/inactive groups, detail view, recommended presets,
 * chat-first creation, run history, and channel delivery.
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
import type { Automation, ChannelInfo, DeliveryTarget, McpServerInfo } from "@shared/types";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
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
import { AutomationDetailView } from "./AutomationDetailView";
import { CreateInstructionsModal } from "./CreateInstructionsModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { EditAutomationModal } from "./EditAutomationModal";
import { RecommendedAutomationsSection } from "./RecommendedAutomationsSection";
import { describeSchedule, formatEventOn } from "./scheduleUtils";

type AutomationView = "grid" | "list";
const VIEW_KEY = "arco:automations-view";
const PAGE_SIZE = 50;

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

function triggerLabel(automation: Automation): string {
  if (automation.trigger.type === "event") {
    return `${automation.trigger.source ?? "event"} · ${formatEventOn(automation.trigger.on)}`;
  }
  return automation.trigger.scheduleHuman ?? describeSchedule(automation.trigger.schedule ?? automation.schedule);
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
  onOpen,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: {
  automation: Automation;
  channels: ChannelInfo[];
  runningId: string | null;
  onOpen: () => void;
  onToggle: () => void;
  onRunNow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deliverLabel = automation.deliver
    ? deliveryOptions(channels).find(
        (o) => o.value === `${automation.deliver?.channelId}:${automation.deliver?.chatId}`,
      )?.label ?? automation.deliver.channelId
    : null;

  return (
    <article className="arco-module-card">
      <button type="button" className="arco-module-card__head" style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", padding: 0 }} onClick={onOpen}>
        <span className="arco-module-card__icon" aria-hidden="true">
          <Clock size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{automation.name}</h3>
          <div className="arco-module-card__meta">
            <code>{triggerLabel(automation)}</code>
            {automation.lastRun
              ? ` · last run ${new Date(automation.lastRun).toLocaleString()}`
              : " · never run"}
          </div>
        </div>
      </button>
      <div className="arco-module-card__actions" style={{ justifyContent: "flex-end" }}>
        <Switch
          checked={automation.enabled}
          aria-label={`${automation.enabled ? "Disable" : "Enable"} ${automation.name}`}
          onChange={onToggle}
        />
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
        <Button onClick={onEdit}>Edit</Button>
        <Button variant="danger" onClick={onDelete} aria-label={`Delete ${automation.name}`}>
          <Trash2 size={13} />
        </Button>
      </div>
    </article>
  );
}

function AutomationListRow({
  automation,
  channels,
  runningId,
  onOpen,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: {
  automation: Automation;
  channels: ChannelInfo[];
  runningId: string | null;
  onOpen: () => void;
  onToggle: () => void;
  onRunNow: () => void;
  onEdit: () => void;
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
      <button type="button" style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, cursor: "pointer", color: "inherit" }} onClick={onOpen}>
        <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{automation.name}</div>
        <div className="arco-listrow__sub">
          <code>{triggerLabel(automation)}</code>
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
      </button>
      <Button disabled={runningId === automation.id} onClick={onRunNow}>
        <Play size={13} /> {runningId === automation.id ? "Running…" : "Run now"}
      </Button>
      <Button onClick={onEdit}>Edit</Button>
      <Button variant="danger" onClick={onDelete} aria-label={`Delete ${automation.name}`}>
        <Trash2 size={13} />
      </Button>
    </div>
  );
}

function AutomationGroup({
  title,
  automations,
  view,
  channels,
  runningId,
  onOpen,
  onToggle,
  onRunNow,
  onEdit,
  onDelete,
}: {
  title: string;
  automations: Automation[];
  view: AutomationView;
  channels: ChannelInfo[];
  runningId: string | null;
  onOpen: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onRunNow: (id: string) => void;
  onEdit: (automation: Automation) => void;
  onDelete: (id: string, name: string) => void;
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
              onOpen={() => onOpen(automation.id)}
              onToggle={() => onToggle(automation.id, !automation.enabled)}
              onRunNow={() => onRunNow(automation.id)}
              onEdit={() => onEdit(automation)}
              onDelete={() => onDelete(automation.id, automation.name)}
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
              onOpen={() => onOpen(automation.id)}
              onToggle={() => onToggle(automation.id, !automation.enabled)}
              onRunNow={() => onRunNow(automation.id)}
              onEdit={() => onEdit(automation)}
              onDelete={() => onDelete(automation.id, automation.name)}
            />
          ))}
        </ModuleList>
      )}
    </ModuleSection>
  );
}

export function AutomationsApp() {
  const notify = useOsStore((s) => s.notify);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerInfo[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<AutomationView>(() => readView());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Automation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState(true);
  const [form, setForm] = useState({ name: "", schedule: "0 9 * * *", prompt: "", deliver: "" });

  const refresh = useCallback(async () => {
    try {
      const [health, list, channelList, mcpList] = await Promise.all([
        api.automationHealth(),
        api.listAutomations({ limit, offset: 0 }),
        api.listChannels(),
        api.listMcpServers(),
      ]);
      setHealthOk(health.status === "ok");
      setAutomations(list.automations);
      setTotal(list.total);
      setChannels(channelList);
      setMcpServers(mcpList);
    } catch {
      setHealthOk(false);
    }
  }, [limit]);

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
        triggerLabel(automation).toLowerCase().includes(normalized),
    );
  }, [automations, search]);

  const active = useMemo(() => filtered.filter((automation) => automation.enabled), [filtered]);
  const inactive = useMemo(() => filtered.filter((automation) => !automation.enabled), [filtered]);

  const createAdvanced = useCallback(async () => {
    if (!form.name.trim() || !form.prompt.trim()) return;
    const deliver = parseTarget(form.deliver);
    await api.createAutomation({
      name: form.name,
      schedule: form.schedule,
      prompt: form.prompt,
      ...(deliver ? { deliver } : {}),
    });
    setForm({ name: "", schedule: "0 9 * * *", prompt: "", deliver: "" });
    setAdvancedOpen(false);
    void refresh();
  }, [form, refresh]);

  const runNow = useCallback(
    async (id: string) => {
      setRunningId(id);
      try {
        await api.runAutomation(id);
        notify("Automation run started");
      } catch (err) {
        notify(err instanceof Error ? err.message : "Run failed");
      } finally {
        setRunningId(null);
        void refresh();
      }
    },
    [notify, refresh],
  );

  const handleViewChange = (next: AutomationView) => {
    localStorage.setItem(VIEW_KEY, next);
    setView(next);
  };

  if (detailId) {
    return (
      <div className="arco-panel" style={{ padding: 0 }}>
        <ModulePage>
          <AutomationDetailView
            automationId={detailId}
            channels={channels}
            onBack={() => setDetailId(null)}
            onChanged={() => void refresh()}
          />
        </ModulePage>
      </div>
    );
  }

  return (
    <div className="arco-panel" style={{ padding: 0 }}>
      <ModulePage>
        <ModuleInner>
          <ModuleHeader
            title="Automations"
            subtitle="Scheduled and event-triggered agent runs. Each automation gets only its prompt — no chat history — and can deliver results to a channel."
            actions={
              <>
                <Button onClick={() => setAdvancedOpen((value) => !value)}>Advanced</Button>
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus size={13} /> New
                </Button>
              </>
            }
          />

          {!healthOk ? (
            <EmptyState title="Automations unavailable">
              <span>The automation service is not reachable. Check that the server is running.</span>
              <Button onClick={() => void refresh()}>Retry</Button>
            </EmptyState>
          ) : null}

          <CreateInstructionsModal open={createOpen} onClose={() => setCreateOpen(false)} />

          {advancedOpen ? (
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
                Prompt
              </label>
              <textarea
                id="auto-prompt"
                className="arco-input"
                rows={3}
                value={form.prompt}
                onChange={(e) => setForm((current) => ({ ...current, prompt: e.target.value }))}
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
                <Button variant="primary" onClick={() => void createAdvanced()}>
                  Create
                </Button>
                <Button onClick={() => setAdvancedOpen(false)}>Cancel</Button>
              </div>
            </div>
          ) : null}

          {healthOk && automations.length > 0 ? (
            <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search automations">
              <ViewToggle view={view} onChange={handleViewChange} />
            </ModuleToolbar>
          ) : null}

          {healthOk && automations.length === 0 && !advancedOpen ? (
            <EmptyState title="No automations yet">
              <CalendarClock size={22} />
              <span>Create one with New, pick a recommended preset, or ask in chat.</span>
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create in chat
              </Button>
            </EmptyState>
          ) : null}

          {healthOk && filtered.length === 0 && automations.length > 0 ? (
            <EmptyState title="No matching automations">Try a different search term.</EmptyState>
          ) : null}

          {healthOk ? (
            <>
              <AutomationGroup
                title="Active"
                automations={active}
                view={view}
                channels={channels}
                runningId={runningId}
                onOpen={setDetailId}
                onToggle={(id, enabled) => void api.updateAutomation(id, { enabled }).then(refresh)}
                onRunNow={(id) => void runNow(id)}
                onEdit={setEditTarget}
                onDelete={(id, name) => setDeleteTarget({ id, name })}
              />
              <AutomationGroup
                title="Inactive"
                automations={inactive}
                view={view}
                channels={channels}
                runningId={runningId}
                onOpen={setDetailId}
                onToggle={(id, enabled) => void api.updateAutomation(id, { enabled }).then(refresh)}
                onRunNow={(id) => void runNow(id)}
                onEdit={setEditTarget}
                onDelete={(id, name) => setDeleteTarget({ id, name })}
              />
              {total > automations.length ? (
                <Button onClick={() => setLimit((value) => value + PAGE_SIZE)}>Load more</Button>
              ) : null}
              <RecommendedAutomationsSection query={search} mcpServers={mcpServers} />
            </>
          ) : null}

          {editTarget ? (
            <EditAutomationModal
              automation={editTarget}
              channels={channels}
              open={editTarget !== null}
              onClose={() => setEditTarget(null)}
              onSaved={() => void refresh()}
            />
          ) : null}

          <DeleteConfirmModal
            name={deleteTarget?.name ?? ""}
            open={deleteTarget !== null}
            onConfirm={() => {
              if (!deleteTarget) return;
              void api.deleteAutomation(deleteTarget.id).then(() => {
                setDeleteTarget(null);
                void refresh();
              });
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        </ModuleInner>
      </ModulePage>
    </div>
  );
}
