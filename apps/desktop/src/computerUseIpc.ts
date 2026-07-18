/**
 * OS computer-use IPC — screenshot via desktopCapturer; click/type via
 * AppleScript on macOS (requires Accessibility permission).
 */
import { desktopCapturer, ipcMain, systemPreferences } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const COMPUTER_IPC = {
  screenshot: "arco:computer-screenshot",
  click: "arco:computer-click",
  type: "arco:computer-type",
} as const;

function ensureAccessibility(): string | null {
  if (process.platform !== "darwin") return null;
  try {
    const trusted = systemPreferences.isTrustedAccessibilityClient(true);
    if (!trusted) {
      return "Grant Accessibility permission to Kosmos in System Settings → Privacy & Security → Accessibility.";
    }
  } catch {
    // Older Electron — continue and let osascript fail clearly.
  }
  return null;
}

export function registerComputerUseIpc(): void {
  ipcMain.handle(COMPUTER_IPC.screenshot, async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1280, height: 800 },
      });
      const primary = sources[0];
      if (!primary) return { ok: false, error: "No screen source available" };
      const imageDataUrl = primary.thumbnail.toDataURL();
      return { ok: true, imageDataUrl };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(COMPUTER_IPC.click, async (_e, x: number, y: number) => {
    const accessErr = ensureAccessibility();
    if (accessErr) return { ok: false, error: accessErr };
    if (process.platform !== "darwin") {
      return { ok: false, error: "OS click is currently implemented for macOS only." };
    }
    try {
      const script = `tell application "System Events" to click at {${Math.round(x)}, ${Math.round(y)}}`;
      await execFileAsync("osascript", ["-e", script]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(COMPUTER_IPC.type, async (_e, text: string) => {
    const accessErr = ensureAccessibility();
    if (accessErr) return { ok: false, error: accessErr };
    if (process.platform !== "darwin") {
      return { ok: false, error: "OS type is currently implemented for macOS only." };
    }
    try {
      const escaped = String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const script = `tell application "System Events" to keystroke "${escaped}"`;
      await execFileAsync("osascript", ["-e", script]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
