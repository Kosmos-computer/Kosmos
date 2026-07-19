import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Agents — manager surface for orchestrating agent profiles. Card grid with
 * search/filters; each agent opens a tabbed profile (avatar, models, memory,
 * documents, access). Wired to /api/agents via useAgents.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import {
  ModuleCardGrid,
  ModuleFilterSelect,
  ModuleHeader,
  ModuleInner,
  ModulePage,
  ModuleSection,
  ModuleToolbar,
} from "../../components/patterns/ModuleDashboard";
import { Button, EmptyState, Input, Switch } from "../../components/ui";
import { AgentAvatar } from "./AgentAvatar";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { ContentPackPanel } from "./ContentPackPanel";
import { filterAgents, runtimeLabel } from "./agentFilters";
import type { AgentProfile, AgentRuntimeFilter, AgentStatusFilter } from "./types";
import { useAgents, type AgentsViewModel } from "./useAgents";

const RUNTIME_FILTERS: { id: AgentRuntimeFilter; labelKey: I18nKey }[] = [
  { id: "all", labelKey: I18nKey.APPS$AGENTS_FILTER_ALL },
  { id: "builtin", labelKey: I18nKey.APPS$AGENTS_FILTER_BUILTIN },
  { id: "acp", labelKey: I18nKey.APPS$AGENTS_FILTER_ACP },
  { id: "cursor", labelKey: I18nKey.APPS$AGENTS_FILTER_CURSOR },
  { id: "automation", labelKey: I18nKey.APPS$AGENTS_FILTER_AUTOMATION },
  { id: "channel", labelKey: I18nKey.APPS$AGENTS_FILTER_CHANNEL },
];

const STATUS_FILTERS: { id: AgentStatusFilter; labelKey: I18nKey }[] = [
  { id: "all", labelKey: I18nKey.APPS$AGENTS_STATUS_ALL },
  { id: "enabled", labelKey: I18nKey.APPS$AGENTS_STATUS_ENABLED },
  { id: "running", labelKey: I18nKey.APPS$AGENTS_STATUS_RUNNING },
  { id: "disabled", labelKey: I18nKey.APPS$AGENTS_STATUS_DISABLED },
];

