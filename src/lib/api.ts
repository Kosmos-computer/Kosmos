/**
 * API client — thin typed wrappers over the Arco server routes plus the SSE
 * reader for agent turns (parsing pattern from openui-dashboard's llm-stream).
 */
import type {
  AgentEvent,
  AgentPolicyDecision,
  AgentToolInfo,
  AppSummary,
  AuditEntry,
  AuthSessionResponse,
  AuthStatus,
  AuthUser,
  Role,
  UserSummary,
  Automation,
  AutomationHealthResponse,
  AutomationRun,
  AutomationRunsResponse,
  AutomationsListResponse,
  AutomationTrigger,
  ChannelInfo,
  DeliveryTarget,
  DirListing,
  ExternalAccessInfo,
  ExternalClientScope,
  GitInfo,
  InstallStatus,
  WorkspaceFeatures,
  McpServerInfo,
  McpTransport,
  Project,
  ProjectsInfo,
  RunEntry,
  Session,
  SessionSummary,
  GenerateUiResponse,
  SavedGeneratorCatalogItem,
  ImageGenHistoryItem,
  GenerateImageResponse,
  ImageGenStatus,
  ImageGenSize,
  ImageGenStyle,
  Settings,
  UsageResponse,
  BillingStatus,
  BillingAddons,
  StorageStatus,
  CursorConnectionStatus,
  CursorModelInfo,
  AgentBackend,
  AgentBackendKind,
  AgentBackendConnectionStatus,
  OpenRouterModelInfo,
  Skill,
  SkillMeta,
  StoredApp,
  WebApp,
  WebAppLaunchStatus,
  WorkspaceEntry,
} from "@shared/types";
import type { CreateUseCaseSlotInput, EngineStatus, RegisteredModel, UseCaseSlotState } from "@shared/models";
import type { CalendarEvent, CalendarEventInput } from "@shared/capabilities/calendar";
import type { Task, TaskInput, TaskStatus } from "@shared/capabilities/tasks";
import type { FileCreateInput, FileEntry } from "@shared/capabilities/files";
import type { ShareCreateInput, ShareRecord } from "@shared/capabilities/shares";
import type { InstalledAppInfo, GrantState } from "@shared/manifest";
import type {
  MailAccountInfo,
  MailFolderId,
  MailInboxFilter,
  MailSendInput,
  MailThread,
  MailThreadDetail,
} from "@shared/mail";
import type { GitHubAccountInfo, GitHubRepoSummary } from "@shared/github";

/** GET /api/models — the registry and the slot table in one payload. */
export interface ModelsResponse {
  models: RegisteredModel[];
  slots: UseCaseSlotState[];
}

/** One contract's provider assignment + who could provide it. */
export interface CapabilityProviderInfo {
  contractId: string;
  provider: string;
  options: { id: string; name: string }[];
}

/**
 * Session-expiry broadcast: any 401 outside the auth endpoints means the
 * cookie died or the session was locked from elsewhere. Rather than have
 * every caller handle it, we emit one window event the auth store listens
 * for, flipping the shell back to the login or lock screen.
 */
export type AuthFailureCode = "unauthenticated" | "locked";

function broadcastAuthFailure(body: string): void {
  let code: AuthFailureCode = "unauthenticated";
  try {
    const parsed = JSON.parse(body) as { code?: string };
    if (parsed.code === "locked") code = "locked";
  } catch {
    // Non-JSON body — treat as a plain expired session.
  }
  window.dispatchEvent(new CustomEvent<AuthFailureCode>("arco:auth-failure", { detail: code }));
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 && !res.url.includes("/api/auth/")) broadcastAuthFailure(body);
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** POST JSON helper — the auth routes are all small JSON round-trips. */
function post<T>(url: string, body?: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }).then((r) => json<T>(r));
}

