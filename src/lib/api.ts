/**
 * API client — thin typed wrappers over the Arco server routes plus the SSE
 * reader for agent turns (parsing pattern from openui-dashboard's llm-stream).
 */
import type {
  AgentEvent,
  AppSummary,
  Automation,
  AutomationRun,
  DirListing,
  GitInfo,
  Project,
  ProjectsInfo,
  RunEntry,
  Session,
  SessionSummary,
  Settings,
  StoredApp,
  WebApp,
  WebAppLaunchStatus,
  WorkspaceEntry,
} from "@shared/types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
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

  // Automations
  listAutomations: () => fetch("/api/automations").then((r) => json<Automation[]>(r)),
  createAutomation: (data: { name: string; schedule: string; prompt: string }) =>
    fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => json<Automation>(r)),
  updateAutomation: (id: string, patch: Partial<Pick<Automation, "name" | "schedule" | "prompt" | "enabled">>) =>
    fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Automation>(r)),
  deleteAutomation: (id: string) =>
    fetch(`/api/automations/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  runAutomation: (id: string) =>
    fetch(`/api/automations/${id}/run`, { method: "POST" }).then((r) => json<AutomationRun>(r)),

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

  // Exec confirmations
  answerConfirmation: (id: string, approved: boolean) =>
    fetch(`/api/confirmations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    }).then((r) => json<{ ok: boolean }>(r)),

  // Settings
  getSettings: () => fetch("/api/settings").then((r) => json<Settings>(r)),
  saveSettings: (patch: Partial<Settings>) =>
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Settings>(r)),
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
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
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
