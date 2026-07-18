import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Agent profile detail — tabbed overlay for persona, models, memory, documents,
 * and access policy. Cross-links to Settings, Models, Memory, and Skills.
 */
import { useState } from "react";
import {
  ArrowUpRight,
  Brain,
  Boxes,
  FileText,
  Layers,
  Settings,
  Shield,
  X,
} from "lucide-react";
import {
  SettingsFieldRow,
  SettingsGroupLabel,
  SettingsRow,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns/SettingsLayout";
import { Badge, Button, Chip, Input, Switch } from "../../components/ui";
import { openSettingsApp } from "../settings/settingsStore";
import { openShellWindow } from "../../os/shellNavigation";
import { systemAppTitle } from "../../os/systemAppTitles";
import { AgentAvatar } from "./AgentAvatar";
import { runtimeLabel } from "./agentFilters";
import type { AgentDetailTab, AgentProfile } from "./types";
import type { AgentsViewModel } from "./useAgents";

const DETAIL_TABS: { id: AgentDetailTab; labelKey: I18nKey; icon: typeof Settings }[] = [
  { id: "profile", labelKey: I18nKey.APPS$AGENTS_TAB_PROFILE, icon: Settings },
  { id: "models", labelKey: I18nKey.APPS$AGENTS_TAB_MODELS, icon: Boxes },
  { id: "memory", labelKey: I18nKey.APPS$AGENTS_TAB_MEMORY, icon: Brain },
  { id: "documents", labelKey: I18nKey.APPS$AGENTS_TAB_DOCUMENTS, icon: FileText },
  { id: "access", labelKey: I18nKey.APPS$AGENTS_TAB_ACCESS, icon: Shield },
];

function openModelsApp() {
  openShellWindow({ type: "system", app: "models" }, systemAppTitle("models"));
}

function openMemoryApp() {
  openShellWindow({ type: "system", app: "memory" }, systemAppTitle("memory"));
}

function openSkillsApp() {
  openShellWindow({ type: "system", app: "skills" }, systemAppTitle("skills"));
}

function ProfileTab({
  agent,
  vm,
}: {
  agent: AgentProfile;
  vm: Pick<AgentsViewModel, "updateAgent" | "updateAvatar" | "avatarColors" | "avatarEmojis">;
}) {
  const [name, setName] = useState(agent.name);
  const [tagline, setTagline] = useState(agent.tagline);
  const [description, setDescription] = useState(agent.description);

  const saveProfile = () => {
    vm.updateAgent(agent.id, {
      name: name.trim() || agent.name,
      tagline: tagline.trim(),
      description: description.trim(),
    });
  };

  const dirty =
    name.trim() !== agent.name ||
    tagline.trim() !== agent.tagline ||
    description.trim() !== agent.description;

  return (
    <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_PROFILE_INTRO)}>
      <div className="arco-agents-avatar-picker">
        <SettingsGroupLabel><T k={I18nKey.APPS$AGENTS_AVATAR_EMOJI} /></SettingsGroupLabel>
        <div className="arco-chip-row" role="group" aria-label={i18n.t(I18nKey.APPS$AGENTS_AVATAR_EMOJI)}>
          {vm.avatarEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`arco-chip arco-agents-emoji-chip${agent.avatar.value === emoji ? " arco-chip--active" : ""}`}
              aria-pressed={agent.avatar.value === emoji}
              onClick={() => vm.updateAvatar(agent.id, { ...agent.avatar, kind: "emoji", value: emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
        <SettingsGroupLabel><T k={I18nKey.APPS$AGENTS_AVATAR_COLOR} /></SettingsGroupLabel>
        <div className="arco-chip-row" role="group" aria-label={i18n.t(I18nKey.APPS$AGENTS_AVATAR_COLOR)}>
          {vm.avatarColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`arco-agents-color-chip arco-agents-color-chip--${color}${agent.avatar.color === color ? " arco-agents-color-chip--active" : ""}`}
              aria-pressed={agent.avatar.color === color}
              aria-label={color}
              onClick={() => vm.updateAvatar(agent.id, { ...agent.avatar, color })}
            />
          ))}
        </div>
      </div>

      <SettingsStack>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_NAME} />} htmlFor={`agent-name-${agent.id}`}>
          <Input
            id={`agent-name-${agent.id}`}
            width="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_TAGLINE} />} htmlFor={`agent-tagline-${agent.id}`}>
          <Input
            id={`agent-tagline-${agent.id}`}
            width="auto"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </SettingsFieldRow>
        <SettingsFieldRow
          label={<T k={I18nKey.APPS$AGENTS_DESCRIPTION} />}
          htmlFor={`agent-desc-${agent.id}`}
          alignTop
        >
          <textarea
            id={`agent-desc-${agent.id}`}
            className="arco-input arco-settings-log"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_RUNTIME} />}>
          {agent.source === "seed" && agent.id.startsWith("agent:acp:") ? (
            <Chip>{runtimeLabel(agent.runtime)}</Chip>
          ) : (
            <select
              className="arco-input"
              aria-label="Agent runtime"
              value={
                agent.runtime === "acp"
                  ? `acp:${agent.acpPresetId ?? "claude-code"}`
                  : agent.runtime
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("acp:")) {
                  void vm.updateAgent(agent.id, {
                    runtime: "acp",
                    acpPresetId: value.slice(4),
                  });
                } else {
                  void vm.updateAgent(agent.id, {
                    runtime: value as AgentProfile["runtime"],
                    acpPresetId: undefined,
                  });
                }
              }}
              style={{ minWidth: "10rem" }}
            >
              <option value="builtin">Builtin</option>
              <option value="acp:claude-code">ACP · Claude Code</option>
              <option value="acp:codex">ACP · Codex</option>
              <option value="acp:gemini">ACP · Gemini CLI</option>
              <option value="cursor">Cursor</option>
            </select>
          )}
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_PRINCIPAL} />}>
          <code className="arco-agents-code">{agent.principalId}</code>
        </SettingsFieldRow>
      </SettingsStack>

      {dirty ? (
        <div className="arco-agents-detail__actions">
          <Button variant="primary" onClick={saveProfile}><T k={I18nKey.COMMON$SAVE} /></Button>
        </div>
      ) : null}
    </SettingsSection>
  );
}

