/**
 * Skill store — reusable instruction bundles on disk, one folder per skill:
 *
 *   data/skills/<id>/SKILL.md     frontmatter (name/description/gates) + body
 *   data/skills/skills.json      enable flags, deleted-seed tombstones, and
 *                                which sessions have read which skills
 *
 * The folder-per-skill layout leaves room for bundled assets later, and the
 * SKILL.md format stays portable with the broader ecosystem (Claude/Cursor
 * skills, ClawHub) so skills can be shared in and out of Arco.
 *
 * Gate state is persisted (not in-memory) so a server restart doesn't force
 * the agent to re-read every gating skill mid-conversation.
 */
import fs from "node:fs";
import path from "node:path";
import type { Skill, SkillMeta, SkillSource } from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { bus } from "../bus.js";

const SKILLS_DIR = path.join(dataDirs.root, "skills");
const STATE_FILE = path.join(SKILLS_DIR, "skills.json");

interface SkillsState {
  /** id → enabled (absent = enabled; only explicit disables are stored). */
  disabled: string[];
  /** Seed ids the user deleted — boot must not resurrect them. */
  deletedSeeds: string[];
  /** sessionId → skill ids read in that session (gate state). */
  reads: Record<string, string[]>;
}

function loadState(): SkillsState {
  try {
    return { disabled: [], deletedSeeds: [], reads: {}, ...JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) };
  } catch {
    return { disabled: [], deletedSeeds: [], reads: {} };
  }
}

function saveState(state: SkillsState): void {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// ── SKILL.md frontmatter ──────────────────────────────────────────────────────
//
// Three known keys (name, description, gates, source) — a hand parser beats
// a YAML dependency. Descriptions are single-line; gates are a comma list.

interface Frontmatter {
  name: string;
  description: string;
  gates: string[];
  source: SkillSource;
}

function parseSkillFile(raw: string): { meta: Frontmatter; body: string } | null {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  if (!fields.name) return null;
  const rawSource = fields.source ?? "user";
  const source: SkillSource =
    rawSource === "seed" || rawSource === "user" || rawSource.startsWith("app:")
      ? (rawSource as SkillSource)
      : "user";
  return {
    meta: {
      name: fields.name,
      description: fields.description ?? "",
      gates: fields.gates
        ? fields.gates
            .replace(/^\[|\]$/g, "")
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : [],
      source,
    },
    body: raw.slice(match[0].length).trim(),
  };
}

function renderSkillFile(meta: Frontmatter, body: string): string {
  const lines = [
    "---",
    `name: ${meta.name}`,
    `description: ${meta.description.replace(/\n/g, " ")}`,
    ...(meta.gates.length > 0 ? [`gates: ${meta.gates.join(", ")}`] : []),
    `source: ${meta.source}`,
    "---",
    "",
    body.trim(),
    "",
  ];
  return lines.join("\n");
}

function skillFile(id: string): string {
  return path.join(SKILLS_DIR, id, "SKILL.md");
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "skill"
  );
}

function readSkill(id: string, state: SkillsState): Skill | null {
  let raw: string;
  try {
    raw = fs.readFileSync(skillFile(id), "utf-8");
  } catch {
    return null;
  }
  const parsed = parseSkillFile(raw);
  if (!parsed) return null;
  let mtime = new Date().toISOString();
  try {
    mtime = fs.statSync(skillFile(id)).mtime.toISOString();
  } catch {
    // keep the fallback timestamp
  }
  return {
    id,
    ...parsed.meta,
    enabled: !state.disabled.includes(id),
    updatedAt: mtime,
    body: parsed.body,
  };
}

