/**
 * App state — one zustand store drives the whole UI.
 *
 * Data flow: Tauri commands mutate the world (engine, files), then `refresh()`
 * re-derives the merged model list from three sources:
 *   catalog (what you can get) + local files (what you have) + router /models
 *   (what's running).
 */
import { create } from "zustand";
import { ALL_KNOWN, CATALOG, DRAFT_MODEL, type CatalogEntry } from "../catalog";
import {
  bridge,
  fetchRouterModels,
  loadModel,
  unloadModel,
  type DownloadProgress,
  type EngineStatus,
} from "../lib/bridge";
import { buildPresetIni } from "../lib/presets";

export type ModelPhase =
  | "available" // in catalog, not downloaded
  | "downloading"
  | "stopped" // on disk, not loaded
  | "loading"
  | "running"
  | "failed";

export interface ModelRow {
  /** GGUF filename — the stable key across all three sources. */
  file: string;
  /** Router model id once known (from /models), else derived from filename. */
  routerId: string | null;
  catalog: CatalogEntry | null;
  sizeBytes: number | null;
  phase: ModelPhase;
  download?: { received: number; total: number | null };
  isDraft: boolean;
}

interface AppState {
  engine: EngineStatus | null;
  engineBusy: boolean;
  models: ModelRow[];
  logs: string[];
  arcoConfiguredPath: string | null;
  error: string | null;

  refresh: () => Promise<void>;
  startEngine: () => Promise<void>;
  stopEngine: () => Promise<void>;
  download: (entry: CatalogEntry) => Promise<void>;
  remove: (file: string) => Promise<void>;
  run: (row: ModelRow) => Promise<void>;
  stop: (row: ModelRow) => Promise<void>;
  configureArco: (row: ModelRow) => Promise<void>;
  applyDownloadProgress: (p: DownloadProgress) => void;
  pushLog: (line: string) => void;
  clearError: () => void;
}

const MAX_LOG_LINES = 500;

function fileStem(file: string): string {
  return file.replace(/\.gguf$/, "");
}

/** Poll the router's /health until it answers OK or the deadline passes. */
async function waitForHealth(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await bridge.engineApi("GET", "/health");
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return false;
}