function AgentCard({
  agent,
  onOpen,
  onToggle,
}: {
  agent: AgentProfile;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={[
        "arco-module-card",
        "arco-agents-card",
        !agent.enabled && "arco-module-card--disabled",
        agent.status === "running" && "arco-agents-card--running",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
    >
      <div className="arco-module-card__head">
        <AgentAvatar avatar={agent.avatar} name={agent.name} size="md" status={agent.status} />
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{agent.name}</h3>
          <div className="arco-module-card__meta">{runtimeLabel(agent.runtime)}</div>
        </div>
        <div className="arco-module-card__actions">
          <Switch
            checked={agent.enabled}
            aria-label={agent.enabled ? `Disable ${agent.name}` : `Enable ${agent.name}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </div>
      </div>
      {agent.tagline ? <p className="arco-module-card__desc">{agent.tagline}</p> : null}
    </button>
  );
}

function CreateAgentPanel({
  vm,
  onCancel,
}: {
  vm: AgentsViewModel;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const create = () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    void vm
      .createAgent({
        name,
        tagline,
        description,
        avatar: { kind: "emoji", value: "✦", color: "accent" },
      })
      .then(() => onCancel())
      .finally(() => setSaving(false));
  };

  return (
    <div className="arco-form arco-agents-create">
      <label className="arco-label" htmlFor="agent-create-name"><T k={I18nKey.APPS$AGENTS_NAME} /></label>
      <Input
        id="agent-create-name"
        width="auto"
        placeholder={i18n.t(I18nKey.APPS$AGENTS_CREATE_NAME_PLACEHOLDER)}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="arco-label" htmlFor="agent-create-tagline"><T k={I18nKey.APPS$AGENTS_TAGLINE} /></label>
      <Input
        id="agent-create-tagline"
        width="auto"
        placeholder={i18n.t(I18nKey.APPS$AGENTS_CREATE_TAGLINE_PLACEHOLDER)}
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
      />
      <label className="arco-label" htmlFor="agent-create-desc"><T k={I18nKey.APPS$AGENTS_DESCRIPTION} /></label>
      <textarea
        id="agent-create-desc"
        className="arco-input arco-settings-log"
        rows={3}
        placeholder={i18n.t(I18nKey.APPS$AGENTS_CREATE_DESC_PLACEHOLDER)}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="arco-agents-detail__actions">
        <Button variant="primary" disabled={!name.trim() || saving} onClick={create}>
          <T k={I18nKey.COMMON$CREATE} />
        </Button>
        <Button onClick={onCancel}><T k={I18nKey.COMMON$CANCEL} /></Button>
      </div>
    </div>
  );
}

export function AgentsApp() {
  const { t } = useTranslation();
  const vm = useAgents();
  const [search, setSearch] = useState("");
  const [runtimeFilter, setRuntimeFilter] = useState<AgentRuntimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AgentStatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(
    () => filterAgents(vm.agents, search, runtimeFilter, statusFilter),
    [vm.agents, search, runtimeFilter, statusFilter],
  );

  const running = useMemo(() => filtered.filter((a) => a.status === "running"), [filtered]);
  const active = useMemo(
    () => filtered.filter((a) => a.enabled && a.status !== "running"),
    [filtered],
  );
  const inactive = useMemo(() => filtered.filter((a) => !a.enabled), [filtered]);

  const renderGroup = (titleKey: I18nKey, agents: AgentProfile[]) => {
    if (agents.length === 0) return null;
    return (
      <ModuleSection titleKey={titleKey} count={agents.length}>
        <ModuleCardGrid>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpen={() => vm.select(agent.id)}
              onToggle={(enabled) => vm.toggleEnabled(agent.id, enabled)}
            />
          ))}
        </ModuleCardGrid>
      </ModuleSection>
    );
  };

  return (
    <div className="arco-agents">
      <ModulePage>
        <ModuleInner>
          <ModuleHeader
            titleKey={I18nKey.OS$APP_AGENTS}
            subtitleKey={I18nKey.APPS$AGENTS_SUBTITLE}
            actions={
              <Button onClick={() => setShowCreate((value) => !value)}>
                <Plus size={13} aria-hidden="true" />
                <T k={I18nKey.APPS$AGENTS_NEW_AGENT} />
              </Button>
            }
          />

          {showCreate ? (
            <CreateAgentPanel vm={vm} onCancel={() => setShowCreate(false)} />
          ) : null}

          <ContentPackPanel onInstalled={() => void vm.refresh()} />

          {vm.error ? (
            <EmptyState title="Could not load agents">{vm.error}</EmptyState>
          ) : null}

          <ModuleToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel={i18n.t(I18nKey.APPS$AGENTS_SEARCH)}
          >
            <ModuleFilterSelect
              label={i18n.t(I18nKey.APPS$AGENTS_RUNTIME_FILTER)}
              value={runtimeFilter}
              options={RUNTIME_FILTERS.map(({ id, labelKey }) => ({
                value: id,
                label: t(labelKey),
              }))}
              onChange={setRuntimeFilter}
            />
            <ModuleFilterSelect
              label={i18n.t(I18nKey.APPS$AGENTS_STATUS_FILTER)}
              value={statusFilter}
              options={STATUS_FILTERS.map(({ id, labelKey }) => ({
                value: id,
                label: t(labelKey),
              }))}
              onChange={setStatusFilter}
            />
          </ModuleToolbar>

          {filtered.length === 0 ? (
            <EmptyState title={i18n.t(I18nKey.APPS$AGENTS_NO_MATCH)}>
              <T k={I18nKey.APPS$AGENTS_NO_MATCH_HINT} />
            </EmptyState>
          ) : (
            <>
              {renderGroup(I18nKey.APPS$AGENTS_GROUP_RUNNING, running)}
              {renderGroup(I18nKey.APPS$AGENTS_GROUP_ACTIVE, active)}
              {renderGroup(I18nKey.APPS$AGENTS_GROUP_INACTIVE, inactive)}
            </>
          )}
        </ModuleInner>
      </ModulePage>

      {vm.selected ? (
        <div className="arco-agents__backdrop" onClick={() => vm.select(null)} role="presentation">
          <div onClick={(event) => event.stopPropagation()}>
            <AgentDetailPanel agent={vm.selected} vm={vm} onClose={() => vm.select(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
