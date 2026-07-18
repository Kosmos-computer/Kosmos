/**
 * Agent profile registry — JSON persistence under data/agents.json.
 *
 * Seeds agent:builtin on first load so interactive chat and unbound channels
 * keep today's single-agent behavior. User profiles are agent:user:<slug>.
 */
import fs from "node:fs";
import path from "node:path";
import type {
  AgentProfile,
  CreateAgentProfileInput,
  UpdateAgentProfileInput,
} from "../../shared/agents.js";
import {
  BUILTIN_AGENT_ID,
  acpPresetProfiles,
  builtinAgentProfile,
  slugifyAgentName,
  userAgentId,
} from "../../shared/agents.js";
import { canUseProfile } from "../../shared/profiles.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";
import { bus } from "../bus.js";
import { listBusyProfileIds } from "./activity.js";

const FILE = () => path.join(dataDirs.root, "agents.json");

interface AgentsFile {
  version: 1;
  defaultProfileId: string;
  profiles: AgentProfile[];
}

/** Give a new profile its own memory ACL so channel/chat turns can persist. */
function seedPrincipalMemoryGrants(principalId: string): void {
  if (principalId === BUILTIN_AGENT_ID) return;
  try {
    // Lazy import — memory DB may not be open in unit tests that only touch agents.json.
    void import("../memory/memoryStore.js").then(({ memoryStore }) => {
      try {
        memoryStore.setGrant("agent:builtin", {
          principalId,
          scope: { level: "all" },
          access: "admin",
        });
      } catch (err) {
        console.warn(`[agents] memory grant seed failed for ${principalId}:`, err);
      }
    });
  } catch {
    /* ignore */
  }
}

function emptyFile(now = new Date().toISOString()): AgentsFile {
  const builtin = builtinAgentProfile(now);
  return {
    version: 1,
    defaultProfileId: BUILTIN_AGENT_ID,
    profiles: [builtin, ...acpPresetProfiles(now)],
  };
}

function ensureAcpSeeds(profiles: AgentProfile[]): boolean {
  let changed = false;
  for (const seed of acpPresetProfiles()) {
    if (!profiles.some((p) => p.id === seed.id)) {
      profiles.push(seed);
      changed = true;
    }
  }
  return changed;
}

function load(): AgentsFile {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE(), "utf-8")) as Partial<AgentsFile>;
    const profiles = Array.isArray(raw.profiles) ? raw.profiles : [];
    if (profiles.length === 0) {
      const seeded = emptyFile();
      save(seeded);
      return seeded;
    }
    let dirty = false;
    if (!profiles.some((p) => p.id === BUILTIN_AGENT_ID)) {
      profiles.unshift(builtinAgentProfile());
      dirty = true;
    }
    if (ensureAcpSeeds(profiles)) dirty = true;
    const file: AgentsFile = {
      version: 1,
      defaultProfileId:
        typeof raw.defaultProfileId === "string" && profiles.some((p) => p.id === raw.defaultProfileId)
          ? raw.defaultProfileId
          : BUILTIN_AGENT_ID,
      profiles,
    };
    if (dirty) save(file);
    return file;
  } catch {
    const seeded = emptyFile();
    save(seeded);
    return seeded;
  }
}

function save(file: AgentsFile): void {
  writeSecureJson(FILE(), file);
  bus.emit("agents_changed");
}

function cloneProfile(source: AgentProfile, input: CreateAgentProfileInput, id: string): AgentProfile {
  const now = new Date().toISOString();
  return {
    id,
    name: input.name.trim(),
    description: input.description ?? source.description,
    tagline: input.tagline ?? source.tagline,
    enabled: true,
    principalId: id,
    runtime: input.runtime ?? { ...source.runtime },
    modelSlot: input.modelSlot ?? source.modelSlot,
    policyLevel: input.policyLevel ?? source.policyLevel,
    skills: input.skills ?? (source.skills ? [...source.skills] : undefined),
    skillsDisabled:
      input.skillsDisabled ?? (source.skillsDisabled ? [...source.skillsDisabled] : undefined),
    avatar: input.avatar ?? (source.avatar ? { ...source.avatar } : undefined),
    safety: input.safety ?? source.safety,
    trust: source.trust ?? "community",
    audience: source.audience,
    certification: source.certification,
    source: "user",
    createdAt: now,
    updatedAt: now,
  };
}

