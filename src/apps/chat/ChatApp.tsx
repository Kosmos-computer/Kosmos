import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * The Chat app — the OS's front door. Calm-Console shaped: prose first,
 * tool activity as compact metadata cards, inline generative UI rendered
 * from fenced openui-lang via the chat component library.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { History, Plus, Trash2 } from "lucide-react";
import { useChat } from "./useChat";
import { onPrimeComposer } from "./composerBus";
import { VoiceBar } from "./VoiceBar";
import { useVoice, voiceClient } from "../../voice";
import { Composer } from "../../components/composer/Composer";
import { ChatThread } from "../../components/chat/ChatThread";
import { MasterDetail } from "../../components/patterns";
import { EmptyState } from "../../components/ui";
import { useModelSelection } from "../studio/useModelSelection";

export function ChatApp() {
  const chat = useChat();
  const voice = useVoice();
  const { modelLabel, modelItems } = useModelSelection();
  const [draft, setDraft] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const followRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [chat.items]);

  const submit = useCallback(
    (text?: string) => {
      const value = (text ?? draft).trim();
      if (!value) return;
      setDraft("");
      followRef.current = true;
      void chat.send(value);
    },
    [draft, chat],
  );

  useEffect(() => voiceClient.subscribe(chat.applyVoiceEvent), [chat.applyVoiceEvent]);

  useEffect(
    () =>
      onPrimeComposer(({ text, submit: shouldSubmit }) => {
        if (shouldSubmit) submit(text);
        else setDraft(text);
      }),
    [submit],
  );

  const sessionList = (
    <>
      {chat.sessions.length === 0 && <EmptyState><T k={I18nKey.APPS$CHAT_NO_SESSIONS_YET} /></EmptyState>}
      {chat.sessions.map((s) => (
        <div
          key={s.id}
          className={[
            "arco-master-detail__list-item",
            s.id === chat.sessionId ? "arco-master-detail__list-item--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            className="arco-master-detail__list-button"
            onClick={() => {
              void chat.loadSession(s.id);
              setShowSessions(false);
            }}
          >
            {s.kind === "automation" ? "⚙ " : ""}
            {s.title}
          </button>
          <button
            aria-label={`Delete session ${s.title}`}
            className="arco-master-detail__list-delete"
            onClick={() => void chat.removeSession(s.id)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </>
  );

  return (
    <div className="arco-chat">
      <div className="arco-chat__topbar">
        <button
          className="arco-btn"
          onClick={() => setShowSessions((v) => !v)}
          aria-pressed={showSessions}
        >
          <History size={13} /><T k={I18nKey.APPS$CHAT_HISTORY} /></button>
        <button className="arco-btn" onClick={chat.newChat}>
          <Plus size={13} /><T k={I18nKey.APPS$CHAT_NEW} /></button>
      </div>

      <MasterDetail
        listOpen={showSessions}
        list={sessionList}
        detail={
          <div
            ref={scrollRef}
            className="arco-chat__thread arco-scroll"
            onScroll={() => {
              const el = scrollRef.current;
              if (el) followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
          >
            {voice.active && <VoiceBar voice={voice} placement="thread" />}
            {chat.items.length === 0 && (
              <EmptyState title={i18n.t(I18nKey.APPS$CHAT_ASK_ARCO_TO_BUILD_SOMETHING)}><T k={I18nKey.APPS$CHAT_BUILD_ME_A_SYSTEM_MONITOR_TRACK_MY_READING_LIST_DASHBOAR} /></EmptyState>
            )}
            <ChatThread
              items={chat.items}
              streaming={chat.streaming}
              turnMeta={chat.turnMeta}
              onFollowUp={submit}
            />
          </div>
        }
      />

      {voice.active && <VoiceBar voice={voice} placement="dock" />}

      <div className="arco-composer-dock">
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => submit()}
          streaming={chat.streaming}
          onStop={chat.stop}
          placeholder={i18n.t(I18nKey.APPS$CHAT_ASK_ARCO_TO_BUILD_AUTOMATE_OR_EXPLAIN)}
          model={modelLabel}
          modelItems={modelItems}
          voiceActive={voice.active}
          voiceAvailable={voice.available}
          onVoiceToggle={() => void voice.toggle().catch(() => {})}
          inputAriaLabel="Chat message"
        />
      </div>
    </div>
  );
}
