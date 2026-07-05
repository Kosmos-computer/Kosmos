/**
 * AssistantBlock — renders one assistant turn: markdown prose interleaved
 * with inline OpenUI Lang blocks. Extracted from ChatApp so any surface with
 * a chat thread (Chat, Agent Studio) renders assistant output identically.
 */
import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Renderer, type ActionEvent } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import type { ChatItem } from "./useChat";
import { parseSegments } from "./parseSegments";
import { useOsStore } from "../../os/osStore";

interface Props {
  item: Extract<ChatItem, { kind: "assistant" }>;
  /** Invoked when an inline UI action wants to continue the conversation. */
  onFollowUp: (text: string) => void;
}

export function AssistantBlock({ item, onFollowUp }: Props) {
  const theme = useOsStore((s) => s.theme);
  const segments = parseSegments(item.text);

  const handleAction = useCallback(
    (event: ActionEvent) => {
      if (event.type === "open_url" && typeof event.params?.url === "string") {
        window.open(event.params.url, "_blank", "noopener");
        return;
      }
      const contextText = typeof event.params?.context === "string" ? event.params.context : "";
      const text = contextText || event.humanFriendlyMessage || "";
      if (text) onFollowUp(text);
    },
    [onFollowUp],
  );

  return (
    <div className="arco-chat__assistant">
      {segments.map((segment, i) =>
        segment.type === "markdown" ? (
          <div key={i} className="arco-chat__markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment.content}</ReactMarkdown>
          </div>
        ) : (
          <div key={i} className="arco-chat__genui">
            <ThemeProvider mode={theme}>
              <Renderer
                response={segment.content}
                library={openuiChatLibrary}
                isStreaming={segment.open && item.streaming}
                onAction={handleAction}
              />
            </ThemeProvider>
          </div>
        ),
      )}
    </div>
  );
}
