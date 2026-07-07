/**
 * Model registry — the single source of truth for every model the OS knows
 * about, and the slot table that assigns them to use-cases (agent.chat,
 * voice.stt, …). Consumers never read provider strings from settings.json;
 * they call resolveModel(slotId).
 *
 * Legacy mirror: data/settings.json's provider/baseUrl/model/apiKey block
 * remains a synced view of the agent.chat slot during migration — writes to
 * either side converge (PUT /api/settings → syncFromSettings; slot assignment
 * → mirrorAgentSlotToSettings). Retire the mirror once nothing reads it.
 */
import fs from "node:fs";
import path from "node:path";
import type { Settings } from "../../shared/types.js";
import {
  DEFAULT_ASSIGNMENTS,
  LOCAL_ENGINE_BASE_URL,
  MODEL_SEEDS,
  USE_CASE_SLOTS,
  type ModelManifest,
  type ModelSource,
  type RegisteredModel,
  type UseCaseSlotDef,
  type UseCaseSlotSource,
  type UseCaseSlotState,
} from "../../shared/models.js";
import { dataDirs, loadSettings, saveSettings } from "../env.js";
import { parseModelManifest } from "./modelSchema.js";
import { parseCreateUseCaseSlot } from "./useCaseSlotSchema.js";

const MODELS_FILE = path.join(dataDirs.root, "models.json");
const ASSIGNMENTS_FILE = path.join(dataDirs.root, "model-assignments.json");
const CUSTOM_SLOTS_FILE = path.join(dataDirs.root, "custom-use-case-slots.json");

/** LLM connection details a text.chat consumer needs — Settings-field shaped. */
export interface ResolvedLlm {
  /** Registered model id, or null when falling back to legacy settings. */
  modelId: string | null;
  provider: Settings["provider"];
  baseUrl: string;
  model: string;
  apiKey: string;
}

function loadModels(): RegisteredModel[] {
  try {
    return JSON.parse(fs.readFileSync(MODELS_FILE, "utf-8")) as RegisteredModel[];
  } catch {
    return [];
  }
}

function saveModels(models: RegisteredModel[]): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(MODELS_FILE, JSON.stringify(models, null, 2), "utf-8");
}

/** slotId → model id; null = explicitly cleared; absent = never configured. */
function loadAssignments(): Record<string, string | null> {
  try {
    return JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, "utf-8")) as Record<string, string | null>;
  } catch {
    return {};
  }
}

function saveAssignments(assignments: Record<string, string | null>): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), "utf-8");
}

function loadCustomSlots(): UseCaseSlotDef[] {
  try {
    return JSON.parse(fs.readFileSync(CUSTOM_SLOTS_FILE, "utf-8")) as UseCaseSlotDef[];
  } catch {
    return [];
  }
}

function saveCustomSlots(slots: UseCaseSlotDef[]): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(CUSTOM_SLOTS_FILE, JSON.stringify(slots, null, 2), "utf-8");
}

function slugifyLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ggufStem(file: string): string {
  return file.replace(/\.gguf$/i, "");
}

/** The provider label the legacy settings mirror uses for a manifest. */
function providerHint(manifest: ModelManifest): Settings["provider"] {
  if (manifest.runtime.kind === "llama-gguf") return "local";
  const hinted = manifest.meta?.provider;
  if (
    hinted === "openai" ||
    hinted === "anthropic" ||
    hinted === "openrouter" ||
    hinted === "ollama" ||
    hinted === "local"
  ) {
    return hinted;
  }
  return "custom";
}