function listIds(): string[] {
  try {
    return fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(skillFile(e.name)))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export const skillStore = {
  list(): SkillMeta[] {
    const state = loadState();
    return listIds()
      .map((id) => readSkill(id, state))
      .filter((s): s is Skill => s !== null)
      .map(({ body: _body, ...meta }) => meta);
  },

  get(id: string): Skill | null {
    return readSkill(id, loadState());
  },

  create(input: {
    name: string;
    description: string;
    body: string;
    gates?: string[];
    source?: SkillSource;
  }): Skill {
    let id = slugify(input.name);
    let n = 2;
    while (fs.existsSync(skillFile(id))) id = `${slugify(input.name)}-${n++}`;
    fs.mkdirSync(path.join(SKILLS_DIR, id), { recursive: true });
    fs.writeFileSync(
      skillFile(id),
      renderSkillFile(
        {
          name: input.name,
          description: input.description,
          gates: input.gates ?? [],
          source: input.source ?? "user",
        },
        input.body,
      ),
      "utf-8",
    );
    bus.emit("skills_changed");
    return readSkill(id, loadState())!;
  },

  update(
    id: string,
    patch: Partial<Pick<Skill, "name" | "description" | "body" | "gates" | "enabled">>,
  ): Skill | null {
    const state = loadState();
    const current = readSkill(id, state);
    if (!current) return null;
    if (patch.enabled !== undefined) {
      state.disabled = state.disabled.filter((d) => d !== id);
      if (!patch.enabled) state.disabled.push(id);
      saveState(state);
    }
    const { name, description, body, gates } = { ...current, ...patch };
    fs.writeFileSync(
      skillFile(id),
      renderSkillFile({ name, description, gates, source: current.source }, body),
      "utf-8",
    );
    bus.emit("skills_changed");
    return readSkill(id, loadState());
  },

  remove(id: string): boolean {
    const state = loadState();
    const skill = readSkill(id, state);
    if (!skill) return false;
    fs.rmSync(path.join(SKILLS_DIR, id), { recursive: true, force: true });
    if (skill.source === "seed" && !state.deletedSeeds.includes(id)) {
      state.deletedSeeds.push(id);
    }
    state.disabled = state.disabled.filter((d) => d !== id);
    saveState(state);
    bus.emit("skills_changed");
    return true;
  },

  // ── Gate state ─────────────────────────────────────────────────────────────

  markRead(sessionId: string, skillId: string): void {
    const state = loadState();
    const read = state.reads[sessionId] ?? [];
    if (!read.includes(skillId)) {
      read.push(skillId);
      state.reads[sessionId] = read;
      saveState(state);
    }
  },

  wasRead(sessionId: string, skillId: string): boolean {
    return (loadState().reads[sessionId] ?? []).includes(skillId);
  },

  /** Enabled skills whose gates are still armed for this session. */
  gatingSkillsUnread(sessionId: string): SkillMeta[] {
    const state = loadState();
    const read = new Set(state.reads[sessionId] ?? []);
    return this.list().filter((s) => s.enabled && s.gates.length > 0 && !read.has(s.id));
  },

  // ── Seeds ──────────────────────────────────────────────────────────────────

  /**
   * Copy repo-root ./skills/* into the data dir (first boot / new skills),
   * skipping anything the user deleted. Existing skills are never
   * overwritten — user edits win over seed updates.
   */
  ensureSeeds(seedsDir: string): void {
    const state = loadState();
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(seedsDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const id = entry.name;
      if (state.deletedSeeds.includes(id) || fs.existsSync(skillFile(id))) continue;
      const source = path.join(seedsDir, id, "SKILL.md");
      if (!fs.existsSync(source)) continue;
      fs.mkdirSync(path.join(SKILLS_DIR, id), { recursive: true });
      fs.copyFileSync(source, skillFile(id));
      console.log(`[arco] seeded skill ${id}`);
    }
  },

  /**
   * The OpenUI app-authoring guide is generated (npm run generate), not
   * static, so it seeds from the build artifact: a gating skill on
   * app_create/app_update that keeps ~600 lines out of every non-app turn.
   */
  ensureGeneratedSeed(id: string, name: string, description: string, gates: string[], bodyFile: string): void {
    const state = loadState();
    if (state.deletedSeeds.includes(id) || fs.existsSync(skillFile(id))) return;
    let body: string;
    try {
      body = fs.readFileSync(bodyFile, "utf-8");
    } catch {
      return;
    }
    fs.mkdirSync(path.join(SKILLS_DIR, id), { recursive: true });
    fs.writeFileSync(
      skillFile(id),
      renderSkillFile({ name, description, gates, source: "seed" }, body),
      "utf-8",
    );
    console.log(`[arco] seeded skill ${id} (from ${path.basename(bodyFile)})`);
  },
};
