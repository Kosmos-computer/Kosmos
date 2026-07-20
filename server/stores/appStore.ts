/**
 * Generated-app persistence — ported from openclaw-os `claw-plugin/src/app-store.ts`.
 * One JSON file per app; append-only version history capped at 25 entries;
 * restore is non-destructive (pushes the current head as a new version).
 *
 * Create upserts by normalized title by default so agent retries / "make a
 * clock again" do not flood the Apps launcher with near-duplicate tiles.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { isAppIconName, pickAppIcon } from "../../shared/appIcons.js";
import type { AppSummary, StoredApp } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const MAX_VERSIONS = 25;

/** Collapse title noise so "Live Clock" / "live  clock" share one slot. */
export function normalizeAppTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[\s_\-]+/g, " ");
}

export type CreateAppResult = StoredApp & { reused: boolean };

export class AppStore {
  /** Resolved on each access so tests can retarget ARCO_DATA_DIR. */
  private get dir(): string {
    return dataDirs.apps;
  }

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  private resolveIcon(
    title: string,
    id: string,
    icon?: string,
  ): string {
    if (icon && isAppIconName(icon)) return icon;
    return pickAppIcon(title, id);
  }

  /** Backfill missing icons on older apps and persist once. */
  private async ensureIcon(record: StoredApp): Promise<StoredApp> {
    if (record.icon && isAppIconName(record.icon)) return record;
    const icon = pickAppIcon(record.title, record.id);
    const updated: StoredApp = { ...record, icon };
    await fs.writeFile(this.filePath(record.id), JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  }

  /**
   * Most recently updated generated app whose title normalizes to the same key.
   * Used to collapse agent re-creates into updates.
   */
  async findByNormalizedTitle(title: string): Promise<StoredApp | null> {
    const key = normalizeAppTitle(title);
    if (!key) return null;
    const summaries = await this.list();
    const match = summaries.find((s) => normalizeAppTitle(s.title) === key);
    if (!match) return null;
    return this.get(match.id);
  }

  async create(
    data: Pick<StoredApp, "title" | "content" | "sessionId"> & { icon?: string },
    opts?: { forceNew?: boolean },
  ): Promise<CreateAppResult> {
    if (!opts?.forceNew) {
      const existing = await this.findByNormalizedTitle(data.title);
      if (existing) {
        const updated = await this.update(existing.id, {
          title: data.title,
          content: data.content,
          ...(data.icon !== undefined ? { icon: data.icon } : {}),
        });
        return { ...updated, reused: true };
      }
    }

    await fs.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const record: StoredApp = {
      id,
      title: data.title,
      content: data.content,
      sessionId: data.sessionId,
      icon: this.resolveIcon(data.title, id, data.icon),
      versions: [{ content: data.content, timestamp: now, source: "create" }],
      createdAt: now,
      updatedAt: now,
    };
    await fs.writeFile(this.filePath(record.id), JSON.stringify(record, null, 2), "utf-8");
    return { ...record, reused: false };
  }

  /**
   * Keep the newest app per normalized title; delete older siblings.
   * Returns how many files were removed.
   */
  async dedupeByTitle(): Promise<{ kept: number; removed: number; removedIds: string[] }> {
    const summaries = await this.list(); // already newest-first
    const seen = new Set<string>();
    const removedIds: string[] = [];
    for (const summary of summaries) {
      const key = normalizeAppTitle(summary.title);
      if (!key) continue;
      if (seen.has(key)) {
        await this.delete(summary.id);
        removedIds.push(summary.id);
      } else {
        seen.add(key);
      }
    }
    return {
      kept: seen.size,
      removed: removedIds.length,
      removedIds,
    };
  }

  async update(
    id: string,
    patch: Partial<Pick<StoredApp, "title" | "content" | "icon">>,
  ): Promise<StoredApp> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`App not found: ${id}`);

    const versions = existing.versions ?? [];
    if (patch.content !== undefined && patch.content !== existing.content) {
      versions.push({
        content: existing.content,
        timestamp: existing.updatedAt,
        source: "edit",
      });
      while (versions.length > MAX_VERSIONS) versions.shift();
    }

    const nextTitle = patch.title ?? existing.title;
    const updated: StoredApp = {
      ...existing,
      ...patch,
      icon:
        patch.icon !== undefined
          ? this.resolveIcon(nextTitle, id, patch.icon)
          : existing.icon ?? pickAppIcon(nextTitle, id),
      versions,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.filePath(id), JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  }

  async restore(id: string, versionIndex: number): Promise<StoredApp> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`App not found: ${id}`);
    const versions = existing.versions ?? [];
    const target = versions[versionIndex];
    if (!target) throw new Error(`Version ${versionIndex} not found for app ${id}`);

    versions.push({
      content: existing.content,
      timestamp: existing.updatedAt,
      source: "restore",
    });
    while (versions.length > MAX_VERSIONS) versions.shift();

    const updated: StoredApp = {
      ...existing,
      content: target.content,
      versions,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.filePath(id), JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  }

  async list(): Promise<AppSummary[]> {
    await fs.mkdir(this.dir, { recursive: true });
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const records = await Promise.all(
      entries
        .filter((e) => e.endsWith(".json"))
        .map(async (file) => {
          try {
            const raw = await fs.readFile(path.join(this.dir, file), "utf-8");
            const app = JSON.parse(raw) as StoredApp;
            const withIcon = await this.ensureIcon(app);
            const summary: AppSummary = {
              id: withIcon.id,
              title: withIcon.title,
              icon: withIcon.icon,
              sessionId: withIcon.sessionId,
              createdAt: withIcon.createdAt,
              updatedAt: withIcon.updatedAt,
              versionCount: withIcon.versions?.length ?? 0,
            };
            return summary;
          } catch {
            return null;
          }
        }),
    );
    return (records.filter(Boolean) as AppSummary[]).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async get(id: string): Promise<StoredApp | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), "utf-8");
      const record = JSON.parse(raw) as StoredApp;
      if (!record.versions) record.versions = [];
      return this.ensureIcon(record);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.filePath(id));
    } catch {
      // Already gone — treat as success.
    }
  }
}

export const appStore = new AppStore();