export const useStore = create<AppState>((set, get) => ({
  engine: null,
  engineBusy: false,
  models: [],
  logs: [],
  arcoConfiguredPath: null,
  error: null,

  refresh: async () => {
    try {
      const [engine, local] = await Promise.all([bridge.engineStatus(), bridge.listLocalModels()]);

      // Router listing is only reachable while the engine runs.
      let routerById = new Map<string, string>();
      let routerStatus = new Map<string, { value: string; failed?: boolean }>();
      if (engine.running) {
        try {
          const routerModels = await fetchRouterModels();
          for (const m of routerModels) {
            // Match router ids back to files: the id is the filename or its stem.
            const key = m.id.endsWith(".gguf") ? m.id : `${m.id}.gguf`;
            routerById.set(key, m.id);
            if (m.status) routerStatus.set(key, m.status);
          }
        } catch {
          // Engine may still be booting; keep file-level info.
        }
      }

      const localByFile = new Map(local.map((l) => [l.file, l]));
      const downloading = new Map(
        get()
          .models.filter((m) => m.phase === "downloading" && m.download)
          .map((m) => [m.file, m.download!]),
      );

      const files = new Set<string>([
        ...CATALOG.map((c) => c.file),
        ...DRAFT_MODEL.file.split("\n"),
        ...local.map((l) => l.file),
      ]);

      const rows: ModelRow[] = [...files].map((file) => {
        const catalog = ALL_KNOWN[file] ?? null;
        const onDisk = localByFile.get(file);
        const dl = downloading.get(file);
        const status = routerStatus.get(file);

        let phase: ModelPhase;
        if (dl) phase = "downloading";
        else if (!onDisk) phase = "available";
        else if (status?.value === "loaded") phase = "running";
        else if (status?.value === "loading") phase = "loading";
        else if (status?.failed) phase = "failed";
        else phase = "stopped";

        return {
          file,
          routerId: routerById.get(file) ?? (onDisk ? fileStem(file) : null),
          catalog,
          sizeBytes: onDisk?.sizeBytes ?? catalog?.sizeBytes ?? null,
          phase,
          download: dl,
          isDraft: file === DRAFT_MODEL.file,
        };
      });

      // Catalog order first, unknown local files after.
      const order = [...CATALOG.map((c) => c.file), DRAFT_MODEL.file];
      rows.sort((a, b) => {
        const ia = order.indexOf(a.file);
        const ib = order.indexOf(b.file);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      set({ engine, models: rows });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  startEngine: async () => {
    set({ engineBusy: true, error: null });
    try {
      const local = await bridge.listLocalModels();
      const engine = await bridge.engineStatus();
      const ini = buildPresetIni(
        local.map((l) => l.file),
        engine.modelsDir,
      );
      await bridge.engineStart(ini, 2);
      // The process spawns instantly but the HTTP server binds a moment later;
      // gate readiness on /health so Run can't race a half-started router.
      const healthy = await waitForHealth(15_000);
      if (!healthy) {
        set({ error: "Engine started but never became healthy — check the logs pane." });
      }
      await get().refresh();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ engineBusy: false });
    }
  },

  stopEngine: async () => {
    set({ engineBusy: true, error: null });
    try {
      await bridge.engineStop();
      await get().refresh();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ engineBusy: false });
    }
  },

  download: async (entry) => {
    set({ error: null });
    // Optimistically flag the row so the progress bar appears immediately.
    set((s) => ({
      models: s.models.map((m) =>
        m.file === entry.file
          ? { ...m, phase: "downloading", download: { received: 0, total: entry.sizeBytes } }
          : m,
      ),
    }));
    try {
      const downloads = [bridge.downloadModel(entry.url, entry.file)];
      // Turbo pair: fetch the draft model alongside the target.
      if (entry.presetExtras?.["model-draft"]) {
        downloads.push(bridge.downloadModel(DRAFT_MODEL.url, DRAFT_MODEL.file));
      }
      await Promise.all(downloads);
    } catch (e) {
      set({ error: String(e) });
    }
    await get().refresh();
  },

  remove: async (file) => {
    set({ error: null });
    try {
      const row = get().models.find((m) => m.file === file);
      if (row?.phase === "running" && row.routerId) {
        await unloadModel(row.routerId).catch(() => undefined);
      }
      await bridge.deleteModel(file);
    } catch (e) {
      set({ error: String(e) });
    }
    await get().refresh();
  },

  run: async (row) => {
    if (!row.routerId) return;
    set({ error: null });
    set((s) => ({
      models: s.models.map((m) => (m.file === row.file ? { ...m, phase: "loading" } : m)),
    }));
    try {
      await loadModel(row.routerId);
    } catch (e) {
      set({ error: String(e) });
    }
    await get().refresh();
  },

  stop: async (row) => {
    if (!row.routerId) return;
    set({ error: null });
    try {
      await unloadModel(row.routerId);
    } catch (e) {
      set({ error: String(e) });
    }
    await get().refresh();
  },

  configureArco: async (row) => {
    if (!row.routerId) return;
    set({ error: null });
    try {
      const path = await bridge.configureArco(row.routerId);
      set({ arcoConfiguredPath: path });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  applyDownloadProgress: (p) => {
    set((s) => ({
      models: s.models.map((m) =>
        m.file === p.file
          ? p.done || p.error
            ? { ...m, download: undefined }
            : { ...m, phase: "downloading", download: { received: p.received, total: p.total } }
          : m,
      ),
      error: p.error ? `Download failed: ${p.error}` : s.error,
    }));
    if (p.done) void get().refresh();
  },

  pushLog: (line) => {
    set((s) => ({ logs: [...s.logs.slice(-MAX_LOG_LINES + 1), line] }));
  },

  clearError: () => set({ error: null }),
}));
