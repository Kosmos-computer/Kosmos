import {
  Image,
  Mic,
  Phone,
  Play,
  Smile,
  Sticker,
  ThumbsUp,
  Video,
  Minus,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Avatar, Button, Input } from "../../components/ui";
import { PRESENCE_LABEL, type MessengerContact, type MessengerMessage } from "./types";

function MessageContent({ message, contactName }: { message: MessengerMessage; contactName: string }) {
  const isMe = message.senderId === "me";

  if (message.divider) {
    return <div className="arco-messenger__divider">{message.divider}</div>;
  }

  if (message.kind === "call" && message.call) {
    return (
      <div className="arco-messenger__call-card">
        <div className="arco-messenger__call-icon" aria-hidden>
          <Video size={18} />
        </div>
        <div className="arco-messenger__call-body">
          <strong>Video call</strong>
          <span>{message.call.duration}</span>
        </div>
        <Button variant="ghost" size="default" className="arco-messenger__call-again">
          Call again
        </Button>
      </div>
    );
  }

  return (
    <article className={`arco-messenger__message${isMe ? " arco-messenger__message--me" : ""}`}>
      {!isMe ? <Avatar name={message.senderName ?? contactName} size="sm" /> : null}
      <div className="arco-messenger__message-body">
        {message.kind === "link" && message.linkPreview ? (
          <a className="arco-messenger__link-preview" href="#" onClick={(e) => e.preventDefault()}>
            <span className="arco-messenger__link-title">{message.linkPreview.title}</span>
            <span className="arco-messenger__link-source">{message.linkPreview.source}</span>
          </a>
        ) : null}
        {message.kind === "image" || message.kind === "video" ? (
          <div className={`arco-messenger__media arco-messenger__media--${message.kind}`}>
            <div className="arco-messenger__media-placeholder" aria-label={message.mediaLabel ?? "Media"}>
              {message.kind === "video" ? <Play size={28} /> : <Image size={28} />}
            </div>
            {message.content ? <p>{message.content}</p> : null}
          </div>
        ) : null}
        {message.kind === "text" && message.content ? (
          <p className="arco-messenger__bubble">{message.content}</p>
        ) : null}
      </div>
    </article>
  );
}

function PopoutComposer({
  contactName,
  value,
  onChange,
  onSubmit,
}: {
  contactName: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <footer className="arco-messenger__composer">
      <div className="arco-messenger__composer-tools">
        <Button variant="ghost" size="icon" aria-label="Voice message">
          <Mic size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Attach photo">
          <Image size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Stickers">
          <Sticker size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="GIF">
          <span className="arco-messenger__gif-label">GIF</span>
        </Button>
      </div>
      <div className="arco-messenger__composer-field">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Aa"
          aria-label={`Message ${contactName}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button variant="ghost" size="icon" aria-label="Emoji">
          <Smile size={18} />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Send like"
        className="arco-messenger__like-btn"
        onClick={() => {
          if (!value.trim()) onChange("👍");
          onSubmit();
        }}
      >
        <ThumbsUp size={18} />
      </Button>
    </footer>
  );
}

export interface MessengerPopoutProps {
  contact: MessengerContact;
  messages: MessengerMessage[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onMinimize: () => void;
  /** Render as a fixed desktop popout (shell layer) rather than in-app panel. */
  floating?: boolean;
}

export function MessengerPopout({
  contact,
  messages,
  composerValue,
  onComposerChange,
  onSubmit,
  onClose,
  onMinimize,
  floating = false,
}: MessengerPopoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerStyle = contact.headerAccent
    ? ({ ["--messenger-header-accent" as string]: contact.headerAccent } as React.CSSProperties)
    : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <section
      className={[
        "arco-messenger__popout",
        contact.headerAccent ? "arco-messenger__popout--themed" : "",
        floating ? "arco-messenger__popout--floating" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={headerStyle}
      aria-label={`Chat with ${contact.name}`}
    >
      <header className="arco-messenger__popout-header">
        <div className="arco-messenger__popout-identity">
          <Avatar name={contact.name} size="sm" status={contact.status === "online" ? "online" : "offline"} />
          <div>
            <strong>{contact.name}</strong>
            {contact.status ? <span>{PRESENCE_LABEL[contact.status]}</span> : null}
          </div>
        </div>
        <div className="arco-messenger__popout-actions">
          <Button variant="ghost" size="icon" aria-label="Call">
            <Phone size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Video call">
            <Video size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Minimize" onClick={onMinimize}>
            <Minus size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="arco-messenger__popout-thread">
        {messages.map((message) => (
          <MessageContent key={message.id} message={message} contactName={contact.name} />
        ))}
      </div>

      <PopoutComposer
        contactName={contact.name}
        value={composerValue}
        onChange={onComposerChange}
        onSubmit={onSubmit}
      />
    </section>
  );
}
