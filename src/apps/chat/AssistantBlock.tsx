/**
 * AssistantBlock — renders one assistant turn via the shared RichMarkdown
 * pipeline (markdown, widgets, and inline openui-lang blocks).
 */
import { useCallback } from "react";
import type { ActionEvent } from "@openuidev/react-lang";
import type { ChatItem } from "./useChat";
import { RichMarkdown } from "../../components/richmarkdown/RichMarkdown";
import { ChatBubbleFooter } from "../../components/chat/ChatBubbleFooter";

interface Props {
  item: Extract<ChatItem, { kind: "assistant" }>;
  /** Invoked when an inline UI action wants to continue the conversation. */
  onFollowUp?: (text: string) => void;
  /** Branch into a new chat with history through this assistant message. */
  onFork?: (item: Extract<ChatItem, { kind: "assistant" }>) => void | Promise<void>;
  /** Drop this reply and resubmit the preceding user prompt. */
  onRegenerate?: (item: Extract<ChatItem, { kind: "assistant" }>) => void | Promise<void>;
}

export function AssistantBlock({ item, onFollowUp, onFork, onRegenerate }: Props) {
  const handleAction = useCallback(
    (event: ActionEvent) => {
      const contextText = typeof event.params?.context === "string" ? event.params.context : "";
      const text = contextText || event.humanFriendlyMessage || "";
      if (text) onFollowUp?.(text);
    },
    [onFollowUp],
  );

  return (
    <div className="arco-chat__assistant">
      <RichMarkdown
        className="arco-chat__markdown arco-richmd"
        text={item.text}
        openui={{
          streaming: item.streaming,
          onAction: handleAction,
        }}
      />
      {!item.streaming && (
        <ChatBubbleFooter
          text={item.text}
          timestamp={item.timestamp}
          align="start"
          variant="assistant"
          onFork={onFork ? () => onFork(item) : undefined}
          onRegenerate={onRegenerate ? () => onRegenerate(item) : undefined}
        />
      )}
    </div>
  );
}
