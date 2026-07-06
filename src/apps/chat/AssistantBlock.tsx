/**
 * AssistantBlock — renders one assistant turn via the shared RichMarkdown
 * pipeline (markdown, widgets, and inline openui-lang blocks).
 */
import { useCallback } from "react";
import type { ActionEvent } from "@openuidev/react-lang";
import type { ChatItem } from "./useChat";
import { RichMarkdown } from "../../components/richmarkdown/RichMarkdown";

interface Props {
  item: Extract<ChatItem, { kind: "assistant" }>;
  /** Invoked when an inline UI action wants to continue the conversation. */
  onFollowUp: (text: string) => void;
}

export function AssistantBlock({ item, onFollowUp }: Props) {
  const handleAction = useCallback(
    (event: ActionEvent) => {
      const contextText = typeof event.params?.context === "string" ? event.params.context : "";
      const text = contextText || event.humanFriendlyMessage || "";
      if (text) onFollowUp(text);
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
    </div>
  );
}
