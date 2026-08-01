/**
 * Builtin code-app factory — templates + project mkdir + copy scaffold.
 * Used by create_project / scaffold_template / list_templates agent tools.
 */
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dataDirs } from "../env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  install: string;
  dev: string;
  url: string;
}

export function listTemplates(): TemplateMeta[] {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const out: TemplateMeta[] = [];
  for (const entry of fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(TEMPLATES_DIR, entry.name, "TEMPLATE.json");
    if (!fs.existsSync(metaPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as TemplateMeta;
      out.push({ ...meta, id: meta.id || entry.name });
    } catch {
      /* skip broken meta */
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function getTemplate(id: string): TemplateMeta | null {
  return listTemplates().find((t) => t.id === id) ?? null;
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `app-${Date.now().toString(36)}`;
}

/** Absolute path under workspace/projects/<slug>. */
export function resolveNewProjectDir(name: string): string {
  const projectsRoot = path.join(dataDirs.workspace, "projects");
  fs.mkdirSync(projectsRoot, { recursive: true });
  let base = slugify(name);
  let candidate = path.join(projectsRoot, base);
  let n = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(projectsRoot, `${base}-${n}`);
    n += 1;
  }
  return candidate;
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fsPromises.mkdir(dest, { recursive: true });
  const entries = await fsPromises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "TEMPLATE.json") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(from, to);
    else await fsPromises.copyFile(from, to);
  }
}

export async function scaffoldTemplateInto(
  templateId: string,
  projectPath: string,
): Promise<{ meta: TemplateMeta; filesCopied: number }> {
  const meta = getTemplate(templateId);
  if (!meta) throw new Error(`Unknown template "${templateId}". Use list_templates.`);
  const src = path.join(TEMPLATES_DIR, templateId);
  if (!fs.existsSync(src)) throw new Error(`Template directory missing: ${templateId}`);
  await fsPromises.mkdir(projectPath, { recursive: true });
  await copyDir(src, projectPath);
  let filesCopied = 0;
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else filesCopied += 1;
    }
  };
  walk(projectPath);
  return { meta, filesCopied };
}

/** Probe a URL for health (GET). */
export async function probeUrl(
  url: string,
  opts?: { timeoutMs?: number },
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const timeoutMs = opts?.timeoutMs ?? 4000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    return { ok: res.ok || (res.status >= 200 && res.status < 500), status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
