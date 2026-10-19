/**
 * Web-app registry — dock entries for user projects (as opposed to
 * OpenUI-generated apps). Persisted as one JSON file; the shape is small
 * enough that read-modify-write per operation beats caching.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { WebApp } from "../../shared/types.js";
import {
  KOSMOS_FRAME_APP_ID,
  KOSMOS_FRAME_NAME,
  KOSMOS_FRAME_PAGE_URL,
} from "../../shared/kosmosFrame.js";
import {
  KOSMOS_PLAY_APP_ID,
  KOSMOS_PLAY_NAME,
  KOSMOS_PLAY_PAGE_URL,
} from "../../shared/kosmosPlay.js";
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

  /**
   * The Kosmos still-frame window. Inserted once, with a stable id, so the
   * dock can pin `web:kosmos-engine` without a register_webapp turn.
   * An entry that is already there is left alone (a renamed app stays renamed).
   * `KOSMOS_FRAME_URL` overrides the page address when the page server moves.
   */
  ensureKosmosFrame(): WebApp {
    const apps = load();
    const existing = apps.find((a) => a.id === KOSMOS_FRAME_APP_ID);
    if (existing) return existing;
    const url = process.env.KOSMOS_FRAME_URL?.trim() || KOSMOS_FRAME_PAGE_URL;
    const sameUrl = apps.find((a) => a.url === url);
    if (sameUrl) return sameUrl;
    const app: WebApp = {
      id: KOSMOS_FRAME_APP_ID,
      name: KOSMOS_FRAME_NAME,
      url,
      addedAt: new Date().toISOString(),
    };
    apps.push(app);
    save(apps);
    return app;
  },

  /**
   * The public player. Inserted once, with a stable id, so the dock can pin
   * `web:kosmos-play`. An entry that is already there is left alone.
   * The still-frame window stays `web:kosmos-engine`.
   */
  ensureKosmosPlay(): WebApp {
    const apps = load();
    const existing = apps.find((a) => a.id === KOSMOS_PLAY_APP_ID);
    if (existing) return existing;
    const sameUrl = apps.find((a) => a.url === KOSMOS_PLAY_PAGE_URL);
    if (sameUrl) return sameUrl;
    const app: WebApp = {
      id: KOSMOS_PLAY_APP_ID,
      name: KOSMOS_PLAY_NAME,
      url: KOSMOS_PLAY_PAGE_URL,
      addedAt: new Date().toISOString(),
    };
    apps.push(app);
    save(apps);
    return app;
  },
};
