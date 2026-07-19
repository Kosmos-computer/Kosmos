/**
 * Content Agent pack installer — seeds skills, creates/updates the Content
 * profile, and upserts disabled automation templates. Thin product layer over
 * existing agent/skill/automation stores (not a marketplace).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentProfile } from "../../shared/agents.js";
import type { Automation } from "../../shared/types.js";
import { agentStore } from "../agents/agentStore.js";
import { skillStore } from "../skills/skillStore.js";
import { automationStore } from "../stores/automationStore.js";

const CONTENT_PROFILE_ID = "agent:user:content";

interface PackAutomationTemplate {
  key: string;
  name: string;
  schedule: string;
  prompt: string;
}

interface ContentPackManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  profile: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    policyLevel: "conservative" | "balanced" | "permissive";
    modelSlot: string;
    skills: string[];
    avatar: { kind: "emoji"; value: string; color: string };
  };
  skillIds: string[];
  automations: PackAutomationTemplate[];
  firstAsk: string;
  brandPrompt: string;
}

export interface ContentPackChecklist {
  brandVoice: boolean;
  slackConnected: boolean;
  peerPaired: boolean;
  peerBoundToContent: boolean;
  automationEnabled: boolean;
  firstAskDone: boolean;
}

export interface ContentPackInstallResult {
  packId: string;
  profile: AgentProfile;
  createdProfile: boolean;
  skillIds: string[];
  automations: Automation[];
  firstAsk: string;
  brandPrompt: string;
  checklist: ContentPackChecklist;
}

function packRoot(): string {
  // server/packs → repo packs/content
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../packs/content");
}

function loadManifest(): ContentPackManifest {
  const file = path.join(packRoot(), "pack.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as ContentPackManifest;
  if (raw.id !== "content") throw new Error("Invalid content pack manifest");
  return raw;
}

/** Ensure pack skills exist under data/skills (repo skills/ is the seed source). */
function ensurePackSkills(skillIds: string[]): void {
  const seedsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../skills");
  skillStore.ensureSeeds(seedsDir);
  for (const id of skillIds) {
    const meta = skillStore.get(id);
    if (!meta) {
      console.warn(`[packs] content skill missing after seed: ${id}`);
    }
  }
}

function ensureContentProfile(manifest: ContentPackManifest): {
  profile: AgentProfile;
  created: boolean;
} {
  const existing = agentStore.get(CONTENT_PROFILE_ID);
  const p = manifest.profile;
  if (existing) {
    const updated =
      agentStore.update(CONTENT_PROFILE_ID, {
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        enabled: true,
        policyLevel: p.policyLevel,
        modelSlot: p.modelSlot,
        skills: p.skills,
        avatar: p.avatar,
      }) ?? existing;
    return { profile: updated, created: false };
  }
  // create() mints agent:user:<slug> — name "Content" → agent:user:content when free
  const created = agentStore.create({
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    policyLevel: p.policyLevel,
    modelSlot: p.modelSlot,
    skills: p.skills,
    avatar: p.avatar,
    runtime: { kind: "builtin" },
  });
  if (created.id !== CONTENT_PROFILE_ID) {
    // Slug collision — rename path: update the new profile's skills anyway and warn
    console.warn(
      `[packs] expected ${CONTENT_PROFILE_ID}, got ${created.id}; using created profile`,
    );
  }
  return { profile: created, created: true };
}

async function upsertAutomations(
  templates: PackAutomationTemplate[],
  profileId: string,
): Promise<Automation[]> {
  const { automations: existing } = await automationStore.list({ limit: 200, offset: 0 });
  const out: Automation[] = [];
  for (const tmpl of templates) {
    const marker = `[pack:content:${tmpl.key}]`;
    const found = existing.find((a) => a.prompt.includes(marker) || a.name === tmpl.name);
    const prompt = `${tmpl.prompt}\n\n${marker}`;
    if (found) {
      const updated = await automationStore.update(found.id, {
        name: tmpl.name,
        prompt,
        schedule: tmpl.schedule,
        trigger: { type: "schedule", schedule: tmpl.schedule },
        profileId,
        enabled: found.enabled, // leave user's enable choice
      });
      out.push(updated);
    } else {
      const created = await automationStore.create({
        name: tmpl.name,
        prompt,
        schedule: tmpl.schedule,
        trigger: { type: "schedule", schedule: tmpl.schedule },
        profileId,
      });
      // Pack templates start disabled until the user enables + sets deliver.
      const disabled = await automationStore.update(created.id, { enabled: false });
      out.push(disabled);
    }
  }
  return out;
}

export async function installContentPack(): Promise<ContentPackInstallResult> {
  const manifest = loadManifest();
  ensurePackSkills(manifest.skillIds);
  const { profile, created } = ensureContentProfile(manifest);
  const automations = await upsertAutomations(manifest.automations, profile.id);

  // Checklist defaults — client refines from live channel/automation state.
  const checklist: ContentPackChecklist = {
    brandVoice: false,
    slackConnected: false,
    peerPaired: false,
    peerBoundToContent: false,
    automationEnabled: automations.some((a) => a.enabled),
    firstAskDone: false,
  };

  return {
    packId: manifest.id,
    profile,
    createdProfile: created,
    skillIds: manifest.skillIds,
    automations,
    firstAsk: manifest.firstAsk,
    brandPrompt: manifest.brandPrompt,
    checklist,
  };
}

export function getContentPackInfo(): {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  profileId: string;
} {
  const manifest = loadManifest();
  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    installed: Boolean(agentStore.get(CONTENT_PROFILE_ID)),
    profileId: CONTENT_PROFILE_ID,
  };
}

export { CONTENT_PROFILE_ID };
