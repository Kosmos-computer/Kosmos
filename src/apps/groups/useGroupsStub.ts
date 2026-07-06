/**
 * STUB: Groups workspace state — team channels/DMs with connection gating.
 * Wire point: swap mock messages for Mattermost/Slack/Matrix adapters.
 */
import { useCallback, useMemo, useState } from "react";
import { useConnectionStore } from "../../connections/useConnectionStore";
import {
  TEAM_CHANNEL_MESSAGES,
  TEAM_CHANNEL_TOPICS,
  TEAM_CHANNELS,
  TEAM_DIRECT_MESSAGES,
  TEAM_DM_MESSAGES,
  TEAM_NAV_ITEMS,
  teamWorkspacesFromConnections,
} from "./groupsMock";
import type { TeamMessage } from "./types";

export function useGroupsStub() {
  const connections = useConnectionStore((s) => s.connectionsForDomain("teams"));
  const addConnection = useConnectionStore((s) => s.addConnection);
  const connectionsAll = useConnectionStore((s) => s.connections);

  const workspaces = useMemo(() => teamWorkspacesFromConnections(connections), [connections]);

  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState("ch-events");
  const [messages, setMessages] = useState<Record<string, TeamMessage[]>>(() => ({
    ...TEAM_CHANNEL_MESSAGES,
    ...TEAM_DM_MESSAGES,
  }));
  const [composerValue, setComposerValue] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);

  const resolvedConnectionId = activeConnectionId ?? workspaces[0]?.id ?? null;
  const hasConnection = connections.length > 0;

  const activeChannel = TEAM_CHANNELS.find((c) => c.id === activeConversationId);
  const activeDm = TEAM_DIRECT_MESSAGES.find((dm) => dm.id === activeConversationId);
  const conversationTitle = activeChannel ? `#${activeChannel.name}` : (activeDm?.name ?? "Conversation");
  const conversationTopic = TEAM_CHANNEL_TOPICS[activeConversationId];
  const threadMessages = messages[activeConversationId] ?? [];

  const handleSubmit = useCallback(() => {
    if (!composerValue.trim() || !activeConversationId) return;
    const newMessage: TeamMessage = {
      id: `local-${Date.now()}`,
      senderId: "me",
      senderName: "You",
      content: composerValue.trim(),
      timestamp: "Just now",
    };
    setMessages((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] ?? []), newMessage],
    }));
    setComposerValue("");
  }, [activeConversationId, composerValue]);

  return {
    connections,
    connectionsAll,
    workspaces,
    navItems: TEAM_NAV_ITEMS,
    channels: TEAM_CHANNELS,
    directMessages: TEAM_DIRECT_MESSAGES,
    activeConnectionId: resolvedConnectionId,
    setActiveConnectionId,
    activeConversationId,
    setActiveConversationId,
    conversationTitle,
    conversationTopic,
    threadMessages,
    composerValue,
    setComposerValue,
    handleSubmit,
    hasConnection,
    connectOpen,
    setConnectOpen,
    addConnection,
    sidebarWidth,
    setSidebarWidth,
  };
}

export type GroupsViewModel = ReturnType<typeof useGroupsStub>;
