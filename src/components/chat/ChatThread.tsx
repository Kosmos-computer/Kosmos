import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * Shared chat thread renderer — used by Chat and Studio so message blocks
 * stay consistent as new agent block types are added.
 */
import type { ChatItem, TurnMeta } from "../../apps/chat/useChat";
import { AssistantBlock } from "../../apps/chat/AssistantBlock";
import { ToolCard } from "../../apps/chat/ToolCard";
import { ConfirmCard } from "../../apps/chat/ConfirmCard";
import { ChatErrorBlock } from "./ChatErrorBlock";
import { CreditsInsufficientBlock } from "./CreditsInsufficientBlock";
import { UserMessageBlock } from "./UserMessageBlock";
import type { ChatRestoreMode } from "./ChatRewindConfirmModal";
import {
  AgentActionBlock,
  AgentStatusLine,
  AgentThoughtBlock,
  AgentTodoCard,
  TurnMeter,
} from "../agent-blocks";

export interface ChatThreadProps {
  items: ChatItem[];
  sessionId?: string;
  streaming?: boolean;
  /** Live token/time readout for the in-flight turn, shown beside "Working…". */
  turnMeta?: TurnMeta | null;
  onFollowUp?: (text: string) => void;
  /** Branch into a new chat with history through this assistant message. */
  onFork?: (item: Extract<ChatItem, { kind: "assistant" }>) => void | Promise<void>;
  /** Drop this reply and resubmit the preceding user prompt. */
  onRegenerate?: (item: Extract<ChatItem, { kind: "assistant" }>) => void | Promise<void>;
  /** Edit a prior user message and resend (after confirmation). */
  onEditAndResend?: (
    item: Extract<ChatItem, { kind: "user" }>,
    text: string,
  ) => void | Promise<void>;
  /** Rewind conversation and/or code through this user message (after confirmation). */
  onRestoreCheckpoint?: (
    item: Extract<ChatItem, { kind: "user" }>,
    mode: ChatRestoreMode,
  ) => void | Promise<string | null>;
  /** Load restored/edited prompt into the composer. */
  onPrimeComposer?: (text: string) => void;
}

export function ChatThread({
  items,
  sessionId,
  streaming,
  turnMeta,
  onFollowUp,
  onFork,
  onRegenerate,
  onEditAndResend,
  onRestoreCheckpoint,
  onPrimeComposer,
}: ChatThreadProps) {
  const meta = streaming && turnMeta ? (
    <TurnMeter startedAt={turnMeta.startedAt} totalTokens={turnMeta.totalTokens} />
  ) : undefined;

  return (
    <>
      {items.map((item) => {
        switch (item.kind) {
          case "user":
            return (
              <UserMessageBlock
                key={item.id}
                item={item}
                items={items}
                sessionId={sessionId}
                disabled={streaming}
                onEditAndResend={onEditAndResend}
                onRestoreCheckpoint={onRestoreCheckpoint}
                onPrimeComposer={onPrimeComposer}
              />
            );
          case "assistant":
            return (
              <AssistantBlock
                key={item.id}
                item={item}
                onFollowUp={onFollowUp}
                onFork={onFork}
                onRegenerate={streaming ? undefined : onRegenerate}
              />
            );
          case "tool":
            if (item.name === "exec" && item.result) {
              return (
                <AgentActionBlock
                  key={item.id}
                  title="Shell command"
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
            return item.code === "credits_insufficient" ? (
              <CreditsInsufficientBlock key={item.id} text={item.text} />
            ) : (
              <ChatErrorBlock key={item.id} text={item.text} />
            );
        }
      })}
      {streaming ? <AgentStatusLine meta={meta}><T k={I18nKey.COMPONENTS$CHAT_WORKING} /></AgentStatusLine> : null}
    </>
  );
}
