/**
 * Session file checkpoints — Claude Code / Cursor style.
 *
 * Each user turn records `write_file` / ACP edits (path + before/after).
 * Restoring to a user message reverts those edits in reverse so workspace
 * files match the state before that turn ran.
 *
 * After a restore, a short-lived undo bundle lets the user “Redo checkpoint”
 * (Cursor) before the next turn runs.
 *
 * Limitations (same as Claude Code): bash/`exec` mutations and manual edits
 * outside agent tools are not tracked.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { ChatMessage } from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { getWorkspaceBackend, resolveProjectPath } from "./workspaceStore.js";

export interface CheckpointFileEdit {
  path: string;
  /** null means the file was created during the turn. */
  before: string | null;
  after: string;
  at: string;
}

export interface TurnCheckpoint {
  /** Index of the user message in session.messages that started this turn. */
  userMessageIndex: number;
  edits: CheckpointFileEdit[];
}

interface SessionCheckpoints {
  sessionId: string;
  turns: TurnCheckpoint[];
}

/** Captured so restore can be undone before the next user turn. */
export interface PendingRestoreUndo {
  sessionId: string;
  mode: "both" | "conversation" | "code";
  discardedMessages: ChatMessage[];
  removedTurns: TurnCheckpoint[];
  /** File contents to write back on redo (pre-restore on-disk state). */
  redoFiles: { path: string; content: string | null; diffBefore: string | null }[];
  createdAt: string;
}

function filePath(sessionId: string): string {
  return path.join(dataDirs.sessions, `${sessionId}.checkpoints.json`);
}

function undoPath(sessionId: string): string {
  return path.join(dataDirs.sessions, `${sessionId}.restore-undo.json`);
}

async function load(sessionId: string): Promise<SessionCheckpoints> {
  try {
    const raw = await fs.readFile(filePath(sessionId), "utf-8");
    const parsed = JSON.parse(raw) as SessionCheckpoints;
    return {
      sessionId,
      turns: Array.isArray(parsed.turns) ? parsed.turns : [],
    };
  } catch {
    return { sessionId, turns: [] };
  }
}

async function save(data: SessionCheckpoints): Promise<void> {
  await fs.mkdir(dataDirs.sessions, { recursive: true });
  await fs.writeFile(filePath(data.sessionId), JSON.stringify(data, null, 2), "utf-8");
}

