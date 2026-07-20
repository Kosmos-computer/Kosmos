/**
 * System prompt assembly — the Arco identity preamble, the inline-chat OpenUI
 * surface, and a skills index. The chat surface artifact is emitted by
 * `npm run generate` from the same component library that renders the UI, so
 * the model's instructions, the validator, and the renderer never drift
 * apart (the D5 "Generation Contract").
 *
 * The durable-app surface (app-prompt.md, ~600 lines) is deliberately NOT
 * here anymore: it seeds as a gating skill on app_create/app_update, so the
 * agent pages it in with read_skill only on app-building turns. Every other
 * turn gets that context budget back.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentProfile } from "../../shared/agents.js";
import { skillStore } from "../skills/skillStore.js";
import {
  getPrimaryRoot,
  listWorkspaceRoots,
  workspaceStore,
} from "../stores/workspaceStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.join(__dirname, "..", "generated");

function readGenerated(file: string): string {
  return fs.readFileSync(path.join(generatedDir, file), "utf-8");
}

const IDENTITY = `You are Arco, the agent inside Arco OS — a generative operating system. The user talks to you in a chat window on their desktop; you build the rest of their computer around them: live apps, automations, scripts, and data.

Core behaviors:
- You are concise and act immediately. When the user asks for an app, dashboard, tracker, or tool, build it with \`app_create\` in this turn — don't describe what you would build. (Read the required skill first if you haven't yet this session.)
- Before creating, prefer \`list_apps\`: if a generated app already does the job (same or near title), open it or \`app_update\` it — do not invent a new title like "Live Clock" / "Realtime Clock" for the same thing. \`app_create\` upserts same-title apps; use \`forceNew\` only when the user explicitly wants a separate copy.
- Apps you create appear in the dock and open automatically in a desktop window.
- Use \`list_apps\` to see every launchable app (system, installed, generated, web) and each app's \`control\` mode before guessing ids.
- Use \`os_ui\` to open/close/focus/minimize/restore apps and wait for its result — success includes the window title and control mode. Do not assume the window is ready until \`os_ui\` returns.
- You can look things up online: \`web_search\` for current information or finding pages, then \`http_fetch\` to read a specific page. Use them whenever the user asks about something you don't know or that may have changed recently, then report back with what you found.
- For the user's email, use \`mail_list\` / \`mail_read\` / \`mail_send\` (and \`mail_status\` to check connection). For calendar, use \`calendar_*\` tools. Opening those app windows is not enough — call the domain tools. \`control: tools\` or \`open_only\` in list_apps/os_ui means do not drive the app with the mouse.
- For presentations, use \`slides_create\` / \`slides_open\` / \`slides_write\` (read the slides-authoring skill first). Pass a full multi-slide DeckDoc with positioned boxes — never an empty shell — and the deck opens in Slides automatically.
- You have a visible mouse cursor on the user's desktop. Prefer in-process React/OpenUI apps (\`control: cursor\` without a bridge). Installed same-origin apps (Docs, Calculator, …) are driveable via the AppHost UI bridge — snapshot ids look like \`g:installed:…:eN\`. Use \`ui_snapshot\`, then \`mouse_click\` / \`type_text\` / \`select_option\`. For \`control: tools\`, call calendar_*/mail_* (etc.) first. For \`control: open_only\` (remote web embeds without a bridge), only open/focus — do not retry the mouse.
- For recurring work, create automations (\`create_automation\`) — they run your prompt on a cron schedule with no other context.
- You have a persistent workspace (files, scripts) and namespaced SQLite databases. Both survive across sessions, and generated apps read them live.
- For workspace files, use \`list_files\` and \`read_file\` to inspect them and \`write_file\` to create or replace them. Do not use \`exec\` with cat, printf, echo, heredocs, or shell redirection to write file content; \`write_file\` is structured, confined to the workspace, and produces Studio diffs.
- All apps render in windows of any size, from phone-width to full screen. Follow the adaptive layout rules strictly.

The section below defines the openui-lang INLINE CHAT surface (static, fenced in your replies). The DURABLE APP surface (reactive, for app_create/app_update) is documented in a skill you must read first — see the Skills index.

═══════════════════════════════════════════
INLINE CHAT UI (static surface)
═══════════════════════════════════════════

`;

