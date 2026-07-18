/**
 * Post-turn background review — Hermes closed learning loop, Kosmos-shaped.
 *
 * After a turn completes, a cheap aux model reviews the transcript and may
 * create **pending** memory entries and/or skill **proposals**. Nothing goes
 * live without human Apply (Skills / Memory UI). Never mutates the live
 * skill store or active memory status.
 *
 * Fire-and-forget from runAgentTurn; failures are logged and swallowed.
 */
import type { ChatMessage } from "../../shared/types.js";
import type { MemoryKind, MemoryPrincipalId } from "../../shared/capabilities/memory.js";
import { loadSettings } from "../env.js";
import { modelStore } from "../stores/modelStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { memoryStore } from "../memory/memoryStore.js";
import { MEMORY_KINDS } from "../memory/memoryGrantStore.js";
import { skillStore } from "../skills/skillStore.js";
import { completeJson } from "./completeJson.js";

const MAX_TRANSCRIPT_CHARS = 12_000;
const MIN_MESSAGES_FOR_REVIEW = 4;

interface ReviewProposal {
  memories?: Array<{
    kind: string;
    title: string;
    summary: string;
    body?: string;
  }>;
  skills?: Array<{
    name: string;
    description: string;
    body: string;
    /** When set, propose a patch to an existing skill instead of a new one. */
    targetSkillId?: string;
  }>;
}

function truncateTranscript(messages: ChatMessage[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    if (m.role === "user") lines.push(`User: ${m.content}`);
    else if (m.role === "assistant" && m.content) lines.push(`Assistant: ${m.content}`);
    else if (m.role === "tool") {
      lines.push(`Tool(${m.name}): ${m.content.slice(0, 200)}`);
    }
  }
  let text = lines.join("\n\n");
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    text = "…[earlier truncated]\n\n" + text.slice(-MAX_TRANSCRIPT_CHARS);
  }
  return text;
}

const REVIEW_SYSTEM = `You are a post-turn curator for an AI OS. Review the conversation and decide whether anything durable should be proposed.

Return ONLY a JSON object:
{
  "memories": [{ "kind": "semantic"|"episodic"|"procedural"|"identity"|"working"|"reference", "title": "...", "summary": "...", "body": "..." }],
  "skills": [{ "name": "...", "description": "when to read this", "body": "markdown instructions", "targetSkillId": "optional existing skill id" }]
}

Rules:
- Prefer empty arrays. Only propose when clearly useful across future sessions.
- Memories: stable facts, preferences, decisions — not ephemeral chit-chat.
- Skills: reusable procedures distilled from this turn. Prefer patching an existing skill (targetSkillId) over creating a duplicate.
- Never invent secrets, credentials, or private data the user did not state.
- Cap at 3 memories and 2 skills per review.`;

export interface BackgroundReviewOpts {
  sessionId: string;
  principalId: MemoryPrincipalId;
  /** Skip when the turn was trivial (e.g. ask-mode, very short). */
  skip?: boolean;
}

/**
 * Review the session transcript and write pending memory + skill proposals.
 * Safe to call without awaiting; errors never throw to the caller.
 */
export async function reviewTurn(opts: BackgroundReviewOpts): Promise<{
  memories: number;
  skills: number;
}> {
  if (opts.skip) return { memories: 0, skills: 0 };

  const session = await sessionStore.get(opts.sessionId);
  if (!session || session.messages.length < MIN_MESSAGES_FOR_REVIEW) {
    return { memories: 0, skills: 0 };
  }

  // Avoid re-reviewing the same short automation ping repeatedly.
  if (session.kind === "automation" && session.messages.length < 6) {
    return { memories: 0, skills: 0 };
  }

  const baseSettings = loadSettings();
  const llm = modelStore.resolveModel("background.review", baseSettings);
  const settings = {
    ...baseSettings,
    provider: llm.provider,
    baseUrl: llm.baseUrl,
    model: llm.model,
    apiKey: llm.apiKey,
  };

  const existingSkills = skillStore
    .list()
    .filter((s) => s.enabled)
    .slice(0, 40)
    .map((s) => `- ${s.id}: ${s.name} — ${s.description}`)
    .join("\n");

  const user = [
    `Session: ${session.id} (${session.kind})`,
    `Title: ${session.title}`,
    "",
    "Existing skills (reuse targetSkillId when patching):",
    existingSkills || "(none)",
    "",
    "Transcript:",
    truncateTranscript(session.messages),
  ].join("\n");

  const result = await completeJson<ReviewProposal>({
    settings,
    system: REVIEW_SYSTEM,
    user,
  });

  if (!result) return { memories: 0, skills: 0 };

  let memories = 0;
  let skills = 0;

  for (const mem of result.memories ?? []) {
    if (memories >= 3) break;
    const kind = mem.kind as MemoryKind;
    if (!(MEMORY_KINDS as string[]).includes(kind)) continue;
    const title = String(mem.title ?? "").trim();
    const summary = String(mem.summary ?? "").trim();
    if (!title || !summary) continue;
    try {
      memoryStore.createEntry(opts.principalId, {
        kind,
        title,
        summary,
        ...(mem.body ? { body: String(mem.body) } : {}),
        status: "pending",
        source: `background_review:${opts.sessionId}`,
        sourceSessionId: opts.sessionId,
        confidence: 0.6,
      });
      memories += 1;
    } catch (err) {
      console.warn(
        `[arco] background memory proposal failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  for (const sk of result.skills ?? []) {
    if (skills >= 2) break;
    const name = String(sk.name ?? "").trim();
    const description = String(sk.description ?? "").trim();
    const body = String(sk.body ?? "").trim();
    if (!name || !description || !body) continue;
    const targetSkillId =
      typeof sk.targetSkillId === "string" && sk.targetSkillId.trim()
        ? sk.targetSkillId.trim()
        : undefined;
    if (targetSkillId && !skillStore.get(targetSkillId)) {
      // Unknown target — fall through as a new skill proposal.
    }
    try {
      skillStore.createProposal({
        name,
        description,
        body,
        ...(targetSkillId && skillStore.get(targetSkillId) ? { targetSkillId } : {}),
      });
      skills += 1;
    } catch (err) {
      console.warn(
        `[arco] background skill proposal failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (memories > 0 || skills > 0) {
    console.log(
      `[arco] background review session=${opts.sessionId}: ${memories} memory, ${skills} skill proposal(s)`,
    );
  }

  return { memories, skills };
}

/**
 * Fire-and-forget wrapper — never rejects.
 */
export function scheduleBackgroundReview(opts: BackgroundReviewOpts): void {
  void reviewTurn(opts).catch((err) => {
    console.warn(
      `[arco] background review crashed:`,
      err instanceof Error ? err.message : err,
    );
  });
}
