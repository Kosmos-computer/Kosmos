/**
 * Settings → Skills — the agent's reusable instruction bundles.
 */
import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { SkillMeta } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  SettingsAlert,
  SettingsChipRow,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsLog,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

function SkillCard({
  skill,
  canManage,
  onChanged,
}: {
  skill: SkillMeta;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    const full = await api.getSkill(skill.id);
    setBody(full.body);
    setDirty(false);
    setExpanded(true);
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

  const setEnabled = async (enabled: boolean) => {
    await api.updateSkill(skill.id, { enabled });
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    await api.deleteSkill(skill.id);
    onChanged();
  };

  return (
    <SettingsPanel disabled={!skill.enabled}>
      <SettingsPanelHeader>
        <BookOpen size={14} className="arco-icon arco-icon--accent" />
        <span className="arco-settings-panel__title">{skill.name}</span>
        <span className="arco-settings-panel__meta">
          {skill.id} · {skill.source}
        </span>
        {canManage && (
          <SettingsRowActions>
            <Chip active={skill.enabled} onClick={() => void setEnabled(!skill.enabled)} aria-pressed={skill.enabled}>
              {skill.enabled ? "enabled" : "disabled"}
            </Chip>
            <Button size="icon" onClick={() => void remove()} aria-label={`Delete ${skill.name}`}>
              <Trash2 size={13} />
            </Button>
          </SettingsRowActions>
        )}
      </SettingsPanelHeader>

      <p className="arco-settings-panel__desc">{skill.description}</p>

      {skill.gates.length > 0 && (
        <SettingsChipRow>
          {skill.gates.map((gate) => (
            <Chip key={gate} title="Blocked until this skill is read">
              gates: {gate}
            </Chip>
          ))}
        </SettingsChipRow>
      )}

      <SettingsRow>
        <Button className="arco-card__meta" onClick={() => void toggleExpand()} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? "Hide instructions" : "View instructions"}
        </Button>
      </SettingsRow>

      {expanded && body !== null && (
        <SettingsPanelBody>
          <textarea
            className="arco-input arco-settings-log"
            rows={10}
            value={body}
            readOnly={!canManage}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            aria-label={`Instructions for ${skill.name}`}
          />
          {canManage && dirty && (
            <Button variant="primary" disabled={saving} onClick={() => void saveBody()}>
              {saving ? "Saving…" : "Save instructions"}
            </Button>
          )}
        </SettingsPanelBody>
      )}
    </SettingsPanel>
  );
}

export function SkillsSection() {
  const canManage = useCan("settings:write");
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSkills(await api.listSkills());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.createSkill({ name: name.trim(), description: description.trim(), body });
      setName("");
      setDescription("");
      setBody("");
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsSection intro="Instruction files the agent reads on demand. The prompt only carries the index; the agent pages in a skill's full instructions when a task calls for it.">
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {skills.length === 0 ? (
          <SettingsEmpty>No skills installed.</SettingsEmpty>
        ) : (
          <SettingsStack>
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} canManage={canManage} onChanged={() => void refresh()} />
            ))}
          </SettingsStack>
        )}

        {canManage && !showForm && (
          <SettingsRow>
            <Button onClick={() => setShowForm(true)}>New skill</Button>
          </SettingsRow>
        )}

        {canManage && showForm && (
          <>
            <SettingsSubhead>New skill</SettingsSubhead>
            <SettingsStack>
              <SettingsFieldRow label="Name" htmlFor="skill-name">
                <Input
                  id="skill-name"
                  width="auto"
                  placeholder="Weekly report format"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label="Description">
                <Input
                  width="auto"
                  placeholder="When should the agent read this?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-label="Skill description"
                />
              </SettingsFieldRow>
              <SettingsFieldRow label="Instructions">
                <textarea
                  className="arco-input arco-settings-log"
                  rows={6}
                  placeholder="Markdown instructions"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  aria-label="Skill instructions"
                />
              </SettingsFieldRow>
              <SettingsFieldRow label=" ">
                <Button
                  variant="primary"
                  disabled={creating || !name.trim() || !description.trim() || !body.trim()}
                  onClick={() => void create()}
                >
                  {creating ? "Creating…" : "Create skill"}
                </Button>
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
              </SettingsFieldRow>
            </SettingsStack>
          </>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
