/**
 * OS-level computer use — screenshot / click / type outside the Arco DOM.
 * Desktop: IPC to Electron main. Web: returns a clear unsupported error.
 */
import type { ComputerCommand, ComputerResult } from "@shared/types";
import { getArcoDesktop } from "../lib/desktopBridge";

export async function executeComputerCommand(command: ComputerCommand): Promise<ComputerResult> {
  const desktop = getArcoDesktop() as
    | (ReturnType<typeof getArcoDesktop> & {
        computerScreenshot?: () => Promise<{ ok: boolean; imageDataUrl?: string; error?: string }>;
        computerClick?: (x: number, y: number) => Promise<{ ok: boolean; error?: string }>;
        computerType?: (text: string) => Promise<{ ok: boolean; error?: string }>;
      })
    | null;

  if (!desktop?.isDesktop) {
    return {
      ok: false,
      error: "Computer use requires the Kosmos desktop app with Accessibility permission (macOS).",
    };
  }

  try {
    if (command.kind === "screenshot") {
      if (!desktop.computerScreenshot) {
        return { ok: false, error: "Desktop build does not expose computerScreenshot yet." };
      }
      const res = await desktop.computerScreenshot();
      return res.ok
        ? { ok: true, outcome: "Captured screen", imageDataUrl: res.imageDataUrl }
        : { ok: false, error: res.error ?? "Screenshot failed" };
    }
    if (command.kind === "click") {
      if (!desktop.computerClick) {
        return { ok: false, error: "Desktop build does not expose computerClick yet." };
      }
      const res = await desktop.computerClick(command.x, command.y);
      return res.ok
        ? { ok: true, outcome: `Clicked (${command.x}, ${command.y})` }
        : { ok: false, error: res.error ?? "Click failed" };
    }
    if (command.kind === "type") {
      if (!desktop.computerType) {
        return { ok: false, error: "Desktop build does not expose computerType yet." };
      }
      const res = await desktop.computerType(command.text);
      return res.ok
        ? { ok: true, outcome: "Typed text" }
        : { ok: false, error: res.error ?? "Type failed" };
    }
    return { ok: false, error: "Unknown computer command" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
