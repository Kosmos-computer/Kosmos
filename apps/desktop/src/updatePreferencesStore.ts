import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

interface UpdatePreferencesFile {
  skipped: string[];
  snoozed: Record<string, number>;
}

const FILE_NAME = "update-preferences.json";
const LEGACY_FILE_NAME = "skipped-updates.json";

function filePath(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function legacyFilePath(): string {
  return path.join(app.getPath("userData"), LEGACY_FILE_NAME);
}

function readFile(): UpdatePreferencesFile {
  migrateLegacyFile();
  try {
    const raw = fs.readFileSync(filePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<UpdatePreferencesFile>;
    const skipped = Array.isArray(parsed.skipped)
      ? parsed.skipped.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    const snoozed =
      parsed.snoozed && typeof parsed.snoozed === "object"
        ? Object.fromEntries(
            Object.entries(parsed.snoozed).filter(
              (entry): entry is [string, number] =>
                typeof entry[0] === "string" && typeof entry[1] === "number" && Number.isFinite(entry[1]),
            ),
          )
        : {};
    return { skipped, snoozed };
  } catch {
    return { skipped: [], snoozed: {} };
  }
}

function migrateLegacyFile(): void {
  const legacyPath = legacyFilePath();
  if (!fs.existsSync(legacyPath) || fs.existsSync(filePath())) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyPath, "utf8")) as { versions?: string[] };
    const skipped = Array.isArray(legacy.versions)
      ? legacy.versions.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
    writeFile({ skipped, snoozed: {} });
    fs.unlinkSync(legacyPath);
  } catch {
    // Ignore corrupt legacy files.
  }
}

function writeFile(data: UpdatePreferencesFile): void {
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function isVersionSkipped(version: string): boolean {
  return readFile().skipped.includes(version);
}

export function skipVersion(version: string): void {
  const data = readFile();
  if (!data.skipped.includes(version)) data.skipped.push(version);
  delete data.snoozed[version];
  writeFile(data);
}

export function snoozeVersion(version: string, remindAfterMs: number): void {
  const data = readFile();
  data.snoozed[version] = remindAfterMs;
  writeFile(data);
}

export function clearSnooze(version: string): void {
  const data = readFile();
  if (!(version in data.snoozed)) return;
  delete data.snoozed[version];
  writeFile(data);
}

export function getSnoozeUntil(version: string): number | null {
  return readFile().snoozed[version] ?? null;
}

export function isVersionSnoozed(version: string, now = Date.now()): boolean {
  const until = getSnoozeUntil(version);
  return until != null && now < until;
}

export function isUpdateBlocked(version: string, now = Date.now()): boolean {
  return isVersionSkipped(version) || isVersionSnoozed(version, now);
}
