/**
 * Image Gen gallery — metadata for generated images; blobs live alongside
 * under data/image-gen/assets/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ImageGenHistoryItem } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const DIR = path.join(dataDirs.root, "image-gen");
const FILE = path.join(DIR, "history.json");
export const IMAGE_GEN_ASSETS_DIR = path.join(DIR, "assets");

async function readAll(): Promise<ImageGenHistoryItem[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as ImageGenHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ImageGenHistoryItem[]): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(items, null, 2), "utf-8");
}

export const imageGenStore = {
  async list(): Promise<ImageGenHistoryItem[]> {
    return readAll();
  },

  async add(item: Omit<ImageGenHistoryItem, "id" | "createdAt">): Promise<ImageGenHistoryItem> {
    const items = await readAll();
    const entry: ImageGenHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    items.unshift(entry);
    await writeAll(items);
    return entry;
  },

  async remove(id: string): Promise<ImageGenHistoryItem | null> {
    const items = await readAll();
    const match = items.find((item) => item.id === id);
    if (!match) return null;
    await writeAll(items.filter((item) => item.id !== id));
    return match;
  },

  async assetPath(filename: string): Promise<string | null> {
    const safe = path.basename(filename);
    if (safe !== filename) return null;
    const full = path.join(IMAGE_GEN_ASSETS_DIR, safe);
    try {
      await fs.access(full);
      return full;
    } catch {
      return null;
    }
  },
};
