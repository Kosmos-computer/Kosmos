/**
 * STUB: Social feed workspace with per-network connection gating.
 */
import { useCallback, useMemo, useState } from "react";
import type { SocialNetworkId, SocialPost } from "./types";
import { SOCIAL_NETWORKS, SOCIAL_POSTS, SOCIAL_SUGGESTIONS, SOCIAL_TRENDS } from "./socialMock";
import { useConnectionStore } from "../../connections/useConnectionStore";

export function useSocialStub() {
  const connections = useConnectionStore((s) => s.connectionsForDomain("social"));
  const connectionByProvider = useConnectionStore((s) => s.connectionByProvider);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const connectionsAll = useConnectionStore((s) => s.connections);

  const [activeNetworkId, setActiveNetworkId] = useState<SocialNetworkId>("bluesky");
  const [posts, setPosts] = useState<SocialPost[]>(SOCIAL_POSTS);
  const [composerValue, setComposerValue] = useState("");
  const [feedTab, setFeedTab] = useState("for-you");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<SocialNetworkId | undefined>();

  const activeConnection = useMemo(
    () => connectionByProvider("social", activeNetworkId),
    [connectionByProvider, activeNetworkId],
  );

  const connectedNetworkIds = useMemo(
    () => new Set(connections.map((c) => c.provider as SocialNetworkId)),
    [connections],
  );

  const openConnect = useCallback((provider?: SocialNetworkId) => {
    setConnectProvider(provider ?? activeNetworkId);
    setConnectOpen(true);
  }, [activeNetworkId]);

  const handleSubmit = useCallback(() => {
    if (!composerValue.trim() || !activeConnection) return;
    const newPost: SocialPost = {
      id: `local-${Date.now()}`,
      authorName: "You",
      authorHandle: activeConnection.accountHint ?? "@you",
      timestamp: "Just now",
      content: composerValue.trim(),
      stats: { replies: 0, reposts: 0, likes: 0 },
    };
    setPosts((prev) => [newPost, ...prev]);
    setComposerValue("");
  }, [activeConnection, composerValue]);

  return {
    networks: SOCIAL_NETWORKS,
    activeNetworkId,
    setActiveNetworkId,
    activeConnection,
    connectedNetworkIds,
    posts,
    trends: SOCIAL_TRENDS,
    suggestions: SOCIAL_SUGGESTIONS,
    composerValue,
    setComposerValue,
    handleSubmit,
    feedTab,
    setFeedTab,
    connectOpen,
    setConnectOpen,
    connectProvider,
    openConnect,
    addConnection,
    connectionsAll,
  };
}

export type SocialViewModel = ReturnType<typeof useSocialStub>;
