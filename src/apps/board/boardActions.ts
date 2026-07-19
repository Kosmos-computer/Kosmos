import { STUDIO_ID } from "../studio/studioMeta";
import { activateShellWindow, openShellWindow } from "../../os/shellNavigation";
import { useWindowStore } from "../../os/windowStore";
import { systemAppTitle } from "../../os/systemAppTitles";
import type { WorkItem } from "./types";
import { useBoardLaunchStore } from "./boardLaunchStore";

function studioIsOpen(): boolean {
  return useWindowStore
    .getState()
    .windows.some((win) => win.kind.type === "system" && win.kind.app === STUDIO_ID);
}

function composerSeed(item: WorkItem, brief?: string): string {
  if (brief?.trim()) return brief.trim();
  const parts = [item.title];
  if (item.description?.trim()) parts.push("", item.description.trim());
  return parts.join("\n");
}

/** Open or focus Studio with this work item's workspace + session context. */
export function openWorkItemInStudio(item: WorkItem, sessionId?: string): void {
  useBoardLaunchStore.getState().request({
    workItemId: item.id,
    sessionId: sessionId ?? item.sessionIds[0],
    projectId: item.projectId,
    worktreePath: item.worktreePath,
  });
  activateShellWindow({ type: "system", app: STUDIO_ID }, systemAppTitle(STUDIO_ID), studioIsOpen());
}

/** Open Studio, apply worktree/project, start a new chat from the card (optionally auto-send). */
export function startAgentOnWorkItem(
  item: WorkItem,
  opts?: { brief?: string; submit?: boolean },
): void {
  useBoardLaunchStore.getState().request({
    workItemId: item.id,
    projectId: item.projectId,
    worktreePath: item.worktreePath,
    composerText: composerSeed(item, opts?.brief),
    startNewChat: true,
    submitComposer: opts?.submit ?? false,
  });
  activateShellWindow({ type: "system", app: STUDIO_ID }, systemAppTitle(STUDIO_ID), studioIsOpen());
}

/** Open the full Board system app. */
export function openFullBoard(): void {
  const isOpen = useWindowStore
    .getState()
    .windows.some((win) => win.kind.type === "system" && win.kind.app === "board");
  if (isOpen) {
    activateShellWindow({ type: "system", app: "board" }, systemAppTitle("board"), true);
    return;
  }
  openShellWindow({ type: "system", app: "board" }, systemAppTitle("board"));
}