async function restorePath(relPath: string, content: string | null): Promise<void> {
  if (getWorkspaceBackend() === "drive") {
    const { resolveDriveEntryId, writeDriveWorkspace } = await import("./driveWorkspace.js");
    const { filesService } = await import("../services/filesService.js");
    if (content === null) {
      try {
        filesService.delete(resolveDriveEntryId(relPath));
      } catch {
        // Already gone.
      }
      return;
    }
    writeDriveWorkspace(relPath, content);
    return;
  }

  const abs = resolveProjectPath(relPath);
  if (content === null) {
    await fs.unlink(abs).catch(() => {});
    return;
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
}

export const checkpointStore = {
  /** Open a turn bucket when a user message is appended. */
  async beginTurn(sessionId: string, userMessageIndex: number): Promise<void> {
    // A new turn commits the previous restore — Cursor clears “Redo checkpoint”.
    await this.clearPendingUndo(sessionId);
    const data = await load(sessionId);
    if (data.turns.some((t) => t.userMessageIndex === userMessageIndex)) return;
    data.turns.push({ userMessageIndex, edits: [] });
    await save(data);
  },

  /** Record a tool-authored file edit against the latest open turn. */
  async recordEdit(
    sessionId: string,
    edit: { path: string; before: string | null; after: string },
  ): Promise<void> {
    const rel = edit.path.trim();
    if (!rel) return;
    const data = await load(sessionId);
    let turn = data.turns[data.turns.length - 1];
    if (!turn) {
      // Edit without a user turn (rare) — attach to a synthetic bucket.
      turn = { userMessageIndex: -1, edits: [] };
      data.turns.push(turn);
    }
    turn.edits.push({
      path: rel,
      before: edit.before,
      after: edit.after,
      at: new Date().toISOString(),
    });
    await save(data);
  },

  /** How many tracked edits sit at or after this user message index. */
  async editCountFrom(sessionId: string, fromUserMessageIndex: number): Promise<number> {
    const data = await load(sessionId);
    return data.turns
      .filter((t) => t.userMessageIndex >= fromUserMessageIndex)
      .reduce((n, t) => n + t.edits.length, 0);
  },

  /**
   * Revert file edits from turns that started at `fromUserMessageIndex` or later.
   * Returns restored on-disk state plus enough data to undo (“Redo checkpoint”).
   */
  async restoreFilesFrom(
    sessionId: string,
    fromUserMessageIndex: number,
  ): Promise<{
    restoredFiles: { path: string; content: string | null }[];
    removedTurns: TurnCheckpoint[];
    redoFiles: { path: string; content: string | null; diffBefore: string | null }[];
  }> {
    const data = await load(sessionId);
    const removedTurns = data.turns
      .filter((t) => t.userMessageIndex >= fromUserMessageIndex)
      .sort((a, b) => a.userMessageIndex - b.userMessageIndex);

    /** Chronological last after + first before per path — for undo / Diffs. */
    const redoByPath = new Map<string, { content: string | null; diffBefore: string | null }>();
    for (const turn of removedTurns) {
      for (const edit of turn.edits) {
        const prior = redoByPath.get(edit.path);
        redoByPath.set(edit.path, {
          content: edit.after,
          diffBefore: prior ? prior.diffBefore : edit.before,
        });
      }
    }

    /** Last write wins when collapsing reverse-replayed restores. */
    const finalByPath = new Map<string, string | null>();
    for (const turn of [...removedTurns].reverse()) {
      for (let i = turn.edits.length - 1; i >= 0; i--) {
        const edit = turn.edits[i];
        if (!edit) continue;
        await restorePath(edit.path, edit.before);
        finalByPath.set(edit.path, edit.before);
      }
    }

    data.turns = data.turns.filter((t) => t.userMessageIndex < fromUserMessageIndex);
    await save(data);

    return {
      restoredFiles: [...finalByPath.entries()].map(([p, content]) => ({ path: p, content })),
      removedTurns,
      redoFiles: [...redoByPath.entries()].map(([p, v]) => ({
        path: p,
        content: v.content,
        diffBefore: v.diffBefore,
      })),
    };
  },

  /** Drop turns at/after a user message index (conversation truncate without file restore). */
  async dropTurnsFrom(sessionId: string, fromUserMessageIndex: number): Promise<void> {
    const data = await load(sessionId);
    const next = data.turns.filter((t) => t.userMessageIndex < fromUserMessageIndex);
    if (next.length === data.turns.length) return;
    data.turns = next;
    await save(data);
  },

  async peekTurnsFrom(
    sessionId: string,
    fromUserMessageIndex: number,
  ): Promise<TurnCheckpoint[]> {
    const data = await load(sessionId);
    return data.turns.filter((t) => t.userMessageIndex >= fromUserMessageIndex);
  },

  async savePendingUndo(undo: PendingRestoreUndo): Promise<void> {
    await fs.mkdir(dataDirs.sessions, { recursive: true });
    await fs.writeFile(undoPath(undo.sessionId), JSON.stringify(undo, null, 2), "utf-8");
  },

  async getPendingUndo(sessionId: string): Promise<PendingRestoreUndo | null> {
    try {
      const raw = await fs.readFile(undoPath(sessionId), "utf-8");
      return JSON.parse(raw) as PendingRestoreUndo;
    } catch {
      return null;
    }
  },

  async clearPendingUndo(sessionId: string): Promise<void> {
    await fs.unlink(undoPath(sessionId)).catch(() => {});
  },

  /** Put removed turn buckets back after a redo. */
  async restoreTurns(sessionId: string, turns: TurnCheckpoint[]): Promise<void> {
    if (turns.length === 0) return;
    const data = await load(sessionId);
    const existing = new Set(data.turns.map((t) => t.userMessageIndex));
    for (const turn of turns) {
      if (!existing.has(turn.userMessageIndex)) data.turns.push(turn);
    }
    data.turns.sort((a, b) => a.userMessageIndex - b.userMessageIndex);
    await save(data);
  },

  /** Re-apply pre-restore file contents (undo a restore). */
  async applyRedoFiles(
    files: { path: string; content: string | null }[],
  ): Promise<{ path: string; content: string | null }[]> {
    const applied: { path: string; content: string | null }[] = [];
    for (const file of files) {
      await restorePath(file.path, file.content);
      applied.push({ path: file.path, content: file.content });
    }
    return applied;
  },

  async removeSession(sessionId: string): Promise<void> {
    await fs.unlink(filePath(sessionId)).catch(() => {});
    await fs.unlink(undoPath(sessionId)).catch(() => {});
  },
};
