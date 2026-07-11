/**
 * Save conversation — bundles the persisted session, rendered feed items,
 * workspace activity, and extracted UI components into one downloadable JSON
 * archive.
 */
import { extractOpenUiCode } from "@shared/generator/extractOpenUi";
import type { AppSummary, Session, StoredApp } from "@shared/types";
import { api } from "../../lib/api";
import type { ChatItem } from "../chat/useChat";
import { sessionToFeed } from "../chat/useChat";
import type { SessionActivity } from "./studioStore";
import { useStudioStore } from "./studioStore";

export const CONVERSATION_EXPORT_VERSION = 1;

export interface ConversationOpenUiComponent {
  id: string;
  source: "assistant" | "tool";
  messageId?: string;
  toolCallId?: string;
  code: string;
}

export interface ConversationExport {
  version: typeof CONVERSATION_EXPORT_VERSION;
  exportedAt: string;
  session: Session;
  feed: ChatItem[];
  activity: SessionActivity | null;
  components: {
    openui: ConversationOpenUiComponent[];
    apps: StoredApp[];
  };
}

function slugifyFilename(title: string, fallback: string): string {
  return title.replace(/[^\w.-]+/g, "-").slice(0, 60) || fallback;
}

function extractOpenUiFromFeed(feed: ChatItem[]): ConversationOpenUiComponent[] {
  const components: ConversationOpenUiComponent[] = [];
  for (const item of feed) {
    if (item.kind === "assistant") {
      const code = extractOpenUiCode(item.text);
      if (code) {
        components.push({ id: item.id, source: "assistant", messageId: item.id, code });
      }
    } else if (item.kind === "tool" && item.result) {
      const code = extractOpenUiCode(item.result);
      if (code) {
        components.push({
          id: item.id,
          source: "tool",
          toolCallId: item.callId,
          code,
        });
      }
    }
  }
  return components;
}

async function loadSessionApps(sessionId: string): Promise<StoredApp[]> {
  let summaries: AppSummary[] = [];
  try {
    summaries = await api.listApps();
  } catch {
    return [];
  }

  const linked = summaries.filter((app) => app.sessionId === sessionId);
  const apps: StoredApp[] = [];
  for (const summary of linked) {
    try {
      apps.push(await api.getApp(summary.id));
    } catch {
      // Skip apps that fail to load.
    }
  }
  return apps;
}

export interface BuildConversationExportOptions {
  session: Session;
  feed?: ChatItem[];
  activity?: SessionActivity | null;
  includeApps?: boolean;
}

export async function buildConversationExport({
  session,
  feed,
  activity,
  includeApps = true,
}: BuildConversationExportOptions): Promise<ConversationExport> {
  const resolvedFeed = feed ?? sessionToFeed(session);
  const resolvedActivity =
    activity ??
    useStudioStore.getState().sessionActivity[session.id] ??
    null;

  return {
    version: CONVERSATION_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    session,
    feed: resolvedFeed,
    activity: resolvedActivity,
    components: {
      openui: extractOpenUiFromFeed(resolvedFeed),
      apps: includeApps ? await loadSessionApps(session.id) : [],
    },
  };
}

export function downloadConversationExport(
  payload: ConversationExport,
  title: string,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugifyFilename(title, payload.session.id)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveConversation(
  sessionId: string,
  title: string,
  options?: { feed?: ChatItem[]; activity?: SessionActivity | null },
): Promise<void> {
  const session = await api.getSession(sessionId);
  const payload = await buildConversationExport({
    session,
    feed: options?.feed,
    activity: options?.activity,
  });
  downloadConversationExport(payload, title);
}