function ModelsTab({
  agent,
  vm,
}: {
  agent: AgentProfile;
  vm: Pick<AgentsViewModel, "toggleApprovedModel" | "setDefaultModel">;
}) {
  return (
    <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_MODELS_INTRO)}>
      {agent.modelSlot ? (
        <SettingsRow>
          <div className="arco-settings-row__label">
            <T k={I18nKey.APPS$AGENTS_MODEL_SLOT} />
            <span className="arco-settings-row__hint">{agent.modelSlot}</span>
          </div>
          <div className="arco-settings-row__control">
            <Button variant="ghost" onClick={openModelsApp}>
              <T k={I18nKey.APPS$AGENTS_OPEN_MODELS} />
              <ArrowUpRight size={13} aria-hidden="true" />
            </Button>
          </div>
        </SettingsRow>
      ) : null}

      <SettingsStack>
        {agent.approvedModels.map((modelId) => {
          const isDefault = agent.defaultModel === modelId;
          return (
            <SettingsRow key={modelId}>
              <div className="arco-settings-row__label">
                <span>{modelId}</span>
                {isDefault ? (
                  <Badge tone="success"><T k={I18nKey.APPS$AGENTS_DEFAULT_MODEL} /></Badge>
                ) : null}
              </div>
              <div className="arco-settings-row__control arco-agents-model-row">
                {!isDefault ? (
                  <Button variant="ghost" onClick={() => vm.setDefaultModel(agent.id, modelId)}>
                    <T k={I18nKey.APPS$AGENTS_SET_DEFAULT} />
                  </Button>
                ) : null}
                <Switch
                  checked
                  aria-label={`Approved model ${modelId}`}
                  onChange={() => vm.toggleApprovedModel(agent.id, modelId)}
                />
              </div>
            </SettingsRow>
          );
        })}
      </SettingsStack>

      <p className="arco-agents-hint">
        <T k={I18nKey.APPS$AGENTS_MODELS_HINT} />
      </p>
    </SettingsSection>
  );
}

