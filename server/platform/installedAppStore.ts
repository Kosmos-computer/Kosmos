/**
 * Installed-app registry — manifests in one JSON file (the webAppStore
 * pattern). Core apps live as folders under ./apps/ with a manifest.json and
 * are seeded on boot; user installs come from URLs or raw manifests via the
 * API.
 */
import fs from "node:fs";
import path from "node:path";
import type { AppManifest, AppSource, InstalledApp } from "../../shared/manifest.js";
import { dataDirs } from "../env.js";
import { parseManifest } from "./manifestSchema.js";
import { grantStore } from "./grantStore.js";

const FILE = path.join(dataDirs.root, "installed-apps.json");
/** Repo-local bundles: ./apps/<name>/{manifest.json, index.html, …} */
export const APPS_DIR = path.resolve(process.cwd(), "apps");

function load(): InstalledApp[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as InstalledApp[];
  } catch {
    return [];
  }
}

function save(apps: InstalledApp[]): void {
  fs.writeFileSync(FILE, JSON.stringify(apps, null, 2), "utf-8");
}

export const installedAppStore = {
  list(): InstalledApp[] {
    return load();
  },

  get(id: string): InstalledApp | undefined {
    return load().find((e) => e.manifest.id === id);
  },

  /** Install or update in place (same id = upgrade). Grants all requested permissions. */
  install(manifest: AppManifest, source: AppSource): InstalledApp {
    const apps = load();
    const existing = apps.find((e) => e.manifest.id === manifest.id);
    let record: InstalledApp;
    if (existing) {
      existing.manifest = manifest;
      existing.source = source;
      record = existing;
    } else {
      record = { manifest, source, enabled: true, installedAt: new Date().toISOString() };
      apps.push(record);
    }
    save(apps);
    // Interim consent model: installing grants everything the manifest asks
    // for; Settings → Apps is where users review and revoke. A proper
    // pre-install grant sheet replaces this when the install UI matures.
    grantStore.grantManifest(manifest);
    return record;
  },

  setEnabled(id: string, enabled: boolean): InstalledApp | undefined {
    const apps = load();
    const app = apps.find((e) => e.manifest.id === id);
    if (!app) return undefined;
    app.enabled = enabled;
    save(apps);
    return app;
  },

  uninstall(id: string): void {
    save(load().filter((e) => e.manifest.id !== id));
    grantStore.clear(id);
  },

  /**
   * Seed core apps from ./apps/<dir>/manifest.json. Fresh ids are installed;
   * already-seeded apps refresh their manifest in place so chrome/version
   * updates land without a data reset. User uninstalls still stick.
   */
  ensureSeeds(): void {
    let dirs: string[];
    try {
      dirs = fs
        .readdirSync(APPS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    } catch {
      return; // No apps folder — nothing to seed.
    }
    const byId = new Map(load().map((e) => [e.manifest.id, e]));
    for (const dir of dirs) {
      const manifestPath = path.join(APPS_DIR, dir, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as unknown;
        const { manifest, error } = parseManifest(raw);
        if (!manifest) {
          console.warn(`[platform] skipping app seed "${dir}": ${error}`);
          continue;
        }
        const existing = byId.get(manifest.id);
        if (!existing) {
          this.install(manifest, "seed");
          console.log(`[platform] seeded app ${manifest.id} (${manifest.name})`);
          continue;
        }
        if (existing.source === "seed") {
          this.install(manifest, "seed");
        }
      } catch (err) {
        console.warn(`[platform] failed to read app seed "${dir}":`, err);
      }
    }
  },
};