/** Connection details for one manifest (no fallback logic). */
function endpointOf(manifest: ModelManifest, settings: Settings): Omit<ResolvedLlm, "modelId"> | null {
  const rt = manifest.runtime;
  if (rt.kind === "openai-compatible") {
    const keyFromRef = rt.apiKeyRef ? settings.apiKeys?.[rt.apiKeyRef] : undefined;
    // Migration fallback: the legacy single apiKey belongs to whichever model
    // the settings mirror currently points at.
    const isMirrored = rt.baseUrl === settings.baseUrl && rt.model === settings.model;
    return {
      provider: providerHint(manifest),
      baseUrl: rt.baseUrl,
      model: rt.model,
      apiKey: keyFromRef ?? (isMirrored ? settings.apiKey : ""),
    };
  }
  if (rt.kind === "llama-gguf") {
    return {
      provider: "local",
      baseUrl: LOCAL_ENGINE_BASE_URL,
      model: ggufStem(rt.file),
      apiKey: "",
    };
  }
  return null; // voice-engine models have no OpenAI-style endpoint
}

export const modelStore = {
  list(): RegisteredModel[] {
    return loadModels();
  },

  /** Built-in slots plus user-added slots from disk. */
  allSlotDefs(): Array<UseCaseSlotDef & { source: UseCaseSlotSource }> {
    return [
      ...USE_CASE_SLOTS.map((slot) => ({ ...slot, source: "seed" as const })),
      ...loadCustomSlots().map((slot) => ({ ...slot, source: "user" as const })),
    ];
  },

  getSlotDef(slotId: string): (UseCaseSlotDef & { source: UseCaseSlotSource }) | undefined {
    return this.allSlotDefs().find((slot) => slot.id === slotId);
  },

  /** Register a user-defined use case (persisted to custom-use-case-slots.json). */
  addSlot(raw: unknown): UseCaseSlotDef & { source: "user" } {
    const input = parseCreateUseCaseSlot(raw);
    const existing = this.allSlotDefs();
    const slug = slugifyLabel(input.label) || "use-case";
    let id = `user.${slug}`;
    let suffix = 2;
    while (existing.some((slot) => slot.id === id)) {
      id = `user.${slug}-${suffix++}`;
    }

    if (input.fallback) {
      const fallback = this.getSlotDef(input.fallback);
      if (!fallback) throw new Error(`Unknown fallback slot: ${input.fallback}`);
      if (fallback.requires !== input.requires) {
        throw new Error(`Fallback must require the same capability (${input.requires})`);
      }
      if (input.fallback === id) throw new Error("A use case cannot inherit from itself");
    }

    const slot: UseCaseSlotDef = {
      id,
      label: input.label,
      description: input.description?.trim() || "",
      requires: input.requires,
      ...(input.fallback ? { fallback: input.fallback } : {}),
    };
    const custom = loadCustomSlots();
    custom.push(slot);
    saveCustomSlots(custom);
    return { ...slot, source: "user" };
  },

  /** Remove a user-added use case. Built-in slots cannot be removed. */
  removeSlot(slotId: string): void {
    const slot = this.getSlotDef(slotId);
    if (!slot) return;
    if (slot.source !== "user") throw new Error("Built-in use cases cannot be removed");

    const dependents = this.allSlotDefs().filter((entry) => entry.fallback === slotId);
    if (dependents.length > 0) {
      throw new Error(
        `Other use cases inherit from this slot: ${dependents.map((entry) => entry.label).join(", ")}`,
      );
    }

    saveCustomSlots(loadCustomSlots().filter((entry) => entry.id !== slotId));

    const assignments = loadAssignments();
    if (slotId in assignments) {
      delete assignments[slotId];
      saveAssignments(assignments);
    }
  },

  get(id: string): RegisteredModel | undefined {
    return loadModels().find((m) => m.manifest.id === id);
  },

  /** Register or update in place (same id = update). Validates the manifest. */
  add(rawManifest: unknown, source: ModelSource): RegisteredModel {
    const manifest = parseModelManifest(rawManifest);
    const models = loadModels();
    const existing = models.find((m) => m.manifest.id === manifest.id);
    let record: RegisteredModel;
    if (existing) {
      existing.manifest = manifest;
      existing.source = source;
      record = existing;
    } else {
      record = { manifest, source, enabled: true, addedAt: new Date().toISOString() };
      models.push(record);
    }
    saveModels(models);
    return record;
  },

  setEnabled(id: string, enabled: boolean): RegisteredModel {
    const models = loadModels();
    const record = models.find((m) => m.manifest.id === id);
    if (!record) throw new Error(`Model not registered: ${id}`);
    record.enabled = enabled;
    saveModels(models);
    return record;
  },

  /** Seeds can be disabled but not removed; removal clears any assignments. */
  remove(id: string): void {
    const models = loadModels();
    const record = models.find((m) => m.manifest.id === id);
    if (!record) return;
    if (record.source === "seed") throw new Error("Built-in models can be disabled, not removed");
    saveModels(models.filter((m) => m.manifest.id !== id));
    const assignments = loadAssignments();
    let changed = false;
    for (const [slot, modelId] of Object.entries(assignments)) {
      if (modelId === id) {
        assignments[slot] = null;
        changed = true;
      }
    }
    if (changed) saveAssignments(assignments);
  },

  assignments(): Record<string, string | null> {
    return loadAssignments();
  },

  /** Assign a model to a slot (null clears it). Validates capability match. */
  assign(slotId: string, modelId: string | null): void {
    const slot = this.getSlotDef(slotId);
    if (!slot) throw new Error(`Unknown use-case slot: ${slotId}`);
    if (modelId !== null) {
      const record = this.get(modelId);
      if (!record) throw new Error(`Model not registered: ${modelId}`);
      if (!record.manifest.capabilities.includes(slot.requires)) {
        throw new Error(`${modelId} lacks the ${slot.requires} capability required by ${slotId}`);
      }
    }
    const assignments = loadAssignments();
    assignments[slotId] = modelId;
    saveAssignments(assignments);
    if (slotId === "agent.chat") this.mirrorAgentSlotToSettings();
  },

  /**
   * Resolve the LLM connection for a text.chat slot: assigned model →
   * fallback slot's assigned model → legacy settings fields. Returns the
   * legacy settings connection (modelId null) so callers always get
   * something usable — including the mock provider.
   */
  resolveModel(slotId: string, settings: Settings = loadSettings()): ResolvedLlm {
    const assignments = loadAssignments();
    const seen = new Set<string>();
    let current: string | undefined = slotId;
    while (current && !seen.has(current)) {
      seen.add(current);
      const assigned = assignments[current];
      if (assigned) {
        const record = this.get(assigned);
        if (record?.enabled) {
          const endpoint = endpointOf(record.manifest, settings);
          if (endpoint) return { modelId: record.manifest.id, ...endpoint };
        }
      }
      current = this.getSlotDef(current)?.fallback;
    }
    return {
      modelId: null,
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      model: settings.model,
      apiKey: settings.apiKey,
    };
  },

  /**
   * Connection details for one registered, enabled model — the raw
   * passthrough path (/v1) resolves caller-named models through this.
   * Null for unknown/disabled models and voice engines (no HTTP endpoint).
   */
  resolveEndpoint(modelId: string, settings: Settings = loadSettings()): Omit<ResolvedLlm, "modelId"> | null {
    const record = this.get(modelId);
    if (!record?.enabled) return null;
    return endpointOf(record.manifest, settings);
  },

  /** Slot table with assignment, effective resolution, and eligible models. */
  slots(): UseCaseSlotState[] {
    const settings = loadSettings();
    const assignments = loadAssignments();
    const models = loadModels();
    return this.allSlotDefs().map((def) => {
      const eligible = models
        .filter((m) => m.enabled && m.manifest.capabilities.includes(def.requires))
        .map((m) => ({ id: m.manifest.id, name: m.manifest.name }));
      const assigned = assignments[def.id] ?? null;
      let effective: UseCaseSlotState["effective"] = null;
      if (def.requires === "text.chat") {
        const resolved = this.resolveModel(def.id, settings);
        effective = resolved.modelId
          ? { modelId: resolved.modelId, name: this.get(resolved.modelId)?.manifest.name ?? resolved.modelId }
          : { modelId: null, name: `${resolved.provider} · ${resolved.model} (legacy settings)` };
      } else if (assigned) {
        const record = this.get(assigned);
        if (record) effective = { modelId: assigned, name: record.manifest.name };
      }
      return { ...def, assigned, effective, eligible };
    });
  },

  /**
   * Boot: register/refresh seed manifests (preserving the user's enabled
   * flags), apply default assignments for never-configured slots, and adopt
   * the legacy settings connection into the agent.chat slot on first run.
   */
  ensureSeeded(): void {
    const models = loadModels();
    let changed = false;
    for (const seed of MODEL_SEEDS) {
      const existing = models.find((m) => m.manifest.id === seed.id);
      if (existing) {
        if (JSON.stringify(existing.manifest) !== JSON.stringify(seed)) {
          existing.manifest = seed;
          changed = true;
        }
      } else {
        models.push({ manifest: seed, source: "seed", enabled: true, addedAt: new Date().toISOString() });
        changed = true;
      }
    }
    if (changed) saveModels(models);

    const assignments = loadAssignments();
    let assignmentsChanged = false;
    for (const [slot, modelId] of Object.entries(DEFAULT_ASSIGNMENTS)) {
      if (!(slot in assignments)) {
        assignments[slot] = modelId;
        assignmentsChanged = true;
      }
    }
    if (assignmentsChanged) saveAssignments(assignments);

    if (!("agent.chat" in loadAssignments())) this.syncFromSettings(loadSettings());
  },

  /**
   * Legacy write path: PUT /api/settings changed provider/baseUrl/model.
   * Point agent.chat at the matching registered model (registering a
   * "user.custom" entry when nothing matches) so both surfaces stay in step.
   */
  syncFromSettings(settings: Settings): void {
    const assignments = loadAssignments();
    if (settings.provider === "mock") {
      assignments["agent.chat"] = null;
      saveAssignments(assignments);
      return;
    }

    const models = loadModels();
    const match = models.find((m) => {
      const rt = m.manifest.runtime;
      if (rt.kind === "openai-compatible") {
        return rt.baseUrl === settings.baseUrl && rt.model === settings.model;
      }
      if (rt.kind === "llama-gguf") {
        return settings.provider === "local" && ggufStem(rt.file) === settings.model;
      }
      return false;
    });

    let modelId: string;
    if (match) {
      modelId = match.manifest.id;
      // Migrate the legacy single key into the per-provider key store.
      const rt = match.manifest.runtime;
      if (rt.kind === "openai-compatible" && rt.apiKeyRef && settings.apiKey) {
        if (settings.apiKeys?.[rt.apiKeyRef] !== settings.apiKey) {
          saveSettings({ apiKeys: { ...settings.apiKeys, [rt.apiKeyRef]: settings.apiKey } });
        }
      }
      if (!match.enabled) this.setEnabled(modelId, true);
    } else {
      const manifest: ModelManifest = {
        id: "user.custom",
        name: "Custom endpoint",
        description: "The OpenAI-compatible endpoint configured in Settings.",
        capabilities: ["text.chat"],
        runtime: {
          kind: "openai-compatible",
          baseUrl: settings.baseUrl,
          model: settings.model,
          apiKeyRef: "custom",
        },
        meta: { provider: settings.provider },
      };
      this.add(manifest, "user");
      if (settings.apiKey && settings.apiKeys?.custom !== settings.apiKey) {
        saveSettings({ apiKeys: { ...settings.apiKeys, custom: settings.apiKey } });
      }
      modelId = manifest.id;
    }
    assignments["agent.chat"] = modelId;
    saveAssignments(assignments);
  },

  /** Write the agent.chat slot back into the legacy settings block. */
  mirrorAgentSlotToSettings(): void {
    const settings = loadSettings();
    const resolved = this.resolveModel("agent.chat", settings);
    if (!resolved.modelId) return; // cleared → legacy settings already authoritative
    saveSettings({
      provider: resolved.provider,
      baseUrl: resolved.baseUrl,
      model: resolved.model,
      apiKey: resolved.apiKey,
    });
  },
};