function MemoryTab({ agent }: { agent: AgentProfile }) {
  return (
    <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_MEMORY_INTRO)}>
      <SettingsStack>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_MEMORY_PRINCIPAL} />}>
          <code className="arco-agents-code">{agent.memoryPrincipalId}</code>
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_MEMORY_ENTRIES} />}>
          <span>{agent.memoryEntryCount.toLocaleString()}</span>
        </SettingsFieldRow>
      </SettingsStack>

      {agent.memoryGrants.length > 0 ? (
        <>
          <SettingsGroupLabel><T k={I18nKey.APPS$AGENTS_MEMORY_GRANTS} /></SettingsGroupLabel>
          <ul className="arco-agents-grant-list">
            {agent.memoryGrants.map((grant) => (
              <li key={`${grant.kind}-${grant.scope}`} className="arco-agents-grant">
                <Badge>{grant.kind}</Badge>
                <code>{grant.scope}</code>
                {grant.description ? <span className="arco-agents-grant__desc">{grant.description}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="arco-agents-hint"><T k={I18nKey.APPS$AGENTS_NO_MEMORY_GRANTS} /></p>
      )}

      <div className="arco-agents-detail__actions">
        <Button variant="ghost" onClick={openMemoryApp}>
          <Brain size={13} aria-hidden="true" />
          <T k={I18nKey.APPS$AGENTS_OPEN_MEMORY} />
          <ArrowUpRight size={13} aria-hidden="true" />
        </Button>
        <Button variant="ghost" onClick={() => openSettingsApp("memory")}>
          <Settings size={13} aria-hidden="true" />
          <T k={I18nKey.APPS$AGENTS_MEMORY_SETTINGS} />
        </Button>
      </div>
    </SettingsSection>
  );
}

function DocumentsTab({ agent }: { agent: AgentProfile }) {
  const [selectedDocId, setSelectedDocId] = useState(agent.documents[0]?.id ?? null);
  const selectedDoc = agent.documents.find((doc) => doc.id === selectedDocId) ?? null;

  if (agent.documents.length === 0) {
    return (
      <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_DOCUMENTS_INTRO)}>
        <p className="arco-agents-hint"><T k={I18nKey.APPS$AGENTS_NO_DOCUMENTS} /></p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_DOCUMENTS_INTRO)}>
      <div className="arco-agents-docs">
        <ul className="arco-agents-docs__list" role="list">
          {agent.documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={`arco-agents-docs__item${selectedDocId === doc.id ? " arco-agents-docs__item--active" : ""}`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <FileText size={14} aria-hidden="true" />
                <span className="arco-agents-docs__itemcopy">
                  <span className="arco-agents-docs__name">{doc.name}</span>
                  <span className="arco-agents-docs__path">{doc.path}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="arco-agents-docs__preview">
          {selectedDoc ? (
            <>
              <h3 className="arco-agents-docs__preview-title">{selectedDoc.name}</h3>
              {selectedDoc.description ? (
                <p className="arco-agents-hint">{selectedDoc.description}</p>
              ) : null}
              <pre className="arco-agents-docs__body">
                {selectedDoc.preview ?? `# ${selectedDoc.name}\n\n(Document preview — wire to memory store in Phase 2.)`}
              </pre>
            </>
          ) : null}
        </div>
      </div>
    </SettingsSection>
  );
}

function AccessTab({
  agent,
  vm,
}: {
  agent: AgentProfile;
  vm: Pick<AgentsViewModel, "updateAgent">;
}) {
  return (
    <SettingsSection intro={i18n.t(I18nKey.APPS$AGENTS_ACCESS_INTRO)}>
      <SettingsStack>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_TOOL_COUNT} />}>
          <span>{agent.toolCount}</span>
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_POLICY_LEVEL} />}>
          <Chip>{agent.policyLevel}</Chip>
        </SettingsFieldRow>
        <SettingsFieldRow label={<T k={I18nKey.APPS$AGENTS_SAFETY_LEVEL} />}>
          <select
            className="arco-input"
            aria-label="Safety level"
            value={agent.safetyLevel}
            onChange={(e) =>
              void vm.updateAgent(agent.id, {
                safetyLevel: e.target.value as AgentProfile["safetyLevel"],
              })
            }
            style={{ minWidth: "8rem" }}
          >
            <option value="restricted">restricted</option>
            <option value="standard">standard</option>
            <option value="elevated">elevated</option>
          </select>
        </SettingsFieldRow>
      </SettingsStack>

      {agent.skillGates.length > 0 ? (
        <>
          <SettingsGroupLabel><T k={I18nKey.APPS$AGENTS_SKILL_GATES} /></SettingsGroupLabel>
          <div className="arco-chip-row">
            {agent.skillGates.map((gate) => (
              <Chip key={gate}>{gate}</Chip>
            ))}
          </div>
        </>
      ) : null}

      {agent.mcpServers.length > 0 ? (
        <>
          <SettingsGroupLabel><T k={I18nKey.APPS$AGENTS_MCP_SERVERS} /></SettingsGroupLabel>
          <div className="arco-chip-row">
            {agent.mcpServers.map((server) => (
              <Chip key={server}>{server}</Chip>
            ))}
          </div>
        </>
      ) : null}

      <div className="arco-agents-detail__actions">
        <Button variant="ghost" onClick={() => openSettingsApp("agent")}>
          <Shield size={13} aria-hidden="true" />
          <T k={I18nKey.APPS$AGENTS_TOOL_POLICY} />
        </Button>
        <Button variant="ghost" onClick={openSkillsApp}>
          <Layers size={13} aria-hidden="true" />
          <T k={I18nKey.APPS$AGENTS_SKILLS} />
        </Button>
      </div>
    </SettingsSection>
  );
}

