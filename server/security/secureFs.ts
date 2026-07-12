/**
 * Owner-only file writes for secret-adjacent JSON.
 *
 * Node's writeFile `mode` only applies when the file is created. We always
 * chmod afterward so existing files (e.g. settings.json from before this
 * helper) end up 0o600 too. No-op on platforms that ignore Unix modes.
 */
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

/** Owner read/write only — same as users.json / auth-sessions.json. */
export const SECRET_FILE_MODE = 0o600;

export function writeSecureFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, { encoding: "utf-8", mode: SECRET_FILE_MODE });
  try {
    fs.chmodSync(filePath, SECRET_FILE_MODE);
  } catch {
    // Windows / exotic FS may not support chmod; best-effort.
  }
}

export function writeSecureJson(filePath: string, value: unknown): void {
  writeSecureFile(filePath, JSON.stringify(value, null, 2));
}

export async function writeSecureFileAsync(filePath: string, contents: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, contents, { encoding: "utf-8", mode: SECRET_FILE_MODE });
  try {
    await fsPromises.chmod(filePath, SECRET_FILE_MODE);
  } catch {
    // best-effort
  }
}

export async function writeSecureJsonAsync(filePath: string, value: unknown): Promise<void> {
  await writeSecureFileAsync(filePath, JSON.stringify(value, null, 2));
}

/** True when the file mode is owner-only (ignores higher bits like setuid). */
export function isOwnerOnlyMode(mode: number): boolean {
  return (mode & 0o777) === SECRET_FILE_MODE;
}
