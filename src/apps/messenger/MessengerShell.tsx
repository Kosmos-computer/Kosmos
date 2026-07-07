/**
 * Desktop shell integration — floating Messenger popouts persist above the dock
 * even when the Messenger app window is closed.
 */
import { useEffect } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { Avatar } from "../../components/ui";
import { MessengerPopout } from "./MessengerPopout";
import { MESSENGER_CONTACTS } from "./messengerMock";
import { useMessengerStore } from "./messengerStore";

function MinimizedBubble({
  contactId,
  onExpand,
}: {
  contactId: string;
  onExpand: () => void;
}) {
  const contact = MESSENGER_CONTACTS.find((c) => c.id === contactId);
  if (!contact) return null;

  return (
    <button
      type="button"
      className="arco-messenger-shell__bubble"
      onClick={onExpand}
      title={`Open chat with ${contact.name}`}
      aria-label={`Open chat with ${contact.name}`}
    >
      <Avatar
        name={contact.name}
        size="md"
        status={contact.status === "online" ? "online" : contact.status ? "offline" : undefined}
      />
      {(contact.unreadCount ?? 0) > 0 ? (
        <span className="arco-messenger-shell__bubble-badge">{contact.unreadCount}</span>
      ) : null}
    </button>
  );
}

export function MessengerShell() {
  const init = useMessengerStore((s) => s.init);
  const sessions = useMessengerStore((s) => s.sessions);
  const messages = useMessengerStore((s) => s.messages);
  const composerByContact = useMessengerStore((s) => s.composerByContact);
  const openPopout = useMessengerStore((s) => s.openPopout);
  const minimizePopout = useMessengerStore((s) => s.minimizePopout);
  const expandPopout = useMessengerStore((s) => s.expandPopout);
  const closePopout = useMessengerStore((s) => s.closePopout);
  const setComposerForContact = useMessengerStore((s) => s.setComposerForContact);
  const handleSubmit = useMessengerStore((s) => s.handleSubmit);
  const restoreMessengerWindow = useMessengerStore((s) => s.restoreMessengerWindow);

  useEffect(() => {
    init();
  }, [init]);

  const openSessions = sessions.filter((s) => s.state === "open");
  const minimizedSessions = sessions.filter((s) => s.state === "minimized");

  if (sessions.length === 0) return null;

  return (
    <div className="arco-messenger-shell" aria-label="Messenger chats">
      <div className="arco-messenger-shell__popouts">
        {openSessions.map((session) => {
          const contact = MESSENGER_CONTACTS.find((c) => c.id === session.contactId);
          if (!contact) return null;
          return (
            <MessengerPopout
              key={session.contactId}
              contact={contact}
              messages={messages[session.contactId] ?? []}
              composerValue={composerByContact[session.contactId] ?? ""}
              onComposerChange={(value) => setComposerForContact(session.contactId, value)}
              onSubmit={() => handleSubmit(session.contactId)}
              onClose={() => closePopout(session.contactId)}
              onMinimize={() => minimizePopout(session.contactId)}
              floating
            />
          );
        })}
      </div>

      <div className="arco-messenger-shell__tray">
        {minimizedSessions.map((session) => (
          <MinimizedBubble
            key={session.contactId}
            contactId={session.contactId}
            onExpand={() => expandPopout(session.contactId)}
          />
        ))}
        <button
          type="button"
          className="arco-messenger-shell__launcher"
          onClick={restoreMessengerWindow}
          aria-label="Open Messenger"
          title="Messenger"
        >
          <MessageCircle size={22} />
        </button>
        <button
          type="button"
          className="arco-messenger-shell__compose"
          onClick={() => {
            restoreMessengerWindow();
            const next = MESSENGER_CONTACTS.find((c) => !sessions.some((s) => s.contactId === c.id));
            if (next) openPopout(next.id);
          }}
          aria-label="New chat"
          title="New chat"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
