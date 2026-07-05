/**
 * Chat/automation session persistence — one JSON file per session.
 * Messages are stored in a provider-neutral shape (see shared/types.ts) that
 * both replays into the LLM and renders in the chat UI.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ChatMessage, Session, SessionSummary } from "../../shared/types.js";
import { dataDirs } from "../env.js";

export class SessionStore {
  private dir = dataDirs.sessions;

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  async create(kind: Session["kind"], title: string): Promise<Session> {
    await fs.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const session: Session = {
      id: crypto.randomUUID(),
      title,
      kind,
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
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async save(session: Session): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.filePath(session.id), JSON.stringify(session, null, 2), "utf-8");
  }

  async appendMessages(id: string, messages: ChatMessage[]): Promise<void> {
    const session = await this.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    session.messages.push(...messages);
    // First user message titles the thread.
    if (session.title === "New chat") {
      const firstUser = session.messages.find((m) => m.role === "user");
      if (firstUser && firstUser.role === "user") {
        session.title = firstUser.content.slice(0, 60) || "New chat";
      }
    }
    await this.save(session);
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
            const s = JSON.parse(raw) as Session;
            const summary: SessionSummary = {
              id: s.id,
              title: s.title,
              kind: s.kind,
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
  }
}

export const sessionStore = new SessionStore();
