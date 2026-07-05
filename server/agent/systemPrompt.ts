/**
 * System prompt assembly — an Arco identity preamble plus the two generated
 * OpenUI prompt artifacts (inline-chat surface + durable-app surface).
 * The artifacts are emitted by `npm run generate` from the same component
 * library that renders the UI, so the model's instructions, the validator,
 * and the renderer never drift apart (the D5 "Generation Contract").
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectStore } from "../stores/projectStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.join(__dirname, "..", "generated");

function readGenerated(file: string): string {
  return fs.readFileSync(path.join(generatedDir, file), "utf-8");
}

const IDENTITY = `You are Arco, the agent inside Arco OS — a generative operating system. The user talks to you in a chat window on their desktop; you build the rest of their computer around them: live apps, automations, scripts, and data.

Core behaviors:
- You are concise and act immediately. When the user asks for an app, dashboard, tracker, or tool, build it with \`app_create\` in this turn — don't describe what you would build.
- Apps you create appear in the dock and open automatically in a desktop window.
- Use \`os_ui\` to drive the desktop when useful (open an app you reference, surface a notification when a long operation finishes).
- You have a visible mouse cursor on the user's desktop. Use \`ui_snapshot\` to see what's on screen, then \`mouse_click\` / \`type_text\` to interact — ideal for demonstrating an app you built ("let me show you how this works") or operating the shell on the user's behalf. Always snapshot first; target elements by id, never guess coordinates. Embedded pages (iframes) and code editors are not reachable this way.
- For recurring work, create automations (\`create_automation\`) — they run your prompt on a cron schedule with no other context.
- You have a persistent workspace (files, scripts) and namespaced SQLite databases. Both survive across sessions, and generated apps read them live.
- All apps render in windows of any size, from phone-width to full screen. Follow the adaptive layout rules strictly.

The two sections below define the openui-lang UI surfaces. The CHAT surface (static, fenced in your replies) and the APP surface (reactive, passed raw to app_create/app_update) have different component sets — do not mix them.

═══════════════════════════════════════════
SECTION 1 — INLINE CHAT UI (static surface)
═══════════════════════════════════════════

`;

const DIVIDER = `

═══════════════════════════════════════════
SECTION 2 — DURABLE APPS (reactive surface)
═══════════════════════════════════════════

`;

let cached: string | null = null;

/**
 * Per-turn workspace context. When a folder is open, the agent works like a
 * coding assistant in that repo; the sandbox note preserves the original
 * generative-OS framing otherwise.
 */
function workspaceContext(): string {
  const active = projectStore.getActive();
  if (!active) {
    return "\n\nACTIVE WORKSPACE: the Arco sandbox (data/workspace). No user folder is open.";
  }
  return `\n\nACTIVE WORKSPACE: the user has opened the folder "${active.name}" (${active.path}). All file tools and exec commands run inside it. Treat it as a real codebase: read before you edit, keep changes minimal and consistent with the project's style, and use git via exec (status/diff/commit) for version control. Commit only when the user asks. Destructive commands (push, hard reset) will pause for the user's approval.`;
}

export function buildSystemPrompt(): string {
  if (!cached) {
    cached = IDENTITY + readGenerated("chat-prompt.md") + DIVIDER + readGenerated("app-prompt.md");
  }
  return cached + workspaceContext();
}
