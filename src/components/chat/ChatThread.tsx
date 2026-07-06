/**
 * Shared chat thread renderer — used by Chat and Studio so message blocks
 * stay consistent as new agent block types are added.
 */
import type { ChatItem, TurnMeta } from "../../apps/chat/useChat";
import { AssistantBlock } from "../../apps/chat/AssistantBlock";
import { ToolCard } from "../../apps/chat/ToolCard";
import { ConfirmCard } from "../../apps/chat/ConfirmCard";
import { ChatBubbleFooter } from "./ChatBubbleFooter";
import { ChatErrorBlock } from "./ChatErrorBlock";
import {
  AgentActionBlock,
  AgentStatusLine,
  AgentThoughtBlock,
  AgentTodoCard,
  TurnMeter,
} from "../agent-blocks";

export interface ChatThreadProps {
  items: ChatItem[];
  streaming?: boolean;
  /** Live token/time readout for the in-flight turn, shown beside "Working…". */
  turnMeta?: TurnMeta | null;
  onFollowUp?: (text: string) => void;
}

export function ChatThread({ items, streaming, turnMeta, onFollowUp }: ChatThreadProps) {
  const meta = streaming && turnMeta ? (
    <TurnMeter startedAt={turnMeta.startedAt} totalTokens={turnMeta.totalTokens} />
  ) : undefined;

  return (
    <>
      {items.map((item) => {
        switch (item.kind) {
          case "user":
            return (
              <div key={item.id} className="arco-chat__user-row">
                <div className="arco-chat__user">{item.text}</div>
                <ChatBubbleFooter text={item.text} timestamp={item.timestamp} align="end" variant="user" />
              </div>
            );
          case "assistant":
            return <AssistantBlock key={item.id} item={item} onFollowUp={onFollowUp} />;
          case "tool":
            if (item.name === "exec" && item.result) {
              return (
                <AgentActionBlock
                  key={item.id}
                  title={String(item.args.command ?? "shell command")}
                  command={String(item.args.command ?? "")}
                  output={item.result}
                  defaultOpen={false}
                />
              );
            }
            return <ToolCard key={item.id} item={item} />;
          case "confirm":
            return <ConfirmCard key={item.id} item={item} />;
          case "thought":
            return (
              <AgentThoughtBlock key={item.id} duration={item.duration} defaultOpen={item.defaultOpen}>
                {item.text}
              </AgentThoughtBlock>
            );
          case "todo":
            return <AgentTodoCard key={item.id} items={item.items} />;
          case "status":
            return (
              <AgentStatusLine key={item.id} meta={meta}>
                {item.text}
              </AgentStatusLine>
            );
          case "error":
            return <ChatErrorBlock key={item.id} text={item.text} />;
        }
      })}
      {streaming ? <AgentStatusLine meta={meta}>Working…</AgentStatusLine> : null}
    </>
  );
}
