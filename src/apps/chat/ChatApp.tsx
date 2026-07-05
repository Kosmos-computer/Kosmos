/**
 * The Chat app — the OS's front door. Calm-Console shaped: prose first,
 * tool activity as compact metadata cards, inline generative UI rendered
 * from fenced openui-lang via the chat component library.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { History, Mic, MicOff, Plus, Send, Square, Trash2 } from "lucide-react";
import { useChat } from "./useChat";
import { AssistantBlock } from "./AssistantBlock";
import { ToolCard } from "./ToolCard";
import { ConfirmCard } from "./ConfirmCard";
import { onPrimeComposer } from "./composerBus";
import { VoiceBar } from "./VoiceBar";
import { useVoice } from "../../voice";

export function ChatApp() {
  const chat = useChat();
  const voice = useVoice();
  const [draft, setDraft] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follow the stream unless the user scrolled up (hermes pattern).
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

  // primeComposer events from apps (Refine, follow-ups, library).
  useEffect(
    () =>
      onPrimeComposer(({ text, submit: shouldSubmit }) => {
        if (shouldSubmit) {
          submit(text);
        } else {
          setDraft(text);
          inputRef.current?.focus();
        }
      }),
    [submit],
  );

  return (
    <div className="arco-chat">
      <div className="arco-chat__topbar">
        <button
          className="arco-btn"
          onClick={() => setShowSessions((v) => !v)}
          aria-pressed={showSessions}
        >
          <History size={13} /> History
        </button>
        <button className="arco-btn" onClick={chat.newChat}>
          <Plus size={13} /> New
        </button>
      </div>

      <div className="arco-chat__main">
        {showSessions && (
          <aside className="arco-chat__sessions arco-scroll">
            {chat.sessions.length === 0 && <div className="arco-empty">No sessions yet</div>}
            {chat.sessions.map((s) => (
              <div
                key={s.id}
                className={`arco-chat__session ${s.id === chat.sessionId ? "arco-chat__session--active" : ""}`}
              >
                <button
                  className="arco-chat__session-title"
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
                  className="arco-chat__session-delete"
                  onClick={() => void chat.removeSession(s.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </aside>
        )}

        <div
          ref={scrollRef}
          className="arco-chat__thread arco-scroll"
          onScroll={() => {
            const el = scrollRef.current;
            if (el) followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
        >
          {chat.items.length === 0 && (
            <div className="arco-empty">
              <strong style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-md)" }}>
                Ask Arco to build something
              </strong>
              <span>
                “Build me a system monitor” · “Track my reading list” · “Dashboard of this repo”
              </span>
            </div>
          )}
          {chat.items.map((item) => {
            switch (item.kind) {
              case "user":
                return (
                  <div key={item.id} className="arco-chat__user">
                    {item.text}
                  </div>
                );
              case "assistant":
                return <AssistantBlock key={item.id} item={item} onFollowUp={submit} />;
              case "tool":
                return <ToolCard key={item.id} item={item} />;
              case "confirm":
                return <ConfirmCard key={item.id} item={item} />;
              case "error":
                return (
                  <div key={item.id} className="arco-chat__error">
                    {item.text}
                  </div>
                );
            }
          })}
          {chat.streaming && <div className="arco-chat__working">Working…</div>}
        </div>
      </div>

      {voice.active && <VoiceBar voice={voice} />}

      <div className="arco-chat__composer">
        <button
          className={`arco-btn ${voice.active ? "arco-btn--primary" : ""}`}
          onClick={() => void voice.toggle().catch(() => {})}
          disabled={!voice.available && !voice.active}
          title={
            voice.available || voice.active
              ? voice.active
                ? "End voice conversation"
                : "Start voice conversation"
              : "Voice server offline — see voice-server/README.md"
          }
          aria-label={voice.active ? "End voice conversation" : "Start voice conversation"}
          aria-pressed={voice.active}
        >
          {voice.active ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <textarea
          ref={inputRef}
          className="arco-chat__input"
          placeholder="Ask Arco to build, automate, or explain…"
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {chat.streaming ? (
          <button className="arco-btn arco-btn--danger" onClick={chat.stop} aria-label="Stop">
            <Square size={13} />
          </button>
        ) : (
          <button
            className="arco-btn arco-btn--primary"
            onClick={() => submit()}
            disabled={!draft.trim()}
            aria-label="Send"
          >
            <Send size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
