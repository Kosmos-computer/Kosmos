/**
 * Chat/automation session persistence — one JSON file per session.
 * Messages are stored in a provider-neutral shape (see shared/types.ts) that
 * both replays into the LLM and renders in the chat UI.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ChatMessage, Session, SessionSummary } from "../../shared/types.js";
import { sanitizeMessagesForLlm } from "../agent/sanitizeMessages.js";
import { dataDirs } from "../env.js";
import { checkpointStore } from "./checkpointStore.js";
import { projectStore } from "./projectStore.js";
import { sessionSearchIndex } from "./sessionSearchIndex.js";

function sessionText(session: Session): string {
  return session.messages
    .map((m) => ("content" in m && typeof m.content === "string" ? m.content : ""))
    .join("\n");
}

function inferProjectId(session: Session): string | null {
  if (session.projectId) return session.projectId;
  const projects = [...projectStore.list().projects].sort(
    (a, b) => b.path.length - a.path.length,
  );
  if (projects.length === 0) return null;
  const blob = sessionText(session);

  for (const project of projects) {
    if (blob.includes(project.path)) return project.id;
  }

  // Techno Studio ui snapshots record the active project picker label in the top bar.
  for (const project of projects) {
    const pickerLabel = `button \\"${project.name}\\"`;
    if (
      blob.includes(pickerLabel) &&
      (blob.includes("Techno Studio") || blob.includes("Agent Studio"))
    ) {
      return project.id;
    }
  }

  return null;
}

export class SessionStore {
  private dir = dataDirs.sessions;

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async create(
    kind: Session["kind"],
    title: string,
    opts?: { projectId?: string | null; profileId?: string | null; workItemId?: string | null },
  ): Promise<Session> {
    await fs.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      title,
      kind,
      projectId: opts?.projectId ?? null,
      profileId: opts?.profileId ?? null,
      workItemId: opts?.workItemId ?? null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.save(session);
    return session;
  }

  async get(id: string): Promise<Session | null> {
    try {
      const raw = await fs.readFile(this.filePath(id), "utf-8");
      return this.resolveProjectId(JSON.parse(raw) as Session);
    } catch {
      return null;
    }
  }

  /** Tag an untagged session with the active workspace (continued chats). */
  async tagProjectIfMissing(session: Session, projectId: string | null): Promise<Session> {
    if (session.projectId != null) return session;
    session.projectId = projectId;
    await this.save(session);
    return session;
  }

  /** Set or clear the agent profile for a session. */
  async setProfileId(id: string, profileId: string | null): Promise<Session | null> {
    const session = await this.get(id);
    if (!session) return null;
    session.profileId = profileId;
    await this.save(session);
    return session;
  }

  /** Bind or clear the board work item for a session. */
  async setWorkItemId(id: string, workItemId: string | null): Promise<Session | null> {
    const session = await this.get(id);
    if (!session) return null;
    session.workItemId = workItemId;
    await this.save(session);
    return session;
  }

  private async resolveProjectId(session: Session): Promise<Session> {
    const inferred = inferProjectId(session);
    if (inferred && session.projectId !== inferred) {
      session.projectId = inferred;
      await this.save(session);
    }
    return session;
  }

  async save(session: Session): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.filePath(session.id), JSON.stringify(session, null, 2), "utf-8");
  }

  async appendMessages(id: string, messages: ChatMessage[]): Promise<void> {
    const session = await this.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    const fromIdx = session.messages.length;
    const now = new Date().toISOString();
    const userTurnIndexes: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i]?.role === "user") userTurnIndexes.push(fromIdx + i);
    }
    session.messages.push(
      ...messages.map((m) => (m.role === "tool" ? m : { ...m, timestamp: m.timestamp ?? now })),
    );
    // First user message titles the thread.
    if (session.title === "New chat") {
      const firstUser = session.messages.find((m) => m.role === "user");
      if (firstUser && firstUser.role === "user") {
        session.title = firstUser.content.slice(0, 60) || "New chat";
      }
    }
    await this.save(session);
    for (const userMessageIndex of userTurnIndexes) {
      try {
        await checkpointStore.beginTurn(id, userMessageIndex);
      } catch (err) {
        console.warn(
          `[arco] checkpoint beginTurn failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    try {
      sessionSearchIndex.indexMessages(session.id, session.messages, fromIdx);
    } catch (err) {
      console.warn(
        `[arco] session FTS index failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  async list(): Promise<SessionSummary[]> {
    await fs.mkdir(this.dir, { recursive: true });
    let entries: string[];
    try {
      entries = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const records = await Promise.all(
      entries
        .filter((e) => e.endsWith(".json"))
        .map(async (file) => {
          try {
            const raw = await fs.readFile(path.join(this.dir, file), "utf-8");
            const s = await this.resolveProjectId(JSON.parse(raw) as Session);
            const summary: SessionSummary = {
              id: s.id,
              title: s.title,
              kind: s.kind,
              projectId: s.projectId ?? null,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
              messageCount: s.messages.length,
            };
            return summary;
          } catch {
            return null;
          }
        }),
    );
    return (records.filter(Boolean) as SessionSummary[]).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.filePath(id));
    } catch {
      // Already gone.
    }
    try {
      sessionSearchIndex.removeSession(id);
    } catch {
      // Index best-effort.
    }
    try {
      await checkpointStore.removeSession(id);
    } catch {
      // Checkpoints best-effort.
    }
  }

  async updateTitle(id: string, title: string): Promise<Session> {
    const session = await this.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    session.title = title.trim() || session.title;
    await this.save(session);
    return session;
  }

  /**
   * Re-append messages after a restore undo without opening new checkpoint turns
   * (turns are restored separately from the undo bundle).
   */
  async appendMessagesRaw(id: string, messages: ChatMessage[]): Promise<Session> {
    const session = await this.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    if (messages.length === 0) return session;
    const fromIdx = session.messages.length;
    const now = new Date().toISOString();
    session.messages.push(
      ...messages.map((m) => (m.role === "tool" ? m : { ...m, timestamp: m.timestamp ?? now })),
    );
    await this.save(session);
    try {
      sessionSearchIndex.indexMessages(session.id, session.messages, fromIdx);
    } catch (err) {
      console.warn(
        `[arco] session FTS index failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    return session;
  }

  /**
   * Keep the first `keepCount` messages and drop the rest.
   * Used by regenerate (truncate through the prior user turn, then re-run).
   */
  async truncate(id: string, keepCount: number): Promise<Session> {
    const session = await this.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    if (!Number.isInteger(keepCount) || keepCount < 0) {
      throw new Error("keepCount must be a non-negative integer");
    }
    const keep = Math.min(keepCount, session.messages.length);
    // Snap off a cut mid tool-round so the next user append stays provider-valid.
    session.messages = sanitizeMessagesForLlm(session.messages.slice(0, keep));
    await this.save(session);
    // Drop file-edit turn buckets for user prompts that no longer exist.
    try {
      await checkpointStore.dropTurnsFrom(id, keep);
    } catch (err) {
      console.warn(
        `[arco] checkpoint dropTurns failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    try {
      sessionSearchIndex.removeSession(id);
      sessionSearchIndex.indexMessages(id, session.messages, 0);
    } catch (err) {
      console.warn(
        `[arco] session FTS reindex failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    return session;
  }

  /**
   * Fork a conversation into a new session, copying messages through
   * `upToMessageIndex` (inclusive) plus any trailing tool results for that turn.
   * The source session is left unchanged — ChatGPT "Branch in new chat" semantics.
   */
  async fork(id: string, upToMessageIndex: number): Promise<Session> {
    const source = await this.get(id);
    if (!source) throw new Error(`Session not found: ${id}`);
    if (source.messages.length === 0) throw new Error("Cannot fork an empty session");

    const start = Math.max(0, Math.min(upToMessageIndex, source.messages.length - 1));
    let end = start;
    for (let i = start + 1; i < source.messages.length; i++) {
      if (source.messages[i]?.role === "tool") end = i;
      else break;
    }

    const now = new Date().toISOString();
    const baseTitle = source.title.trim() || "New chat";
    const title =
      baseTitle === "New chat" ? "Forked conversation" : `${baseTitle.slice(0, 50)} (fork)`;

    const forked: Session = {
      id: crypto.randomUUID(),
      title,
      kind: source.kind === "automation" ? "chat" : source.kind,
      projectId: source.projectId ?? null,
      profileId: source.profileId ?? null,
      messages: source.messages.slice(0, end + 1).map((m) => structuredClone(m)),
      createdAt: now,
      updatedAt: now,
    };
    await this.save(forked);
    try {
      sessionSearchIndex.indexMessages(forked.id, forked.messages, 0);
    } catch (err) {
      console.warn(
        `[arco] session FTS index failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    return forked;
  }
}

export const sessionStore = new SessionStore();
