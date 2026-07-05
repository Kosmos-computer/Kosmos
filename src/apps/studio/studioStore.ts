/**
 * Studio workspace store — the drawer's memory. Agent events (exec commands,
 * file writes, app creation) stream in through `ingestAgentEvent`, and the
 * Files/Diffs/Terminal/Preview tabs subscribe to the slices they render.
 *
 * The store is global (not per-Studio-window) because Arco has one workspace:
 * activity from the plain Chat app also lands here, so opening the Studio
 * mid-conversation shows what already happened.
 */
import { create } from "zustand";
import type { AgentEvent, ProjectsInfo, WorkspaceTab } from "@shared/types";
import { api } from "../../lib/api";

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

// ---------------------------------------------------------------------------
// UI layout persistence
//
// Panel width and tab choice survive reloads (agent-canvas semantics); the
// activity log does not — it is session-scoped by nature.
// ---------------------------------------------------------------------------

const LAYOUT_KEY = "arco:studio:v1";

interface PersistedStudioLayout {
  chatWidthPct: number;
  activeTab: WorkspaceTab;
  drawerOpen: boolean;
  navOpen: boolean;
}

function loadLayout(): PersistedStudioLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return { ...DEFAULT_LAYOUT, ...(JSON.parse(raw) as Partial<PersistedStudioLayout>) };
  } catch {
    // Corrupt layout — fall through to defaults.
  }
  return DEFAULT_LAYOUT;
}

const DEFAULT_LAYOUT: PersistedStudioLayout = {
  chatWidthPct: 45,
  activeTab: "files",
  drawerOpen: true,
  navOpen: true,
};

function persistLayout(state: StudioStore): void {
  const payload: PersistedStudioLayout = {
    chatWidthPct: state.chatWidthPct,
    activeTab: state.activeTab,
    drawerOpen: state.drawerOpen,
    navOpen: state.navOpen,
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
  commands: CommandEntry[];
  /** Keyed by path — a re-edit replaces the entry but keeps the first `before`. */
  changes: Record<string, FileChange>;
  /** The generated app the Preview tab shows (last created/updated/opened). */
  previewAppId: string | null;
  /** File the Files tab should select — set by os_ui or a Diffs "open" click. */
  requestedPath: string | null;
  /** Bumped whenever the agent touches files so the tree refetches. */
  filesVersion: number;
  /** Registry of opened folders + which one is active (null = sandbox). */
  projectsInfo: ProjectsInfo;
  /** Working-tree change count (written by the Git tab; drives the badge). */
  gitChangeCount: number;
  /** URL the Browser tab shows — settable by the user or the agent. */
  browserUrl: string;

  setActiveTab: (tab: WorkspaceTab) => void;
  setDrawerOpen: (open: boolean) => void;
  setNavOpen: (open: boolean) => void;
  setChatWidthPct: (pct: number) => void;
  requestFile: (path: string | null) => void;
  appendUserCommand: (entry: CommandEntry) => void;
  updateUserCommand: (id: string, patch: Partial<CommandEntry>) => void;
  clearActivity: () => void;
  ingestAgentEvent: (event: AgentEvent) => void;
  refreshProjects: () => Promise<void>;
  /** Open a folder (registers + activates) or switch/close via id. */
  openFolder: (path: string) => Promise<void>;
  switchProject: (id: string | null) => Promise<void>;
}

/** Correlates exec tool_start (command) with its tool_end (output). */
const pendingExecs = new Map<string, string>();

export const useStudioStore = create<StudioStore>((set) => ({
  ...loadLayout(),
  commands: [],
  changes: {},
  previewAppId: null,
  requestedPath: null,
  filesVersion: 0,
  projectsInfo: { projects: [], activeId: null },
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

  setChatWidthPct: (pct) =>
    set((s) => {
      const next = { ...s, chatWidthPct: pct };
      persistLayout(next as StudioStore);
      return next;
    }),

  requestFile: (path) => set({ requestedPath: path }),

  appendUserCommand: (entry) => set((s) => ({ commands: [...s.commands, entry] })),

  updateUserCommand: (id, patch) =>
    set((s) => ({
      commands: s.commands.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  clearActivity: () => set({ commands: [], changes: {} }),

  refreshProjects: async () => {
    try {
      set({ projectsInfo: await api.listProjects() });
    } catch {
      // Server unreachable — keep the stale registry.
    }
  },

  openFolder: async (path) => {
    await api.addProject(path);
    const projectsInfo = await api.listProjects();
    // Session diffs and command logs belong to the previous root.
    set((s) => ({ projectsInfo, commands: [], changes: {}, filesVersion: s.filesVersion + 1 }));
  },

  switchProject: async (id) => {
    const projectsInfo = await api.setActiveProject(id);
    set((s) => ({ projectsInfo, commands: [], changes: {}, filesVersion: s.filesVersion + 1 }));
  },

  // -------------------------------------------------------------------------
  // Agent event ingestion
  //
  // Called from handleShellEvent for every streamed AgentEvent, regardless of
  // which chat surface originated the turn.
  // -------------------------------------------------------------------------
  ingestAgentEvent: (event) => {
    switch (event.type) {
      case "tool_start": {
        if (event.name === "exec" && typeof event.args.command === "string") {
          pendingExecs.set(event.callId, event.args.command);
          set((s) => ({
            commands: [
              ...s.commands,
              {
                id: event.callId,
                command: event.args.command as string,
                stdout: "",
                stderr: "",
                exitCode: null,
                source: "agent",
              },
            ],
          }));
        }
        break;
      }

      case "tool_end": {
        if (event.name === "exec" && pendingExecs.has(event.callId)) {
          pendingExecs.delete(event.callId);
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
            commands: s.commands.map((c) =>
              c.id === event.callId ? { ...c, stdout, stderr, exitCode } : c,
            ),
            // Shell commands can create files or change git state — nudge the
            // tree and Git tab to refetch.
            filesVersion: s.filesVersion + 1,
          }));
        }
        // A freshly created/updated app becomes the Preview tab's subject.
        if (event.name === "app_create" || event.name === "app_update") {
          try {
            const parsed = JSON.parse(event.result) as { id?: string };
            if (typeof parsed.id === "string") set({ previewAppId: parsed.id });
          } catch {
            // Result without an id — leave the preview as-is.
          }
        }
        break;
      }

      case "file_changed": {
        set((s) => {
          const prior = s.changes[event.path];
          return {
            changes: {
              ...s.changes,
              [event.path]: {
                path: event.path,
                // Keep the original baseline across successive agent edits so
                // the diff always shows "since the conversation started".
                before: prior ? prior.before : event.before,
                after: event.after,
                at: Date.now(),
              },
            },
            filesVersion: s.filesVersion + 1,
          };
        });
        break;
      }

      case "os_ui": {
        const action = event.action;
        if (action.action === "open_workspace_tab") {
          set((s) => {
            // For the browser tab, path carries a URL; elsewhere it's a file.
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
          set({ previewAppId: action.appId });
        }
        break;
      }

      default:
        break;
    }
  },
}));
