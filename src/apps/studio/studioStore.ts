/**
 * Studio workspace store — the drawer's memory. Agent events (exec commands,
 * file writes, app creation) stream in through `ingestAgentEvent`, scoped to
 * the active conversation so switching sidebar tabs restores that thread's
 * terminal log, diffs, and file tree version.
 */
import { create } from "zustand";
import type { AgentEvent, ProjectsInfo, WorkspaceState, WorkspaceTab } from "@shared/types";
import { api } from "../../lib/api";

const EMPTY_WORKSPACE: WorkspaceState = {
  backend: "local",
  remoteProfileId: null,
  roots: [],
  worktreePath: null,
};

// ---------------------------------------------------------------------------
// Entry shapes
// ---------------------------------------------------------------------------

/** One shell command with its (eventual) result — feeds the Terminal tab. */
export interface CommandEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  /** "agent" commands come from tool events; "user" from the tab's input row. */
  source: "agent" | "user";
}

/** Latest before/after snapshot for a path — feeds the Diffs tab. */
export interface FileChange {
  path: string;
  /** null means the file was created (no prior content). */
  before: string | null;
  after: string;
  at: number;
}

/** Per-conversation workspace drawer activity. */
export interface SessionActivity {
  commands: CommandEntry[];
  changes: Record<string, FileChange>;
  filesVersion: number;
  previewAppId: string | null;
}

/** Unsaved thread before the server assigns a session id. */
export const DRAFT_SESSION_KEY = "__draft__";

export function sessionActivityKey(id: string | null | undefined): string {
  return id ?? DRAFT_SESSION_KEY;
}

function emptyActivity(): SessionActivity {
  return { commands: [], changes: {}, filesVersion: 0, previewAppId: null };
}

function getActivity(
  sessions: Record<string, SessionActivity>,
  key: string,
): SessionActivity {
  return sessions[key] ?? emptyActivity();
}

function patchActivity(
  sessions: Record<string, SessionActivity>,
  key: string,
  patch: Partial<SessionActivity> | ((activity: SessionActivity) => SessionActivity),
): Record<string, SessionActivity> {
  const current = getActivity(sessions, key);
  const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
  return { ...sessions, [key]: next };
}

// ---------------------------------------------------------------------------
// UI layout persistence
// ---------------------------------------------------------------------------

const LAYOUT_KEY = "arco:studio:v1";

/** Center pane in Studio — chat thread or the Board ops surface. */
export type StudioMainSurface = "chat" | "board";

interface PersistedStudioLayout {
  chatWidthPct: number;
  activeTab: WorkspaceTab;
  drawerOpen: boolean;
  navOpen: boolean;
  mainSurface: StudioMainSurface;
}

const WORKSPACE_TABS: WorkspaceTab[] = ["files", "diffs", "terminal", "browser"];

function loadLayout(): PersistedStudioLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedStudioLayout>;
      const activeTab =
        parsed.activeTab && WORKSPACE_TABS.includes(parsed.activeTab as WorkspaceTab)
          ? (parsed.activeTab as WorkspaceTab)
          : DEFAULT_LAYOUT.activeTab;
      const mainSurface =
        parsed.mainSurface && MAIN_SURFACES.includes(parsed.mainSurface as StudioMainSurface)
          ? (parsed.mainSurface as StudioMainSurface)
          : DEFAULT_LAYOUT.mainSurface;
      return { ...DEFAULT_LAYOUT, ...parsed, activeTab, mainSurface };
    }
  } catch {
    // Corrupt layout — fall through to defaults.
  }
  return DEFAULT_LAYOUT;
}

const MAIN_SURFACES: StudioMainSurface[] = ["chat", "board"];

const DEFAULT_LAYOUT: PersistedStudioLayout = {
  chatWidthPct: 45,
  activeTab: "files",
  drawerOpen: true,
  navOpen: true,
  mainSurface: "chat",
};

