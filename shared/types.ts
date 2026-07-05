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
  /** appId is a generated-app id or an installed-app manifest id (e.g. "core.calendar"). */
  | { action: "open_app"; appId: string }
  | { action: "open_system"; app: string }
  | { action: "notify"; message: string }
  | { action: "open_workspace_tab"; tab: WorkspaceTab; path?: string };

/** Choices a policy confirm card can offer beyond plain allow/deny. */
export type ConfirmOption = "once" | "session" | "always" | "deny";

export type AgentEvent =
  | { type: "session"; sessionId: string }
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; callId: string; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; callId: string; name: string; result: string }
  | { type: "os_ui"; action: OsUiAction }
  /**
   * A cursor tool is parked server-side waiting for the shell to execute this
   * command (move/click/type/snapshot) and answer via
   * POST /api/client-requests/:requestId — the confirmations pattern
   * generalized to arbitrary client-side work.
   */
  | { type: "cursor_request"; requestId: string; command: CursorCommand }
  /**
   * Emitted by write_file with the file's prior content so the client can
   * render a real diff. Deliberately an event (not part of the tool result):
   * the LLM never sees the before-text, only the UI does.
   */
  | { type: "file_changed"; path: string; before: string | null; after: string }
  /**
   * A risky exec command or policy-gated tool call is paused server-side
   * until the user answers via POST /api/confirmations/:id (or the request
   * times out to "deny"). When `options` is present the client offers the
   * extended choices (allow once / this session / always / deny); otherwise
   * it's a plain Allow/Deny.
   */
  | {
      type: "confirm_required";
      confirmId: string;
      command: string;
      options?: ConfirmOption[];
    }
  | { type: "confirm_resolved"; confirmId: string; approved: boolean }
  | { type: "apps_changed" }
  | { type: "automations_changed" }
  | { type: "done" }
  | { type: "error"; message: string };

// ── Agent cursor (AI-driven virtual mouse) ──────────────────────────────────
//
// The agent "sees" the shell through a DOM snapshot (interactive elements with
// stable ids) and acts through cursor commands the client executes visually:
// an animated overlay cursor moves to the target, then dispatches real DOM
// events. Element ids — not raw coordinates — are the addressing scheme, so
// clicks still land when windows move between snapshot and action.

/** One interactive element the agent can target, as seen at snapshot time. */
export interface UiElement {
  /** Stable handle stamped on the DOM node as data-arco-cid. */
  id: string;
  /** ARIA role or tag-derived kind: button, link, textbox, checkbox… */
  role: string;
  /** Accessible name — label text, aria-label, placeholder, or trimmed innerText. */
  label: string;
  /** Viewport-relative center + size; informational (the client re-resolves live). */
  rect: { x: number; y: number; w: number; h: number };
  /** True when the element is disabled or aria-disabled. */
  disabled?: boolean;
  /** Current value for inputs, so the agent knows field state. */
  value?: string;
}

/** A window's worth of targets, grouped so the agent reads screen structure. */
export interface UiWindowSnapshot {
  title: string;
  focused: boolean;
  elements: UiElement[];
}

/** The whole visible shell: windows plus global chrome (dock, menu bar). */
export interface UiSnapshot {
  screen: { w: number; h: number };
  windows: UiWindowSnapshot[];
  /** Dock / menu-bar targets that live outside any window. */
  shell: UiElement[];
  /** Embedded surfaces the cursor cannot reach (iframes, canvas editors). */
  opaqueRegions: string[];
}

/** Commands the server-side cursor tools ask the shell to perform. */
export type CursorCommand =
  | { kind: "snapshot" }
  | { kind: "click"; targetId?: string; x?: number; y?: number }
  | { kind: "type"; targetId: string; text: string; submit?: boolean };

/** Shell → server answer for a cursor request. */
export interface CursorResult {
  ok: boolean;
  /** Human-readable outcome ("clicked button 'Save' in 'Settings'"). */
  outcome?: string;
  error?: string;
  snapshot?: UiSnapshot;
}