export function AgentDetailPanel({
  agent,
  vm,
  onClose,
}: {
  agent: AgentProfile;
  vm: AgentsViewModel;
  onClose: () => void;
}) {
  const certificationLabels = agent.labels.filter(
    (label) => label !== "seed" && label !== "custom" && label !== "acp",
  );

  return (
    <div className="arco-agents-detail" role="dialog" aria-label={agent.name}>
      <header className="arco-agents-detail__head">
        <div className="arco-agents-detail__identity">
          <AgentAvatar avatar={agent.avatar} name={agent.name} size="lg" status={agent.status} />
          <div className="arco-agents-detail__identitycopy">
            <h2 className="arco-agents-detail__title">{agent.name}</h2>
            {agent.tagline ? <p className="arco-agents-detail__tagline">{agent.tagline}</p> : null}
            <div className="arco-agents-detail__labels">
              <span className="arco-agents-detail__runtime">{runtimeLabel(agent.runtime)}</span>
              {certificationLabels.map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="arco-agents-detail__headactions">
          <Switch
            checked={agent.enabled}
            aria-label={agent.enabled ? `Disable ${agent.name}` : `Enable ${agent.name}`}
            onChange={(event) => vm.toggleEnabled(agent.id, event.target.checked)}
          />
          <button type="button" className="arco-btn arco-btn--icon" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </header>

      <nav className="arco-agents-detail__tabs" aria-label="Agent profile sections">
        {DETAIL_TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`arco-agents-detail__tab${vm.detailTab === id ? " arco-agents-detail__tab--active" : ""}`}
            aria-pressed={vm.detailTab === id}
            onClick={() => vm.setDetailTab(id)}
          >
            <Icon size={13} aria-hidden="true" />
            <T k={labelKey} />
          </button>
        ))}
      </nav>

      <div className="arco-agents-detail__body">
        {vm.detailTab === "profile" ? <ProfileTab agent={agent} vm={vm} /> : null}
        {vm.detailTab === "models" ? <ModelsTab agent={agent} vm={vm} /> : null}
        {vm.detailTab === "memory" ? <MemoryTab agent={agent} /> : null}
        {vm.detailTab === "documents" ? <DocumentsTab agent={agent} /> : null}
        {vm.detailTab === "access" ? <AccessTab agent={agent} vm={vm} /> : null}
      </div>
    </div>
  );
}