function persistLayout(state: StudioStore): void {
  const payload: PersistedStudioLayout = {
    chatWidthPct: state.chatWidthPct,
    activeTab: state.activeTab,
    drawerOpen: state.drawerOpen,
    navOpen: state.navOpen,
    mainSurface: state.mainSurface,
  };
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(payload));
  } catch {
    // Quota errors are non-fatal.
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface StudioStore extends PersistedStudioLayout {
  activeSessionKey: string;
  sessionActivity: Record<string, SessionActivity>;
  /** File the Files tab should select — set by os_ui or a Diffs "open" click. */
  requestedPath: string | null;
  /** Registry of opened folders + which one is active (null = sandbox). */
  projectsInfo: ProjectsInfo;
  /** Multi-root Studio workspace (backend, roots, worktree). */
  workspace: WorkspaceState;
  /** Working-tree change count (written by the Git tab; drives the badge). */
  gitChangeCount: number;
  /** URL the Browser tab shows — settable by the user or the agent. */
  browserUrl: string;

  setActiveTab: (tab: WorkspaceTab) => void;
  setDrawerOpen: (open: boolean) => void;
  setNavOpen: (open: boolean) => void;
  setMainSurface: (surface: StudioMainSurface) => void;
  setChatWidthPct: (pct: number) => void;
  requestFile: (path: string | null) => void;
  setActiveSession: (sessionId: string | null) => void;
  migrateSessionActivity: (from: string, to: string) => void;
  removeSessionActivity: (sessionId: string) => void;
  appendUserCommand: (entry: CommandEntry) => void;
  updateUserCommand: (id: string, patch: Partial<CommandEntry>) => void;
  clearActivity: () => void;
  /** After checkpoint restore/redo — sync Diffs tab to file contents. */
  applyRestoredFiles: (
    restoredFiles: { path: string; content: string | null; diffBefore?: string | null }[],
    sessionKey?: string | null,
  ) => void;
  ingestAgentEvent: (event: AgentEvent, sessionKey?: string | null) => void;
  refreshProjects: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  openFolder: (path: string) => Promise<void>;
  switchProject: (id: string | null) => Promise<void>;
  setWorkspaceState: (workspace: WorkspaceState) => void;
  setPreviewAppId: (appId: string) => void;
}

/** Correlates exec tool_start (command) with its tool_end (output), per session. */
const pendingExecs = new Map<string, Map<string, string>>();

function pendingFor(key: string): Map<string, string> {
  let map = pendingExecs.get(key);
  if (!map) {
    map = new Map();
    pendingExecs.set(key, map);
  }
  return map;
}

export const useStudioStore = create<StudioStore>((set, get) => ({
  ...loadLayout(),
  activeSessionKey: DRAFT_SESSION_KEY,
  sessionActivity: {},
  requestedPath: null,
  projectsInfo: { projects: [], activeId: null },
  workspace: EMPTY_WORKSPACE,
  gitChangeCount: 0,
  browserUrl: "",

  setActiveTab: (tab) =>
    set((s) => {
      const next = { ...s, activeTab: tab, drawerOpen: true };
      persistLayout(next as StudioStore);
      return next;
    }),

  setDrawerOpen: (open) =>
    set((s) => {
      const next = { ...s, drawerOpen: open };
      persistLayout(next as StudioStore);
      return next;
    }),

  setNavOpen: (open) =>
    set((s) => {
      const next = { ...s, navOpen: open };
      persistLayout(next as StudioStore);
      return next;
    }),

  setMainSurface: (surface) =>
    set((s) => {
      const next = { ...s, mainSurface: surface };
      persistLayout(next as StudioStore);
      return next;
    }),

  setChatWidthPct: (pct) =>
    set((s) => {
      const next = { ...s, chatWidthPct: pct };
      persistLayout(next as StudioStore);
      return next;
    }),

  requestFile: (path) => set({ requestedPath: path }),

  setActiveSession: (sessionId) =>
    set({ activeSessionKey: sessionActivityKey(sessionId) }),

  migrateSessionActivity: (from, to) =>
    set((s) => {
      const sessions = { ...s.sessionActivity };
      const fromActivity = sessions[from];
      if (fromActivity) {
        sessions[to] = fromActivity;
        delete sessions[from];
      }
      const fromPending = pendingExecs.get(from);
      if (fromPending) {
        pendingExecs.set(to, fromPending);
        pendingExecs.delete(from);
      }
      const nextKey = s.activeSessionKey === from ? to : s.activeSessionKey;
      return { sessionActivity: sessions, activeSessionKey: nextKey };
    }),

  removeSessionActivity: (sessionId) =>
    set((s) => {
      const sessions = { ...s.sessionActivity };
      delete sessions[sessionId];
      pendingExecs.delete(sessionId);
      return { sessionActivity: sessions };
    }),

  appendUserCommand: (entry) =>
    set((s) => {
      const key = s.activeSessionKey;
      return {
        sessionActivity: patchActivity(s.sessionActivity, key, (activity) => ({
          ...activity,
          commands: [...activity.commands, entry],
        })),
      };
    }),

  updateUserCommand: (id, patch) =>
    set((s) => {
      const key = s.activeSessionKey;
      return {
        sessionActivity: patchActivity(s.sessionActivity, key, (activity) => ({
          ...activity,
          commands: activity.commands.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      };
    }),

  clearActivity: () =>
    set((s) => ({
      sessionActivity: patchActivity(s.sessionActivity, s.activeSessionKey, emptyActivity()),
    })),

  applyRestoredFiles: (restoredFiles, sessionKey) =>
    set((s) => {
      const key = sessionActivityKey(sessionKey ?? s.activeSessionKey);
      if (restoredFiles.length === 0) return s;
      return {
        sessionActivity: patchActivity(s.sessionActivity, key, (activity) => {
          const changes = { ...activity.changes };
          for (const file of restoredFiles) {
            if (file.content === null) {
              delete changes[file.path];
              continue;
            }
            const prior = changes[file.path];
            const before =
              file.diffBefore !== undefined ? file.diffBefore : (prior?.before ?? null);
            changes[file.path] = {
              path: file.path,
              before,
              after: file.content,
              at: Date.now(),
            };
            // If content matches baseline, drop the diff row.
            if (before === file.content) {
              delete changes[file.path];
            }
          }
          return {
            ...activity,
            changes,
            filesVersion: activity.filesVersion + 1,
          };
        }),
      };
    }),

  refreshProjects: async () => {
    try {
      set({ projectsInfo: await api.listProjects() });
    } catch {
      // Server unreachable — keep the stale registry.
    }
  },

  refreshWorkspace: async () => {
    try {
      const [workspace, projectsInfo] = await Promise.all([
        api.getWorkspace(),
        api.listProjects(),
      ]);
      set({ workspace, projectsInfo });
    } catch {
      // Server unreachable — keep the stale workspace.
    }
  },

  openFolder: async (path) => {
    await api.addProject(path);
    const [projectsInfo, workspace] = await Promise.all([
      api.listProjects(),
      api.getWorkspace(),
    ]);
    set((s) => ({
      projectsInfo,
      workspace,
      sessionActivity: patchActivity(s.sessionActivity, s.activeSessionKey, emptyActivity()),
    }));
  },

  switchProject: async (id) => {
    const projectsInfo = await api.setActiveProject(id);
    const workspace = await api.getWorkspace();
    set((s) => ({
      projectsInfo,
      workspace,
      sessionActivity: patchActivity(s.sessionActivity, s.activeSessionKey, emptyActivity()),
    }));
  },

  setWorkspaceState: (workspace) =>
    set((s) => ({
      workspace,
      sessionActivity: patchActivity(s.sessionActivity, s.activeSessionKey, emptyActivity()),
    })),

  setPreviewAppId: (appId) =>
    set((s) => ({
      sessionActivity: patchActivity(s.sessionActivity, s.activeSessionKey, {
        previewAppId: appId,
      }),
    })),

  ingestAgentEvent: (event, sessionKey) => {
    const key = sessionActivityKey(sessionKey ?? get().activeSessionKey);
    const pending = pendingFor(key);

    switch (event.type) {
      case "tool_start": {
        if (event.name === "exec" && typeof event.args.command === "string") {
          pending.set(event.callId, event.args.command);
          set((s) => ({
            sessionActivity: patchActivity(s.sessionActivity, key, (activity) => ({
              ...activity,
              commands: [
                ...activity.commands,
                {
                  id: event.callId,
                  command: event.args.command as string,
                  stdout: "",
                  stderr: "",
                  exitCode: null,
                  source: "agent",
                },
              ],
            })),
          }));
        }
        break;
      }

      case "tool_end": {
        if (event.name === "exec" && pending.has(event.callId)) {
          pending.delete(event.callId);
          let stdout = "";
          let stderr = "";
          let exitCode = 0;
          try {
            const parsed = JSON.parse(event.result) as {
              stdout?: string;
              stderr?: string;
              exitCode?: number;
              error?: string;
            };
            stdout = parsed.stdout ?? "";
            stderr = parsed.stderr ?? parsed.error ?? "";
            exitCode = parsed.exitCode ?? (parsed.error ? 1 : 0);
          } catch {
            stderr = "unparseable exec result";
            exitCode = 1;
          }
          set((s) => ({
            sessionActivity: patchActivity(s.sessionActivity, key, (activity) => ({
              ...activity,
              commands: activity.commands.map((c) =>
                c.id === event.callId ? { ...c, stdout, stderr, exitCode } : c,
              ),
              filesVersion: activity.filesVersion + 1,
            })),
          }));
        }
        if (event.name === "app_create" || event.name === "app_update") {
          try {
            const parsed = JSON.parse(event.result) as { id?: string };
            if (typeof parsed.id === "string") {
              set((s) => ({
                sessionActivity: patchActivity(s.sessionActivity, key, {
                  previewAppId: parsed.id,
                }),
              }));
            }
          } catch {
            // Result without an id — leave the preview as-is.
          }
        }
        break;
      }

      case "file_changed": {
        set((s) => ({
          sessionActivity: patchActivity(s.sessionActivity, key, (activity) => {
            const prior = activity.changes[event.path];
            return {
              ...activity,
              changes: {
                ...activity.changes,
                [event.path]: {
                  path: event.path,
                  before: prior ? prior.before : event.before,
                  after: event.after,
                  at: Date.now(),
                },
              },
              filesVersion: activity.filesVersion + 1,
            };
          }),
        }));
        break;
      }

      case "os_ui": {
        const action = event.action;
        if (action.action === "open_workspace_tab") {
          set((s) => {
            const isBrowser = action.tab === "browser";
            const next = {
              ...s,
              activeTab: action.tab,
              drawerOpen: true,
              requestedPath: !isBrowser && action.path ? action.path : s.requestedPath,
              browserUrl: isBrowser && action.path ? action.path : s.browserUrl,
            };
            persistLayout(next as StudioStore);
            return next;
          });
        } else if (action.action === "open_app") {
          set((s) => ({
            sessionActivity: patchActivity(s.sessionActivity, key, {
              previewAppId: action.appId,
            }),
          }));
        }
        break;
      }

      default:
        break;
    }
  },
}));

/** Active conversation's drawer slices — use in Studio tabs. */
export function useSessionActivity() {
  return useStudioStore((s) => getActivity(s.sessionActivity, s.activeSessionKey));
}
