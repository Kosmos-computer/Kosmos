/**
 * Generated-app persistence — ported from openclaw-os `claw-plugin/src/app-store.ts`.
 * One JSON file per app; append-only version history capped at 25 entries;
 * restore is non-destructive (pushes the current head as a new version).
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { AppSummary, StoredApp } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const MAX_VERSIONS = 25;

export class AppStore {
  private dir = dataDirs.apps;

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async create(data: Pick<StoredApp, "title" | "content" | "sessionId">): Promise<StoredApp> {
    await fs.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const record: StoredApp = {
      id: crypto.randomUUID(),
      ...data,
      versions: [{ content: data.content, timestamp: now, source: "create" }],
      createdAt: now,
      updatedAt: now,
    };
    await fs.writeFile(this.filePath(record.id), JSON.stringify(record, null, 2), "utf-8");
    return record;
  }

  async update(
    id: string,
    patch: Partial<Pick<StoredApp, "title" | "content">>,
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

    const updated: StoredApp = {
      ...existing,
      ...patch,
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
            const summary: AppSummary = {
              id: app.id,
              title: app.title,
              sessionId: app.sessionId,
              createdAt: app.createdAt,
              updatedAt: app.updatedAt,
              versionCount: app.versions?.length ?? 0,
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
      return record;
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