// ── Agent policy + audit ─────────────────────────────────────────────────────
//
// Policy rules answer "may the agent call this tool, and does it need the
// user first?" — keyed by tool source ("system", "mcp:<serverId>",
// "app:<appId>") optionally narrowed with "#<toolName>". The audit log is the
// shared record of every privileged call, whether an app or the agent made it.

export type AgentPolicyDecision = "auto" | "confirm" | "deny";

/** One privileged call as recorded in audit.jsonl. */
export interface AuditEntry {
  ts: string;
  caller:
    | { kind: "app"; appId: string }
    | { kind: "agent"; sessionId: string }
    /** External callers reaching in through the outward MCP endpoint. */
    | { kind: "external"; clientId: string };
  method: string;
  detail?: string;
  allowed: boolean;
}

// ── MCP servers (Model Context Protocol — external tool providers) ──────────
//
// The transport union deliberately mirrors ACP's `McpServer` schema (stdio |
// http | sse) so the same records can later be forwarded verbatim to an ACP
// agent subprocess — one config store drives both the native loop and
// external agents.

export type McpTransport =
  | { kind: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { kind: "http"; url: string; headers?: Record<string, string> }
  | { kind: "sse"; url: string; headers?: Record<string, string> };

export interface McpServerConfig {
  /** Slug, unique, becomes the tool namespace: mcp__<id>__<tool>. */
  id: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;
  /** Per-tool opt-out (Joplin pattern): disabled tools are hidden from the model. */
  disabledTools?: string[];
  addedAt: string;
}

/** One tool as reported by a server's tools/list. */
export interface McpToolInfo {
  name: string;
  description?: string;
  /** From MCP readOnlyHint annotation — absent means "assume it writes". */
  readOnly?: boolean;
}

export type McpServerStatus = "running" | "stopped" | "error" | "connecting";

/** What the Settings panel renders: masked config + live status + tools. */
export interface McpServerInfo {
  config: McpServerConfig;
  status: McpServerStatus;
  error?: string;
  tools: McpToolInfo[];
}

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

// ── Auth: users, roles, capabilities ─────────────────────────────────────────
//
// Permissions are two-layered: users hold a *role* (what kind of account this
// is) and roles expand to *capabilities* (what API surface they may touch).
// Routes check capabilities, never roles, so adding a role or per-user
// overrides later doesn't require touching route guards.

export type Role = "owner" | "admin" | "member" | "viewer";

export type Capability =
  | "chat" // run agent turns + answer confirmations
  | "apps:manage" // delete/restore generated apps, register web apps
  | "automations:manage"
  | "files:read"
  | "files:write" // also gates project add/remove/switch (changes agent root)
  | "exec" // raw terminal + dev-server runs
  | "git:write" // commit/push/pull (reads are open to any authenticated user)
  | "settings:write"
  | "users:manage";

/**
 * Role → capability expansion. Owner is the machine operator; admin is a
 * trusted co-user without account control; member can build but not touch the
 * terminal or settings; viewer can only look around.
 */
export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  owner: [
    "chat",
    "apps:manage",
    "automations:manage",
    "files:read",
    "files:write",
    "exec",
    "git:write",
    "settings:write",
    "users:manage",
  ],
  admin: [
    "chat",
    "apps:manage",
    "automations:manage",
    "files:read",
    "files:write",
    "exec",
    "git:write",
    "settings:write",
  ],
  member: ["chat", "apps:manage", "automations:manage", "files:read", "files:write", "git:write"],
  viewer: ["files:read"],
};

/** Public user shape — everything the client may know. Never carries hashes. */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  capabilities: Capability[];
}

/** Listing shape for the user-management panel. */
export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

/**
 * Boot-time auth snapshot. `needsSetup` means no accounts exist yet (first
 * run); `locked` means the session is valid but requires the password to
 * resume — the server rejects all non-auth API calls while locked.
 */
export interface AuthStatus {
  needsSetup: boolean;
  authenticated: boolean;
  locked: boolean;
  user?: AuthUser;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export type LlmProvider = "openai" | "anthropic" | "openrouter" | "ollama" | "local" | "custom" | "mock";

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
  /** Arco Models desktop app — llama-server router managed in model-manager/. */
  local: { baseUrl: "http://127.0.0.1:4650/v1", model: "Qwen3-1.7B-Q4_K_M" },
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
