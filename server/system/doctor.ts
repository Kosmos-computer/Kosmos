/**
 * Doctor / repair — runs known migrations and safe health checks, reporting
 * what was already fine, what was fixed, and what failed.
 *
 * OpenClaw-inspired "arco doctor" surface (Settings → Advanced → Run repair),
 * without cloning their CLI. Prefer calling existing migrate helpers.
 */
import fs from "node:fs";
import path from "node:path";
import type { AgentBackend, Settings } from "../../shared/types.js";
import { dataDirs, hasPlaintextSettingsSecrets, loadSettings, saveSettings } from "../env.js";
import { automationStore } from "../stores/automationStore.js";
import { workspaceStore } from "../stores/workspaceStore.js";

export type DoctorStepStatus = "ok" | "skipped" | "fixed" | "error";

export interface DoctorStep {
  id: string;
  status: DoctorStepStatus;
  detail: string;
}

export interface DoctorReport {
  ok: boolean;
  steps: DoctorStep[];
}

/** Re-export migration used by env load — kept here so doctor can report it. */
function migrateLegacyAgentBackends(raw: Record<string, unknown>): {
  patch: Partial<Settings>;
  needed: boolean;
} {
  if (raw.agentBackends !== undefined || raw.openhandsBackends === undefined) {
    return { patch: {}, needed: false };
  }
  const legacyBackends = raw.openhandsBackends as Array<Record<string, unknown>>;
  return {
    needed: true,
    patch: {
      agentBackends: legacyBackends.map((b) => ({ ...b, kind: "openhands" }) as AgentBackend),
      activeAgentBackendId: (raw.openhandsActiveBackendId as string | null | undefined) ?? null,
    },
  };
}

function settingsFile(): string {
  return path.join(dataDirs.root, "settings.json");
}

function step(
  id: string,
  status: DoctorStepStatus,
  detail: string,
): DoctorStep {
  return { id, status, detail };
}

/**
 * Run repair steps. Safe to call repeatedly (idempotent migrations).
 */
export async function runDoctor(): Promise<DoctorReport> {
  const steps: DoctorStep[] = [];

  // ── Data dirs ────────────────────────────────────────────────────────────
  try {
    fs.mkdirSync(dataDirs.root, { recursive: true });
    fs.mkdirSync(dataDirs.apps, { recursive: true });
    fs.mkdirSync(dataDirs.sessions, { recursive: true });
    fs.mkdirSync(dataDirs.db, { recursive: true });
    fs.mkdirSync(dataDirs.workspace, { recursive: true });
    fs.mkdirSync(path.join(dataDirs.root, "skills"), { recursive: true });
    steps.push(step("data-dirs", "ok", "Data directories present"));
  } catch (err) {
    steps.push(
      step("data-dirs", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  // ── Legacy agent backends (openhandsBackends → agentBackends) ────────────
  try {
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(fs.readFileSync(settingsFile(), "utf-8")) as Record<string, unknown>;
    } catch {
      raw = {};
    }
    const { patch, needed } = migrateLegacyAgentBackends(raw);
    if (!needed) {
      steps.push(step("legacy-agent-backends", "skipped", "No legacy openhandsBackends found"));
    } else {
      saveSettings(patch);
      // Drop legacy keys from disk so the migration doesn't re-trigger forever.
      try {
        const next = JSON.parse(fs.readFileSync(settingsFile(), "utf-8")) as Record<string, unknown>;
        delete next.openhandsBackends;
        delete next.openhandsActiveBackendId;
        fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2), "utf-8");
      } catch {
        // non-fatal — loadSettings still migrates on read
      }
      steps.push(
        step(
          "legacy-agent-backends",
          "fixed",
          `Migrated ${(patch.agentBackends as AgentBackend[] | undefined)?.length ?? 0} OpenHands backend(s)`,
        ),
      );
    }
  } catch (err) {
    steps.push(
      step("legacy-agent-backends", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  // ── Plaintext settings secrets → vault ───────────────────────────────────
  try {
    // loadSettings already seals plaintext keys; re-load to confirm.
    const before = (() => {
      try {
        return JSON.parse(fs.readFileSync(settingsFile(), "utf-8")) as Settings;
      } catch {
        return null;
      }
    })();
    if (!before) {
      steps.push(step("settings-vault", "skipped", "No settings.json yet"));
    } else if (hasPlaintextSettingsSecrets(before as Settings)) {
      loadSettings(); // side-effect: seal + rewrite
      steps.push(step("settings-vault", "fixed", "Moved plaintext API keys into the vault"));
    } else {
      steps.push(step("settings-vault", "ok", "Settings secrets already vaulted or empty"));
    }
  } catch (err) {
    steps.push(
      step("settings-vault", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  // ── Workspace state (projects.activeId → workspace-state.json) ───────────
  try {
    const before = fs.existsSync(path.join(dataDirs.root, "workspace-state.json"));
    workspaceStore.get();
    const after = fs.existsSync(path.join(dataDirs.root, "workspace-state.json"));
    if (!before && after) {
      steps.push(step("workspace-state", "fixed", "Created workspace-state.json from projects"));
    } else if (after) {
      steps.push(step("workspace-state", "ok", "Workspace state present"));
    } else {
      steps.push(step("workspace-state", "ok", "Workspace state resolved (sandbox)"));
    }
  } catch (err) {
    steps.push(
      step("workspace-state", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  // ── Automations: inline runs → automation-runs.json ──────────────────────
  try {
    const list = await automationStore.list({ limit: 1, offset: 0 });
    steps.push(
      step(
        "automations-runs",
        "ok",
        `Automations store healthy (${list.total} automation${list.total === 1 ? "" : "s"})`,
      ),
    );
  } catch (err) {
    steps.push(
      step("automations-runs", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  // ── Skills proposals file ────────────────────────────────────────────────
  try {
    const proposalsPath = path.join(dataDirs.root, "skills", "proposals.json");
    if (!fs.existsSync(proposalsPath)) {
      fs.mkdirSync(path.dirname(proposalsPath), { recursive: true });
      fs.writeFileSync(proposalsPath, "[]\n", "utf-8");
      steps.push(step("skills-proposals", "fixed", "Initialized empty proposals.json"));
    } else {
      steps.push(step("skills-proposals", "ok", "Skill proposals file present"));
    }
  } catch (err) {
    steps.push(
      step("skills-proposals", "error", err instanceof Error ? err.message : String(err)),
    );
  }

  return {
    ok: !steps.some((s) => s.status === "error"),
    steps,
  };
}
