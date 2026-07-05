/**
 * Shared types — the contract between the Arco server and the OS shell.
 * Everything the client renders or mutates crosses this boundary as JSON.
 */

// ── Generated apps ───────────────────────────────────────────────────────────

/** One historical snapshot of an app's openui-lang source. */
export interface VersionEntry {
  content: string;
  timestamp: string;
  source: "create" | "edit" | "restore";
}

/** A durable generated app: openui-lang source + append-only version history. */
export interface StoredApp {
  id: string;
  title: string;
  /** OpenUI Lang markup — the live app content rendered by the Renderer. */
  content: string;
  /** Session id of the originating chat thread (for the refine flow). */
  sessionId: string;
  versions: VersionEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Listing shape — content omitted to keep the dock/library payload small. */
export type AppSummary = Omit<StoredApp, "content" | "versions"> & {
  versionCount: number;
};

// ── Chat sessions ────────────────────────────────────────────────────────────

/**
 * Messages are stored in OpenAI chat-completions shape so the same array
 * replays into the LLM and renders in the UI (assistant text + tool cards).
 */
export interface ChatToolCall {
  id: string;
  name: string;
  /** JSON-encoded arguments as emitted by the model. */
  arguments: string;
}

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ChatToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface Session {
  id: string;
  title: string;
  /** "chat" for user threads, "automation" for headless scheduled runs. */
  kind: "chat" | "automation";
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type SessionSummary = Omit<Session, "messages"> & { messageCount: number };

// ── Agent SSE stream events ──────────────────────────────────────────────────

/** Tabs available in the Studio's context drawer (agent-canvas pattern). */
export type WorkspaceTab = "files" | "diffs" | "terminal" | "preview" | "browser";

/** Shell actions the agent can drive through the `os_ui` tool. */
export type OsUiAction =
  | { action: "open_app"; appId: string }
  | { action: "open_system"; app: string }
  | { action: "notify"; message: string }
  | { action: "open_workspace_tab"; tab: WorkspaceTab; path?: string };

export type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; callId: string; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; callId: string; name: string; result: string }
  | { type: "os_ui"; action: OsUiAction }
  /**
   * Emitted by write_file with the file's prior content so the client can
   * render a real diff. Deliberately an event (not part of the tool result):
   * the LLM never sees the before-text, only the UI does.
   */
  | { type: "file_changed"; path: string; before: string | null; after: string }
  /**
   * A risky exec command is paused server-side until the user answers via
   * POST /api/confirmations/:id (or the request times out to "deny").
   */
  | { type: "confirm_required"; confirmId: string; command: string }
  | { type: "confirm_resolved"; confirmId: string; approved: boolean }
  | { type: "apps_changed" }
  | { type: "automations_changed" }
  | { type: "done" }
  | { type: "error"; message: string };

// ── Automations ──────────────────────────────────────────────────────────────

export interface AutomationRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "ok" | "error";
  /** First lines of the agent's final reply — enough for a history list. */
  summary: string;
  sessionId: string;
}

export interface Automation {
  id: string;
  name: string;
  /** Standard 5-field cron expression. */
  schedule: string;
  prompt: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  runs: AutomationRun[];
}

// ── Settings ─────────────────────────────────────────────────────────────────

export type LlmProvider = "openai" | "anthropic" | "openrouter" | "ollama" | "custom" | "mock";

export interface Settings {
  provider: LlmProvider;
  baseUrl: string;
  /** Never returned in full by the API — masked except last 4 chars. */
  apiKey: string;
  model: string;
  wallpaper: string;
}

/** Provider presets shown in the Settings app. */
export const PROVIDER_PRESETS: Record<Exclude<LlmProvider, "custom" | "mock">, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-5.5" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "anthropic/claude-sonnet-4.5" },
  ollama: { baseUrl: "http://localhost:11434/v1", model: "qwen3:32b" },
};

// ── Files ────────────────────────────────────────────────────────────────────

export interface WorkspaceEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modifiedAt: string;
}

// ── Projects (open folders) ──────────────────────────────────────────────────

/** A directory the user opened as a workspace root ("Open Folder"). */
export interface Project {
  id: string;
  name: string;
  /** Absolute path on the server's filesystem. */
  path: string;
  addedAt: string;
}

/** Registry + active selection; activeId null = built-in sandbox workspace. */
export interface ProjectsInfo {
  projects: Project[];
  activeId: string | null;
}

/** One directory level for the folder-picker browser. */
export interface DirListing {
  path: string;
  parent: string | null;
  dirs: { name: string; path: string; isRepo: boolean }[];
}

// ── Web apps (user projects mounted on the dock) ────────────────────────────

/**
 * A registered external app: a URL to embed, plus (optionally) the command
 * and folder that serve it, so launching from the dock can auto-start a dev
 * server that isn't running.
 */
export interface WebApp {
  id: string;
  name: string;
  url: string;
  command?: string;
  projectPath?: string;
  addedAt: string;
}

/** Launch probe result: running now, or starting because we spawned the command. */
export interface WebAppLaunchStatus {
  running: boolean;
  starting: boolean;
}

// ── Dev processes (long-running commands, e.g. dev servers) ─────────────────

/** A background process started from the Browser tab or by the agent. */
export interface RunEntry {
  id: string;
  command: string;
  pid: number;
  startedAt: string;
  alive: boolean;
}

// ── Git ──────────────────────────────────────────────────────────────────────

/** Porcelain status codes collapsed to what the UI badges. */
export type GitFileState = "modified" | "added" | "deleted" | "renamed" | "untracked" | "conflicted";

export interface GitFileChange {
  path: string;
  state: GitFileState;
  staged: boolean;
}

export interface GitInfo {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  /** Remote tracking ref, e.g. "origin/main" — empty when unset. */
  upstream: string;
  changes: GitFileChange[];
}