export const api = {
  // Auth
  authStatus: () => fetch("/api/auth/status").then((r) => json<AuthStatus>(r)),
  authSetup: (data: {
    username: string;
    displayName?: string;
    password: string;
    settings?: Partial<Settings>;
  }) => post<AuthSessionResponse>("/api/auth/setup", data),
  installStatus: () => fetch("/api/system/install-status").then((r) => json<InstallStatus>(r)),
  workspaceFeatures: () =>
    fetch("/api/system/workspace-features").then((r) => json<WorkspaceFeatures>(r)),
  authLogin: (username: string, password: string) =>
    post<AuthSessionResponse>("/api/auth/login", { username, password }),
  authLogout: () => post<{ ok: true }>("/api/auth/logout"),
  authLock: () => post<{ ok: true }>("/api/auth/lock"),
  authUnlock: (password: string) => post<AuthSessionResponse>("/api/auth/unlock", { password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true }>("/api/auth/password", { currentPassword, newPassword }),
  listUsers: () => fetch("/api/auth/users").then((r) => json<UserSummary[]>(r)),
  createUser: (data: { username: string; displayName?: string; password: string; role: Role }) =>
    post<AuthUser>("/api/auth/users", data),
  updateUser: (id: string, patch: { role?: Role; password?: string }) =>
    fetch(`/api/auth/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<{ ok: true }>(r)),
  deleteUser: (id: string) =>
    fetch(`/api/auth/users/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),

  // Apps
  listApps: () => fetch("/api/apps").then((r) => json<AppSummary[]>(r)),
  getApp: (id: string) => fetch(`/api/apps/${id}`).then((r) => json<StoredApp>(r)),
  deleteApp: (id: string) => fetch(`/api/apps/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  restoreApp: (id: string, versionIndex: number) =>
    fetch(`/api/apps/${id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionIndex }),
    }).then((r) => json<StoredApp>(r)),

  // UI Generator
  listGeneratorCatalog: () =>
    fetch("/api/generator/catalog").then((r) => json<SavedGeneratorCatalogItem[]>(r)),
  generateUi: (prompt: string) =>
    fetch("/api/generator/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).then((r) => json<GenerateUiResponse>(r)),
  saveGeneratorCatalogItem: (input: {
    label: string;
    code: string;
    prompt?: string;
    tier?: SavedGeneratorCatalogItem["tier"];
  }) =>
    fetch("/api/generator/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<SavedGeneratorCatalogItem>(r)),
  deleteGeneratorCatalogItem: (id: string) =>
    fetch(`/api/generator/catalog/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),

  // Image Gen
  getImageGenStatus: () => fetch("/api/image-gen/status").then((r) => json<ImageGenStatus>(r)),
  listImageGenHistory: () => fetch("/api/image-gen/history").then((r) => json<ImageGenHistoryItem[]>(r)),
  generateImage: (input: { prompt: string; size?: ImageGenSize; style?: ImageGenStyle }) =>
    fetch("/api/image-gen/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<GenerateImageResponse>(r)),
  deleteImageGenHistoryItem: (id: string) =>
    fetch(`/api/image-gen/history/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),

  // App runtime tool bridge (Query/Mutation — no LLM)
  invokeTool: (tool: string, params: Record<string, unknown>) =>
    fetch("/api/tools/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, params }),
    }).then(async (res) => {
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Tool invoke failed");
      return data.result;
    }),

  // Sessions
  listSessions: () => fetch("/api/sessions").then((r) => json<SessionSummary[]>(r)),
  getSession: (id: string) => fetch(`/api/sessions/${id}`).then((r) => json<Session>(r)),
  deleteSession: (id: string) =>
    fetch(`/api/sessions/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  updateSessionTitle: (id: string, title: string) =>
    fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => json<Session>(r)),

  // Automations — paginated list, detail, runs, dispatch.
  automationHealth: () =>
    fetch("/api/automations/health").then((r) => json<AutomationHealthResponse>(r)),
  listAutomations: (params: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetch(`/api/automations${query ? `?${query}` : ""}`).then((r) =>
      json<AutomationsListResponse>(r),
    );
  },
  getAutomation: (id: string) =>
    fetch(`/api/automations/${encodeURIComponent(id)}`).then((r) => json<Automation>(r)),
  listAutomationRuns: (id: string, params: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetch(`/api/automations/${encodeURIComponent(id)}/runs${query ? `?${query}` : ""}`).then(
      (r) => json<AutomationRunsResponse>(r),
    );
  },
  createAutomation: (data: {
    name: string;
    schedule?: string;
    prompt: string;
    trigger?: AutomationTrigger;
    timezone?: string;
    model?: string;
    mcpServerIds?: string[];
    deliver?: DeliveryTarget;
  }) =>
    fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Automation>(r)),
  updateAutomation: (
    id: string,
    patch: Partial<
      Pick<Automation, "name" | "schedule" | "prompt" | "enabled" | "timezone" | "model" | "trigger">
    > & {
      deliver?: DeliveryTarget | null;
      mcpServerIds?: string[];
      webhookSecret?: string;
    },
  ) =>
    fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Automation>(r)),
  deleteAutomation: (id: string) =>
    fetch(`/api/automations/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  runAutomation: (id: string) =>
    fetch(`/api/automations/${id}/dispatch`, { method: "POST" }).then((r) => json<AutomationRun>(r)),

  // Files
  listFiles: (path = ".") =>
    fetch(`/api/files?path=${encodeURIComponent(path)}`).then((r) => json<WorkspaceEntry[]>(r)),
  readFile: (path: string) =>
    fetch(`/api/files/content?path=${encodeURIComponent(path)}`).then((r) =>
      json<{ path: string; content: string }>(r),
    ),
  writeFile: (path: string, content: string) =>
    fetch("/api/files/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    }).then((r) => json<{ ok: true }>(r)),

  // Drive (os.files@1)
  listDriveEntries: (params: { parentId?: string | null; trashed?: boolean; starred?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (params.parentId !== undefined) qs.set("parentId", params.parentId ?? "null");
    if (params.trashed) qs.set("trashed", "true");
    if (params.starred) qs.set("starred", "true");
    const query = qs.toString();
    return fetch(`/api/drive/entries${query ? `?${query}` : ""}`).then((r) => json<FileEntry[]>(r));
  },
  listDriveRecent: (limit = 20) =>
    fetch(`/api/drive/recent?limit=${limit}`).then((r) => json<FileEntry[]>(r)),
  searchDrive: (query: string) =>
    fetch(`/api/drive/search?q=${encodeURIComponent(query)}`).then((r) => json<FileEntry[]>(r)),
  getDriveEntry: (id: string) =>
    fetch(`/api/drive/entries/${encodeURIComponent(id)}`).then((r) => json<FileEntry>(r)),
  readDriveContent: (id: string) =>
    fetch(`/api/drive/content/${encodeURIComponent(id)}`).then((r) =>
      json<{ id: string; name: string; content: string; mimeType: string }>(r),
    ),
  driveBlobUrl: (id: string) => `/api/drive/blob/${encodeURIComponent(id)}`,
  fetchDriveBlob: async (id: string) => {
    const res = await fetch(`/api/drive/blob/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    return res.blob();
  },
  writeDriveContent: (id: string, content: string) =>
    fetch(`/api/drive/content/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).then((r) => json<FileEntry>(r)),
  createDriveEntry: (input: FileCreateInput) =>
    fetch("/api/drive/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<FileEntry>(r)),
  patchDriveEntry: (
    id: string,
    patch: { name?: string; starred?: boolean; parentId?: string | null },
  ) =>
    fetch(`/api/drive/entries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<FileEntry>(r)),
  trashDriveEntry: (id: string) =>
    fetch(`/api/drive/entries/${encodeURIComponent(id)}/trash`, { method: "POST" }).then((r) =>
      json<FileEntry>(r),
    ),
  restoreDriveEntry: (id: string) =>
    fetch(`/api/drive/entries/${encodeURIComponent(id)}/restore`, { method: "POST" }).then((r) =>
      json<FileEntry>(r),
    ),
  deleteDriveEntry: (id: string) =>
    fetch(`/api/drive/entries/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ deleted: boolean }>(r),
    ),
  uploadDriveFile: async (file: File, parentId: string | null = null) => {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          reject(new Error("Could not read file"));
          return;
        }
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          reject(new Error("Could not encode file"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
    return fetch("/api/drive/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name,
        kind: "file",
        mimeType: file.type || "application/octet-stream",
        parentId,
        contentBase64,
      } satisfies FileCreateInput),
    }).then((r) => json<FileEntry>(r));
  },
  downloadDriveFile: async (id: string, name: string) => {
    const res = await fetch(`/api/drive/blob/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  // Shares (os.shares@1)
  listShares: (fileId?: string) => {
    const qs = fileId ? `?fileId=${encodeURIComponent(fileId)}` : "";
    return fetch(`/api/shares${qs}`).then((r) => json<(ShareRecord & { url: string })[]>(r));
  },
  createShare: (input: ShareCreateInput) =>
    fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<ShareRecord & { url: string }>(r)),
  revokeShare: (id: string) =>
    fetch(`/api/shares/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<ShareRecord>(r),
    ),
  updateShare: (
    id: string,
    patch: {
      mode?: "download" | "view";
      allowDownload?: boolean;
      password?: string;
      expiresAt?: string | null;
      label?: string | null;
    },
  ) =>
    fetch(`/api/shares/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<ShareRecord & { url: string }>(r)),

  // Calendar (os.calendar@1)
  listCalendarEvents: (params: { from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const query = qs.toString();
    return fetch(`/api/calendar/events${query ? `?${query}` : ""}`).then((r) => json<CalendarEvent[]>(r));
  },
  getCalendarEvent: (id: string) =>
    fetch(`/api/calendar/events/${encodeURIComponent(id)}`).then((r) => json<CalendarEvent>(r)),
  createCalendarEvent: (input: CalendarEventInput) =>
    fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<CalendarEvent>(r)),
  updateCalendarEvent: (id: string, patch: Partial<CalendarEventInput>) =>
    fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<CalendarEvent>(r)),
  deleteCalendarEvent: (id: string) =>
    fetch(`/api/calendar/events/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ deleted: boolean }>(r),
    ),

  listTasks: (params: { status?: TaskStatus; archived?: boolean; dueBefore?: string; dueAfter?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.archived !== undefined) qs.set("archived", String(params.archived));
    if (params.dueBefore) qs.set("dueBefore", params.dueBefore);
    if (params.dueAfter) qs.set("dueAfter", params.dueAfter);
    const query = qs.toString();
    return fetch(`/api/tasks${query ? `?${query}` : ""}`).then((r) => json<Task[]>(r));
  },
  getTask: (id: string) => fetch(`/api/tasks/${encodeURIComponent(id)}`).then((r) => json<Task>(r)),
  createTask: (input: TaskInput) =>
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => json<Task>(r)),
  updateTask: (id: string, patch: Partial<TaskInput>) =>
    fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Task>(r)),
  completeTask: (id: string, completed = true) =>
    fetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).then((r) => json<Task>(r)),
  deleteTask: (id: string) =>
    fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ deleted: boolean }>(r),
    ),

  // Terminal
  exec: (command: string) =>
    fetch("/api/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    }).then((r) => json<{ stdout: string; stderr: string; exitCode: number }>(r)),

  // Projects (open folders)
  listProjects: () => fetch("/api/projects").then((r) => json<ProjectsInfo>(r)),
  addProject: (path: string) =>
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).then((r) => json<Project>(r)),
  setActiveProject: (id: string | null) =>
    fetch("/api/projects/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((r) => json<ProjectsInfo>(r)),
  removeProject: (id: string) =>
    fetch(`/api/projects/${id}`, { method: "DELETE" }).then((r) => json<ProjectsInfo>(r)),
  cloneGitRepo: (repo: string, branch?: string) =>
    fetch("/api/projects/clone-git", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo, ...(branch ? { branch } : {}) }),
    }).then((r) => json<Project>(r)),
  browseDirs: (path?: string) =>
    fetch(`/api/fs/browse${path ? `?path=${encodeURIComponent(path)}` : ""}`).then((r) =>
      json<DirListing>(r),
    ),
  // Web apps (dock-mounted user projects)
  listWebApps: () => fetch("/api/webapps").then((r) => json<WebApp[]>(r)),
  addWebApp: (data: { name: string; url: string; command?: string; projectPath?: string }) =>
    fetch("/api/webapps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<WebApp>(r)),
  removeWebApp: (id: string) =>
    fetch(`/api/webapps/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  launchWebApp: (id: string) =>
    fetch(`/api/webapps/${id}/launch`, { method: "POST" }).then((r) => json<WebAppLaunchStatus>(r)),

  // Installed apps (manifest-based platform apps)
  listInstalledApps: () => fetch("/api/installed-apps").then((r) => json<InstalledAppInfo[]>(r)),
  installApp: (payload: { url?: string; manifest?: unknown }) =>
    post<InstalledAppInfo>("/api/installed-apps", payload),
  uninstallApp: (id: string) =>
    fetch(`/api/installed-apps/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  setAppEnabled: (id: string, enabled: boolean) =>
    fetch(`/api/installed-apps/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).then((r) => json<InstalledAppInfo>(r)),
  setAppGrant: (id: string, key: string, state: GrantState) =>
    fetch(`/api/installed-apps/${encodeURIComponent(id)}/grants`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, state }),
    }).then((r) => json<{ grants: Record<string, GrantState> }>(r)),
  mintAppToken: (id: string) =>
    post<{ token: string }>(`/api/installed-apps/${encodeURIComponent(id)}/token`),
  /** Forward one bridge call on behalf of an app window (AppHost only). */
  bridgeInvoke: (token: string, method: string, params: Record<string, unknown>) =>
    fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-token": token },
      body: JSON.stringify({ method, params }),
    }).then(async (res) => {
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Bridge call failed");
      return data.result;
    }),

  // Dev-server runs
  listRuns: () => fetch("/api/runs").then((r) => json<RunEntry[]>(r)),
  startRun: (command: string) =>
    fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    }).then((r) => json<RunEntry>(r)),
  stopRun: (id: string) =>
    fetch(`/api/runs/${id}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),
  runLog: (id: string) => fetch(`/api/runs/${id}/log`).then((r) => json<{ log: string }>(r)),

  nativePickFolder: () =>
    fetch("/api/system/native-pick", { method: "POST" }).then((r) => json<{ path: string }>(r)),
  openPrivacySettings: () =>
    fetch("/api/system/open-privacy-settings", { method: "POST" }).then((r) => json<{ ok: true }>(r)),

  // Git (active project root)
  gitInfo: () => fetch("/api/git/info").then((r) => json<GitInfo>(r)),
  gitDiff: (path: string) =>
    fetch(`/api/git/diff?path=${encodeURIComponent(path)}`).then((r) =>
      json<{ before: string | null; after: string | null }>(r),
    ),
  gitCommit: (message: string, paths?: string[]) =>
    fetch("/api/git/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, paths }),
    }).then((r) => json<{ ok: true; output: string }>(r)),
  gitPush: () => fetch("/api/git/push", { method: "POST" }).then((r) => json<{ ok: true; output: string }>(r)),
  gitPull: () => fetch("/api/git/pull", { method: "POST" }).then((r) => json<{ ok: true; output: string }>(r)),

  // Exec / policy confirmations — `remember` scopes an extended answer
  // ("session" allows for the rest of the chat, "always" persists a rule).
  answerConfirmation: (id: string, approved: boolean, remember?: "session" | "always") =>
    fetch(`/api/confirmations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, ...(remember ? { remember } : {}) }),
    }).then((r) => json<{ ok: boolean }>(r)),

  // Agent policy (which tools the agent may use, and how)
  getAgentPolicy: () =>
    fetch("/api/agent-policy").then((r) => json<{ rules: Record<string, AgentPolicyDecision> }>(r)),
  setAgentPolicyRule: (key: string, decision: AgentPolicyDecision | null) =>
    fetch("/api/agent-policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, decision }),
    }).then((r) => json<{ rules: Record<string, AgentPolicyDecision> }>(r)),

  // Built-in agent tools (catalog + enabled state; toggles persist via saveSettings)
  listAgentTools: () => fetch("/api/agent-tools").then((r) => json<AgentToolInfo[]>(r)),

  // Audit log
  getAudit: (opts?: { limit?: number; caller?: string }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.caller) params.set("caller", opts.caller);
    const qs = params.toString();
    return fetch(`/api/audit${qs ? `?${qs}` : ""}`).then((r) => json<AuditEntry[]>(r));
  },

  // Skills (reusable instruction bundles for the agent)
  listSkills: () => fetch("/api/skills").then((r) => json<SkillMeta[]>(r)),
  getSkill: (id: string) =>
    fetch(`/api/skills/${encodeURIComponent(id)}`).then((r) => json<Skill>(r)),
  createSkill: (data: { name: string; description: string; body: string; gates?: string[] }) =>
    post<Skill>("/api/skills", data),
  updateSkill: (
    id: string,
    patch: {
      name?: string;
      description?: string;
      body?: string;
      gates?: string[];
      enabled?: boolean;
    },
  ) =>
    fetch(`/api/skills/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Skill>(r)),
  deleteSkill: (id: string) =>
    fetch(`/api/skills/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),

  // MCP servers (external tool providers for the agent)
  listMcpServers: () => fetch("/api/mcp-servers").then((r) => json<McpServerInfo[]>(r)),
  addMcpServer: (data: { name: string; transport: McpTransport }) =>
    post<McpServerInfo>("/api/mcp-servers", data),
  updateMcpServer: (
    id: string,
    patch: {
      name?: string;
      transport?: McpTransport;
      enabled?: boolean;
      disabledTools?: string[];
    },
  ) =>
    fetch(`/api/mcp-servers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<McpServerInfo>(r)),
  removeMcpServer: (id: string) =>
    fetch(`/api/mcp-servers/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  restartMcpServer: (id: string) =>
    post<McpServerInfo>(`/api/mcp-servers/${encodeURIComponent(id)}/restart`),
  mcpServerLog: (id: string) =>
    fetch(`/api/mcp-servers/${encodeURIComponent(id)}/log`).then((r) => json<{ log: string }>(r)),

  // Mail (Gmail OAuth + live proxy)
  mailStatus: () =>
    fetch("/api/mail/status").then((r) =>
      json<{ oauthConfigured: boolean; accounts: MailAccountInfo[] }>(r),
    ),
  listMailAccounts: () => fetch("/api/mail/accounts").then((r) => json<MailAccountInfo[]>(r)),
  disconnectMailAccount: (id: string) =>
    fetch(`/api/mail/accounts/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  connectGmail: () => {
    window.location.href = "/api/mail/oauth/google/start";
  },
  listMailThreads: (params: {
    folder?: MailFolderId;
    filter?: MailInboxFilter;
    q?: string;
    accountId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.folder) query.set("folder", params.folder);
    if (params.filter) query.set("filter", params.filter);
    if (params.q) query.set("q", params.q);
    if (params.accountId) query.set("accountId", params.accountId);
    const suffix = query.toString();
    return fetch(`/api/mail/threads${suffix ? `?${suffix}` : ""}`).then((r) => json<MailThread[]>(r));
  },
  getMailThread: (id: string, accountId?: string) => {
    const suffix = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return fetch(`/api/mail/threads/${encodeURIComponent(id)}${suffix}`).then((r) =>
      json<MailThreadDetail>(r),
    );
  },
  sendMail: (input: MailSendInput & { accountId?: string }) =>
    post<{ ok: true }>("/api/mail/send", input),
  starMailThread: (id: string, starred: boolean, accountId?: string) =>
    post<{ ok: true }>(`/api/mail/threads/${encodeURIComponent(id)}/star`, { starred, accountId }),

  // GitHub (OAuth + repo picker)
  githubStatus: () =>
    fetch("/api/github/status").then((r) =>
      json<{ oauthConfigured: boolean; accounts: GitHubAccountInfo[] }>(r),
    ),
  listGitHubRepos: (q?: string, accountId?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (accountId) params.set("accountId", accountId);
    const suffix = params.toString();
    return fetch(`/api/github/repos${suffix ? `?${suffix}` : ""}`).then((r) =>
      json<GitHubRepoSummary[]>(r),
    );
  },
  disconnectGitHubAccount: (id: string) =>
    fetch(`/api/github/accounts/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  connectGitHubPat: (token: string) =>
    post<GitHubAccountInfo>("/api/github/accounts/pat", { token }),
  connectGitHub: () => {
    window.location.href = "/api/github/oauth/start";
  },

  // Channels (external messaging: Telegram, …)
  listChannels: () => fetch("/api/channels").then((r) => json<ChannelInfo[]>(r)),
  addChannel: (data: { kind: "telegram"; name: string; token: string }) =>
    post<ChannelInfo>("/api/channels", data),
  updateChannel: (id: string, patch: { name?: string; token?: string; enabled?: boolean }) =>
    fetch(`/api/channels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<ChannelInfo>(r)),
  removeChannel: (id: string) =>
    fetch(`/api/channels/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  restartChannel: (id: string) =>
    post<ChannelInfo>(`/api/channels/${encodeURIComponent(id)}/restart`),
  resolvePairing: (id: string, code: string, approve: boolean) =>
    post<ChannelInfo>(
      `/api/channels/${encodeURIComponent(id)}/pairings/${encodeURIComponent(code)}`,
      { approve },
    ),
  removeChannelPeer: (id: string, chatId: string) =>
    fetch(
      `/api/channels/${encodeURIComponent(id)}/peers/${encodeURIComponent(chatId)}`,
      { method: "DELETE" },
    ).then((r) => json<ChannelInfo>(r)),

  // External access (Arco as an outward MCP server)
  getExternalAccess: () =>
    fetch("/api/external-access").then((r) => json<ExternalAccessInfo>(r)),
  setExternalAccessEnabled: (enabled: boolean) =>
    fetch("/api/external-access", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).then((r) => json<ExternalAccessInfo>(r)),
  mintExternalClient: (name: string, scope: ExternalClientScope) =>
    post<{ id: string; token: string }>("/api/external-access/clients", { name, scope }),
  updateExternalClient: (id: string, patch: { enabled?: boolean; scope?: ExternalClientScope }) =>
    fetch(`/api/external-access/clients/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<ExternalAccessInfo>(r)),
  revokeExternalClient: (id: string) =>
    fetch(`/api/external-access/clients/${encodeURIComponent(id)}`, { method: "DELETE" }).then(
      (r) => json<ExternalAccessInfo>(r),
    ),

  // Model registry (docs/model-hub-plan.md) — models, use-case slots, local engine
  getModels: () => fetch("/api/models").then((r) => json<ModelsResponse>(r)),
  registerModel: (body: { manifest?: unknown; url?: string; apiKey?: string }) =>
    post<RegisteredModel>("/api/models", body),
  setModelEnabled: (id: string, enabled: boolean) =>
    fetch(`/api/models/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    }).then((r) => json<RegisteredModel>(r)),
  deleteModel: (id: string) =>
    fetch(`/api/models/${encodeURIComponent(id)}`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),
  assignModelSlot: (slotId: string, modelId: string | null) =>
    fetch(`/api/models/slots/${encodeURIComponent(slotId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    }).then((r) => json<{ slots: UseCaseSlotState[] }>(r)),
  addUseCaseSlot: (body: CreateUseCaseSlotInput) =>
    fetch("/api/models/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ slot: UseCaseSlotState; slots: UseCaseSlotState[] }>(r)),
  removeUseCaseSlot: (slotId: string) =>
    fetch(`/api/models/slots/${encodeURIComponent(slotId)}`, { method: "DELETE" }).then((r) =>
      json<{ slots: UseCaseSlotState[] }>(r),
    ),
  getEngineStatus: () => fetch("/api/models/engine").then((r) => json<EngineStatus>(r)),
  startEngine: () => post<EngineStatus>("/api/models/engine/start"),
  stopEngine: () => post<EngineStatus>("/api/models/engine/stop"),
  downloadModel: (id: string) =>
    post<{ started: true }>(`/api/models/${encodeURIComponent(id)}/download`),
  removeModelDownload: (id: string) =>
    fetch(`/api/models/${encodeURIComponent(id)}/download`, { method: "DELETE" }).then((r) =>
      json<{ ok: true }>(r),
    ),

  // Capability providers (default apps per contract)
  getCapabilityProviders: () =>
    fetch("/api/capability-providers").then((r) => json<CapabilityProviderInfo[]>(r)),
  setCapabilityProvider: (contractId: string, providerId: string) =>
    fetch("/api/capability-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId, providerId }),
    }).then((r) => json<{ ok: true }>(r)),

  // Client requests (agent cursor — shell-executed tool work)
  answerClientRequest: (id: string, result: unknown) =>
    fetch(`/api/client-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    }).then((r) => json<{ ok: boolean }>(r)),

  // Settings
  getSettings: () => fetch("/api/settings").then((r) => json<Settings>(r)),
  getUsage: (refresh = false) =>
    fetch(`/api/usage${refresh ? "?refresh=1" : ""}`).then((r) => json<UsageResponse>(r)),
  getBillingStatus: (refresh = false) =>
    fetch(`/api/billing/status${refresh ? "?refresh=1" : ""}`).then((r) => json<BillingStatus>(r)),
  getBillingAddons: () => fetch("/api/billing/addons").then((r) => json<BillingAddons>(r)),
  startBillingCheckout: (priceId: string, kind: "credits" | "storage" | "plan") =>
    fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, kind }),
    }).then((r) => json<{ url: string }>(r)),
  getStorageStatus: () => fetch("/api/storage").then((r) => json<StorageStatus>(r)),
  openBillingPortal: () =>
    fetch("/api/billing/portal", { method: "POST" }).then((r) =>
      json<{ url: string }>(r),
    ),
  saveSettings: (patch: Partial<Settings>) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Settings>(r)),

  testCursorConnection: (apiKey?: string) =>
    fetch("/api/cursor/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiKey ? { apiKey } : {}),
    }).then((r) => json<CursorConnectionStatus>(r)),

  listCursorModels: () =>
    fetch("/api/cursor/models").then((r) =>
      json<{ models: CursorModelInfo[]; error?: string }>(r),
    ),

  listOpenRouterModels: (apiKey?: string) =>
    fetch("/api/openrouter/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiKey ? { apiKey } : {}),
    }).then((r) => json<{ models: OpenRouterModelInfo[]; error?: string }>(r)),

  testAgentBackend: (kind: AgentBackendKind, host: string, apiKey?: string) =>
    fetch("/api/agent-backends/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, host, apiKey }),
    }).then((r) => json<AgentBackendConnectionStatus>(r)),

  testAgentBackendById: (id: string) =>
    fetch(`/api/agent-backends/${id}/test`, { method: "POST" }).then((r) =>
      json<AgentBackendConnectionStatus>(r),
    ),

  listAgentBackends: () =>
    fetch("/api/agent-backends").then((r) =>
      json<{ backends: AgentBackend[]; activeId: string | null }>(r),
    ),

  addAgentBackend: (backend: Omit<AgentBackend, "id">) =>
    fetch("/api/agent-backends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backend),
    }).then((r) => json<{ backend: AgentBackend; activeId: string | null }>(r)),

  activateAgentBackend: (id: string) =>
    fetch(`/api/agent-backends/${id}/activate`, { method: "POST" }).then((r) =>
      json<{ activeId: string | null }>(r),
    ),

  removeAgentBackend: (id: string) =>
    fetch(`/api/agent-backends/${id}`, { method: "DELETE" }).then((r) =>
      json<{ backends: AgentBackend[]; activeId: string | null }>(r),
    ),
};

/**
 * POST a chat message and consume the SSE stream of AgentEvents.
 * Resolves when the stream closes; the caller reacts per-event.
 */
export async function streamChat(
  message: string,
  sessionId: string | undefined,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
  mode?: "agent" | "ask",
  projectId?: string | null,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      sessionId,
      ...(mode ? { mode } : {}),
      projectId: projectId ?? null,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) broadcastAuthFailure(body);
    throw new Error(`Chat failed: ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as AgentEvent);
      } catch {
        // Skip malformed chunks — the stream is best-effort.
      }
    }
  }
}
