/**
 * Web-app registry — dock entries for user projects (as opposed to
 * OpenUI-generated apps). Persisted as one JSON file; the shape is small
 * enough that read-modify-write per operation beats caching.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { WebApp } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "webapps.json");

function load(): WebApp[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as WebApp[];
  } catch {
    return [];
  }
}

function save(apps: WebApp[]): void {
  fs.writeFileSync(FILE, JSON.stringify(apps, null, 2), "utf-8");
}

export const webAppStore = {
  list(): WebApp[] {
    return load();
  },

  get(id: string): WebApp | undefined {
    return load().find((a) => a.id === id);
  },

  /** Idempotent on URL — re-adding the same app updates it in place. */
  add(data: Omit<WebApp, "id" | "addedAt">): WebApp {
    const apps = load();
    const existing = apps.find((a) => a.url === data.url);
    if (existing) {
      Object.assign(existing, data);
      save(apps);
      return existing;
    }
    const app: WebApp = { ...data, id: crypto.randomUUID(), addedAt: new Date().toISOString() };
    apps.push(app);
    save(apps);
    return app;
  },

  remove(id: string): void {
    save(load().filter((a) => a.id !== id));
  },
};
