/**
 * Skills dashboard — agent-canvas card grid with search, source filter, enable
 * toggles, and a detail overlay for instructions. Shared by SkillsApp and
 * Settings → Skills.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, Plus, Trash2, X } from "lucide-react";
import type { SkillMeta } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  ModuleCardGrid,
  ModuleHeader,
  ModuleInner,
  ModulePage,
  ModuleSection,
  ModuleToolbar,
} from "../../components/patterns/ModuleDashboard";
import { Button, Chip, EmptyState, Input, Switch } from "../../components/ui";
import { SettingsAlert } from "../../components/patterns";
import {
  filterSkills,
  skillSourceLabel,
  type SkillSourceFilter,
} from "./skillFilters";

const SOURCE_FILTERS: { id: SkillSourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "seed", label: "Built-in" },
  { id: "user", label: "Custom" },
  { id: "app", label: "Apps" },
];

function SkillModuleCard({
  skill,
  canManage,
  onOpen,
  onToggle,
}: {
  skill: SkillMeta;
  canManage: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={["arco-module-card", !skill.enabled && "arco-module-card--disabled"]
        .filter(Boolean)
        .join(" ")}
      onClick={onOpen}
    >
      <div className="arco-module-card__head">
        <span className="arco-module-card__icon" aria-hidden="true">
          <BookOpen size={16} />
        </span>
        <div className="arco-module-card__body">
          <h3 className="arco-module-card__title">{skill.name}</h3>
          <div className="arco-module-card__meta">
            {skill.id} · {skillSourceLabel(skill.source)}
          </div>
        </div>
        {canManage ? (
          <div className="arco-module-card__actions">
            <Switch
              checked={skill.enabled}
              aria-label={`${skill.enabled ? "Disable" : "Enable"} ${skill.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onToggle(event.target.checked)}
            />
          </div>
        ) : null}
      </div>
      <p className="arco-module-card__desc">{skill.description}</p>
      {skill.gates.length > 0 ? (
        <div className="arco-module-card__pills">
          {skill.gates.map((gate) => (
            <span key={gate} className="arco-module-card__pill" title="Blocked until read">
              gates {gate}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function SkillDetailOverlay({
  skill,
  canManage,
  onClose,
  onChanged,
}: {
  skill: SkillMeta;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [body, setBody] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api.getSkill(skill.id).then((full) => {
      if (!cancelled) {
        setBody(full.body);
        setDirty(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [skill.id]);

  const setEnabled = async (enabled: boolean) => {
    await api.updateSkill(skill.id, { enabled });
    onChanged();
  };

  const saveBody = async () => {
    if (body === null) return;
    setSaving(true);
    try {
      await api.updateSkill(skill.id, { body });
      setDirty(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    await api.deleteSkill(skill.id);
    onChanged();
    onClose();
  };

  return (
    <div className="arco-module-overlay" role="presentation" onClick={onClose}>
      <div
        className="arco-module-overlay__panel"
        role="dialog"
        aria-label={skill.name}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="arco-module-overlay__head">
          <div className="arco-module__headcopy">
            <h2 className="arco-module__title">{skill.name}</h2>
            <p className="arco-module__subtitle">
              {skill.id} · {skillSourceLabel(skill.source)}
            </p>
          </div>
          <div className="arco-module-card__actions">
            {canManage ? (
              <Switch
                checked={skill.enabled}
                aria-label={`${skill.enabled ? "Disable" : "Enable"} ${skill.name}`}
                onChange={(event) => void setEnabled(event.target.checked)}
              />
            ) : null}
            {canManage && skill.source === "user" ? (
              <Button size="icon" onClick={() => void remove()} aria-label={`Delete ${skill.name}`}>
                <Trash2 size={14} />
              </Button>
            ) : null}
            <Button size="icon" onClick={onClose} aria-label="Close">
              <X size={14} />
            </Button>
          </div>
        </div>

        <p className="arco-module-card__desc">{skill.description}</p>

        {skill.gates.length > 0 ? (
          <div className="arco-module-card__pills">
            {skill.gates.map((gate) => (
              <span key={gate} className="arco-module-card__pill">
                gates {gate}
              </span>
            ))}
          </div>
        ) : null}

        {body === null ? (
          <EmptyState title="Loading instructions…" />
        ) : (
          <>
            <textarea
              className="arco-input arco-settings-log"
              rows={12}
              value={body}
              readOnly={!canManage || skill.source !== "user"}
              onChange={(e) => {
                setBody(e.target.value);
                setDirty(true);
              }}
              aria-label={`Instructions for ${skill.name}`}
            />
            {canManage && skill.source === "user" && dirty ? (
              <Button variant="primary" disabled={saving} onClick={() => void saveBody()}>
                {saving ? "Saving…" : "Save instructions"}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function AddSkillPanel({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.createSkill({ name: name.trim(), description: description.trim(), body });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="arco-form">
      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
      <label className="arco-label" htmlFor="skill-name">
        Name
      </label>
      <Input
        id="skill-name"
        width="auto"
        placeholder="Weekly report format"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="arco-label" htmlFor="skill-description">
        Description
      </label>
      <Input
        id="skill-description"
        width="auto"
        placeholder="When should the agent read this?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="arco-label" htmlFor="skill-body">
        Instructions
      </label>
      <textarea
        id="skill-body"
        className="arco-input arco-settings-log"
        rows={6}
        placeholder="Markdown instructions"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="primary"
          disabled={creating || !name.trim() || !description.trim() || !body.trim()}
          onClick={() => void create()}
        >
          {creating ? "Creating…" : "Create skill"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function SkillsDashboard({ embedded = false }: { embedded?: boolean }) {
  const canManage = useCan("settings:write");
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SkillSourceFilter>("all");
  const [selected, setSelected] = useState<SkillMeta | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api.listSkills();
      setSkills(next);
      setSelected((current) => (current ? next.find((s) => s.id === current.id) ?? null : null));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => filterSkills(skills, search, sourceFilter),
    [skills, search, sourceFilter],
  );

  const enabled = useMemo(() => filtered.filter((skill) => skill.enabled), [filtered]);
  const disabled = useMemo(() => filtered.filter((skill) => !skill.enabled), [filtered]);

  const toggleSkill = async (skill: SkillMeta, enabledNext: boolean) => {
    await api.updateSkill(skill.id, { enabled: enabledNext });
    await refresh();
  };

  const content = (
    <ModuleInner>
      <ModuleHeader
        title="Skills"
        subtitle="Instruction files the agent reads on demand. The prompt only carries the index; the agent pages in a skill's full instructions when a task calls for it."
        actions={
          canManage ? (
            <Button onClick={() => setShowAdd((value) => !value)}>
              <Plus size={13} /> New skill
            </Button>
          ) : null
        }
      />

      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

      {showAdd && canManage ? (
        <AddSkillPanel
          onCreated={() => {
            setShowAdd(false);
            void refresh();
          }}
          onCancel={() => setShowAdd(false)}
        />
      ) : null}

      {skills.length === 0 ? (
        <EmptyState title="No skills installed">
          Create a skill or ask Arco to save reusable instructions from chat.
        </EmptyState>
      ) : (
        <>
          <ModuleToolbar search={search} onSearchChange={setSearch} searchLabel="Search skills">
            <div className="arco-chip-row" role="group" aria-label="Skill source filter">
              {SOURCE_FILTERS.map((entry) => (
                <Chip
                  key={entry.id}
                  active={sourceFilter === entry.id}
                  aria-pressed={sourceFilter === entry.id}
                  onClick={() => setSourceFilter(entry.id)}
                >
                  {entry.label}
                </Chip>
              ))}
            </div>
          </ModuleToolbar>

          {filtered.length === 0 ? (
            <EmptyState title="No matching skills">Try a different search term or filter.</EmptyState>
          ) : (
            <>
              <ModuleSection title="Enabled" count={enabled.length}>
                <ModuleCardGrid>
                  {enabled.map((skill) => (
                    <SkillModuleCard
                      key={skill.id}
                      skill={skill}
                      canManage={canManage}
                      onOpen={() => setSelected(skill)}
                      onToggle={(enabledNext) => void toggleSkill(skill, enabledNext)}
                    />
                  ))}
                </ModuleCardGrid>
              </ModuleSection>

              <ModuleSection title="Disabled" count={disabled.length}>
                <ModuleCardGrid>
                  {disabled.map((skill) => (
                    <SkillModuleCard
                      key={skill.id}
                      skill={skill}
                      canManage={canManage}
                      onOpen={() => setSelected(skill)}
                      onToggle={(enabledNext) => void toggleSkill(skill, enabledNext)}
                    />
                  ))}
                </ModuleCardGrid>
              </ModuleSection>
            </>
          )}
        </>
      )}
    </ModuleInner>
  );

  const overlay =
    selected ? (
      <SkillDetailOverlay
        skill={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onChanged={() => void refresh()}
      />
    ) : null;

  if (embedded) {
    return (
      <>
        {content}
        {overlay}
      </>
    );
  }

  return (
    <ModulePage>
      {content}
      {overlay}
    </ModulePage>
  );
}

export function SkillsApp() {
  return (
    <div className="arco-panel" style={{ position: "relative", padding: 0 }}>
      <SkillsDashboard />
    </div>
  );
}