let cached: string | null = null;

export interface BuildSystemPromptOptions {
  profile?: AgentProfile;
}

/**
 * Skills available to this profile — OpenClaw replace semantics:
 * omit skills = all enabled; [] = none; then apply skillsDisabled denylist.
 */
export function skillsForProfile(profile?: AgentProfile) {
  let skills = skillStore.list().filter((s) => s.enabled);
  if (profile?.skills) {
    const allow = new Set(profile.skills);
    skills = skills.filter((s) => allow.has(s.id));
  }
  if (profile?.skillsDisabled?.length) {
    const deny = new Set(profile.skillsDisabled);
    skills = skills.filter((s) => !deny.has(s.id));
  }
  return skills;
}

/**
 * Skills index — id + description lines only. Full bodies are never
 * auto-injected (demand-paged knowledge): the agent reads what a turn
 * needs with read_skill. Rebuilt per turn; listing a handful of SKILL.md
 * frontmatters is cheap next to an LLM call.
 */
function skillsIndex(profile?: AgentProfile): string {
  const skills = skillsForProfile(profile);
  if (skills.length === 0) return "";
  const lines = skills.map((s) => {
    const gates = s.gates.length > 0 ? ` (REQUIRED before: ${s.gates.join(", ")})` : "";
    return `- ${s.id}: ${s.description}${gates}`;
  });
  return `\n\n## Skills
You have skills — instruction files you must read before relying on them. Read one with read_skill(id); tools listed as REQUIRED refuse to run until their skill is read this session. You can also distill a reusable lesson into a skill proposal with save_skill (the user Applies it in Skills to go live). Available:
${lines.join("\n")}`;
}

function profileIdentity(profile?: AgentProfile): string {
  if (!profile || profile.id === "agent:builtin") return "";
  const tag = profile.tagline ? ` — ${profile.tagline}` : "";
  return `\n\n## Active agent profile
You are running as "${profile.name}" (${profile.id})${tag}.
Stay in this persona for tool use and memory; do not claim to be a different agent.`;
}

/**
 * Per-turn workspace context. When a folder is open, the agent works like a
 * coding assistant in that repo; the sandbox note preserves the original
 * generative-OS framing otherwise.
 */
function workspaceContext(): string {
  const state = workspaceStore.get();
  const roots = listWorkspaceRoots();
  if (roots.length === 0) {
    return "\n\nACTIVE WORKSPACE: the Arco sandbox (data/workspace). No user folder is open.";
  }
  const primary = roots.find((r) => r.role === "primary") ?? roots[0];
  const effective = getPrimaryRoot();
  const backendNote =
    state.backend === "drive"
      ? " Backend: Kosmos Drive (file tools use Drive entries; exec/git are unavailable)."
      : state.backend === "remote"
        ? " Backend: remote Arco server."
        : "";
  const worktreeNote =
    state.worktreePath && state.backend === "local"
      ? ` Active git worktree: ${state.worktreePath}.`
      : "";
  const rootLines = roots
    .map((r) => {
      const role = r.role === "primary" ? "primary" : "additional";
      const tip =
        roots.length > 1
          ? ` Address files as "${r.name}/..." when not under the primary cwd.`
          : "";
      return `- ${role}: "${r.name}" (${r.location})${tip}`;
    })
    .join("\n");
  return `\n\nACTIVE WORKSPACE (${state.backend}): primary cwd is "${primary.name}" (${effective}).${backendNote}${worktreeNote}\nAttached roots:\n${rootLines}\nAll file tools resolve inside these roots. Treat them as a real codebase: read before you edit, keep changes minimal and consistent with the project's style, and use git via exec (status/diff/commit) for version control on Local workspaces. Commit only when the user asks. Destructive commands (push, hard reset) will pause for the user's approval.`;
}

export function buildSystemPrompt(opts?: BuildSystemPromptOptions): string {
  if (!cached) {
    cached = IDENTITY + readGenerated("chat-prompt.md");
  }
  return (
    cached +
    profileIdentity(opts?.profile) +
    skillsIndex(opts?.profile) +
    workspaceContext()
  );
}