export const agentStore = {
  list(): AgentProfile[] {
    return load().profiles;
  },

  get(id: string): AgentProfile | undefined {
    return load().profiles.find((p) => p.id === id);
  },

  getDefault(): AgentProfile {
    const file = load();
    return (
      file.profiles.find((p) => p.id === file.defaultProfileId && p.enabled) ??
      file.profiles.find((p) => p.id === BUILTIN_AGENT_ID) ??
      builtinAgentProfile()
    );
  },

  /** Resolve a profile id or fall back to default (disabled / gated → default). */
  resolve(profileId?: string | null): AgentProfile {
    if (profileId) {
      const hit = this.get(profileId);
      if (hit) {
        const gate = canUseProfile({ enabled: hit.enabled, safety: hit.safety });
        if (gate.allowed) return hit;
      }
    }
    return this.getDefault();
  },

  /** Profile ids currently running a turn (chat / channel / automation). */
  busyIds(): string[] {
    return listBusyProfileIds();
  },

  create(input: CreateAgentProfileInput): AgentProfile {
    const name = input.name.trim();
    if (!name) throw new Error("name is required");
    const file = load();
    const cloneFrom = input.cloneFrom ?? BUILTIN_AGENT_ID;
    const source = file.profiles.find((p) => p.id === cloneFrom) ?? builtinAgentProfile();
    let slug = slugifyAgentName(name);
    let id = userAgentId(slug);
    let n = 2;
    while (file.profiles.some((p) => p.id === id)) {
      id = userAgentId(`${slug}-${n++}`);
    }
    const profile = cloneProfile(source, input, id);
    file.profiles.push(profile);
    save(file);
    seedPrincipalMemoryGrants(profile.principalId);
    return profile;
  },

  update(id: string, patch: UpdateAgentProfileInput): AgentProfile | undefined {
    const file = load();
    const profile = file.profiles.find((p) => p.id === id);
    if (!profile) return undefined;
    if (patch.name !== undefined) profile.name = patch.name.trim() || profile.name;
    if (patch.description !== undefined) profile.description = patch.description;
    if (patch.tagline !== undefined) profile.tagline = patch.tagline;
    if (patch.enabled !== undefined) {
      if (id === BUILTIN_AGENT_ID && patch.enabled === false) {
        throw new Error("Cannot disable the built-in agent");
      }
      profile.enabled = patch.enabled;
    }
    if (patch.avatar !== undefined) profile.avatar = patch.avatar;
    if (patch.runtime !== undefined) profile.runtime = patch.runtime;
    if (patch.modelSlot !== undefined) profile.modelSlot = patch.modelSlot;
    if (patch.policyLevel !== undefined) profile.policyLevel = patch.policyLevel;
    if (patch.skills === null) delete profile.skills;
    else if (patch.skills !== undefined) profile.skills = patch.skills;
    if (patch.skillsDisabled === null) delete profile.skillsDisabled;
    else if (patch.skillsDisabled !== undefined) profile.skillsDisabled = patch.skillsDisabled;
    if (patch.safety === null) delete profile.safety;
    else if (patch.safety !== undefined) profile.safety = patch.safety;
    profile.updatedAt = new Date().toISOString();
    save(file);
    return profile;
  },

  remove(id: string): boolean {
    if (id === BUILTIN_AGENT_ID) throw new Error("Cannot delete the built-in agent");
    if (id.startsWith("agent:acp:")) throw new Error("Cannot delete a seeded ACP preset");
    const file = load();
    const before = file.profiles.length;
    file.profiles = file.profiles.filter((p) => p.id !== id);
    if (file.profiles.length === before) return false;
    if (file.defaultProfileId === id) file.defaultProfileId = BUILTIN_AGENT_ID;
    save(file);
    return true;
  },

  setDefault(id: string): AgentProfile {
    const file = load();
    const profile = file.profiles.find((p) => p.id === id);
    if (!profile) throw new Error(`Agent not found: ${id}`);
    if (!profile.enabled) throw new Error("Cannot set a disabled agent as default");
    file.defaultProfileId = id;
    save(file);
    return profile;
  },
};
