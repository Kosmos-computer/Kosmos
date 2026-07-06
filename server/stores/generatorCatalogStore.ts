/**
 * User-saved generator catalog entries — components the Studio agent (or the
 * Generator app) produced and the user chose to keep in the sidebar catalog.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { SavedGeneratorCatalogItem } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "generator-catalog.json");

async function readAll(): Promise<SavedGeneratorCatalogItem[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as SavedGeneratorCatalogItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: SavedGeneratorCatalogItem[]): Promise<void> {
  await fs.mkdir(dataDirs.root, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(items, null, 2), "utf-8");
}

export const generatorCatalogStore = {
  async list(): Promise<SavedGeneratorCatalogItem[]> {
    return readAll();
  },

  async add(input: {
    label: string;
    code: string;
    prompt?: string;
    tier?: SavedGeneratorCatalogItem["tier"];
  }): Promise<SavedGeneratorCatalogItem> {
    const items = await readAll();
    const entry: SavedGeneratorCatalogItem = {
      id: crypto.randomUUID(),
      label: input.label.trim() || "Generated UI",
      code: input.code.trim(),
      prompt: input.prompt?.trim() || undefined,
      tier: input.tier ?? "block",
      createdAt: new Date().toISOString(),
    };
    items.unshift(entry);
    await writeAll(items);
    return entry;
  },

  async remove(id: string): Promise<boolean> {
    const items = await readAll();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeAll(next);
    return true;
  },
};
