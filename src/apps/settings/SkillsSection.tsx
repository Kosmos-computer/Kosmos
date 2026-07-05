/**
 * Settings → Skills — the agent's reusable instruction bundles. Each card
 * shows name, description (what the prompt index displays), source badge
 * (seed / user / app), gate badges (tools blocked until the skill is read),
 * an enable toggle (disabled skills leave the index entirely), and an
 * expandable body editor. Users can create skills here; the agent can also
 * save them from chat via save_skill (with confirmation).
 */
import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { SkillMeta } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        border: "1px solid var(--arco-border)",
        borderRadius: "var(--arco-radius-md, 8px)",
        opacity: skill.enabled ? 1 : 0.6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BookOpen size={14} style={{ color: "var(--arco-accent, var(--arco-text-secondary))", flexShrink: 0 }} />
        <strong style={{ fontSize: "var(--arco-text-md)" }}>{skill.name}</strong>
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>
          {skill.id} · {skill.source}
        </span>
        <span style={{ flex: 1 }} />
        {canManage && (
          <>
            <button
              className={`arco-chip ${skill.enabled ? "arco-chip--active" : ""}`}
              onClick={() => void setEnabled(!skill.enabled)}
              aria-pressed={skill.enabled}
            >
              {skill.enabled ? "enabled" : "disabled"}
            </button>
            <button
              className="arco-btn arco-btn--icon"
              onClick={() => void remove()}
              aria-label={`Delete ${skill.name}`}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        {skill.description}
      </span>

      {skill.gates.length > 0 && (
        <div className="arco-chip-row">
          {skill.gates.map((gate) => (
            <span key={gate} className="arco-chip" title="Blocked until this skill is read">
              gates: {gate}
            </span>
          ))}
        </div>
      )}

      <div>
        <button
          className="arco-btn"
          style={{ fontSize: "var(--arco-text-xs)" }}
          onClick={() => void toggleExpand()}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? "Hide instructions" : "View instructions"}
        </button>
      </div>

      {expanded && body !== null && (
        <>
          <textarea
            className="arco-input"
            rows={10}
            value={body}
            readOnly={!canManage}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            style={{ fontFamily: "var(--arco-font-mono)", fontSize: "var(--arco-text-xs)" }}
            aria-label={`Instructions for ${skill.name}`}
          />
          {canManage && dirty && (
            <div>
              <button
                className="arco-btn arco-btn--primary"
                disabled={saving}
                onClick={() => void saveBody()}
              >
                {saving ? "Saving…" : "Save instructions"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SkillsSection() {
  const canManage = useCan("settings:write");
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create form
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
    <section className="arco-form">
      <strong>Skills</strong>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        Instruction files the agent reads on demand. The prompt only carries the index; the agent
        pages in a skill's full instructions when a task calls for it.
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {skills.length === 0 ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No skills installed.
        </span>
      ) : (
        skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} canManage={canManage} onChanged={() => void refresh()} />
        ))
      )}

      {canManage && !showForm && (
        <div>
          <button className="arco-btn" onClick={() => setShowForm(true)}>
            New skill
          </button>
        </div>
      )}

      {canManage && showForm && (
        <>
          <label className="arco-label" htmlFor="skill-name">
            New skill
          </label>
          <input
            id="skill-name"
            className="arco-input"
            placeholder="Name (e.g. Weekly report format)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="arco-input"
            placeholder="Description — when should the agent read this?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-label="Skill description"
          />
          <textarea
            className="arco-input"
            rows={6}
            placeholder="Instructions (markdown)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Skill instructions"
            style={{ fontFamily: "var(--arco-font-mono)", fontSize: "var(--arco-text-xs)" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="arco-btn arco-btn--primary"
              disabled={creating || !name.trim() || !description.trim() || !body.trim()}
              onClick={() => void create()}
            >
              {creating ? "Creating…" : "Create skill"}
            </button>
            <button className="arco-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
    </section>
  );
}
