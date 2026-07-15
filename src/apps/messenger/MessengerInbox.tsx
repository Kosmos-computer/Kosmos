import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Phone, Plus, Search, Users, Video } from "lucide-react";
import { useEffect, useRef } from "react";
import { SidebarPane } from "../../components/patterns";
import { Avatar, Button, EmptyState, Input } from "../../components/ui";
import { PRESENCE_LABEL, type MessengerContact, type MessengerMessage } from "./types";
import type { MessengerViewModel } from "./useMessengerStub";

function ContactRow({
  contact,
  active,
  onSelect,
}: {
  contact: MessengerContact;
  active: boolean;
  onSelect: () => void;
}) {
  const unread = (contact.unreadCount ?? 0) > 0;
  return (
    <button
      type="button"
      className={[
        "arco-messenger__contact",
        active ? "arco-messenger__contact--active" : "",
        unread ? "arco-messenger__contact--unread" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
    >
      <Avatar
        name={contact.name}
        size="md"
        status={contact.status === "online" ? "online" : contact.status ? "offline" : undefined}
      />
      <span className="arco-messenger__contact-body">
        <span className="arco-messenger__contact-top">
          <span className="arco-messenger__contact-name">{contact.name}</span>
          {contact.timestamp ? <time>{contact.timestamp}</time> : null}
        </span>
        <span className="arco-messenger__contact-preview">
          {contact.typing ? <em><T k={I18nKey.APPS$MESSENGER_TYPING} /></em> : contact.lastMessage}
        </span>
      </span>
      {unread ? <span className="arco-messenger__contact-badge">{contact.unreadCount}</span> : null}
    </button>
  );
}

function InboxMessage({ message, contactName }: { message: MessengerMessage; contactName: string }) {
  const isMe = message.senderId === "me";

  if (message.divider) {
    return <div className="arco-messenger__divider">{message.divider}</div>;
  }

  if (message.kind === "call" && message.call) {
    return (
      <div className="arco-messenger__call-card arco-messenger__call-card--inbox">
        <Video size={18} />
        <div>
          <strong><T k={I18nKey.APPS$MESSENGER_VIDEO_CALL} /></strong>
          <span>{message.call.duration}</span>
        </div>
        <Button variant="ghost" size="default"><T k={I18nKey.APPS$MESSENGER_CALL_AGAIN} /></Button>
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
        {message.content ? <p className="arco-messenger__bubble">{message.content}</p> : null}
      </div>
    </article>
  );
}

function ContactSection({
  label,
  contacts,
  activeContactId,
  onSelect,
}: {
  label?: string;
  contacts: MessengerContact[];
  activeContactId: string;
  onSelect: (id: string) => void;
}) {
  if (contacts.length === 0) return null;
  return (
    <section className="arco-messenger__contact-section">
      {label ? <h3>{label}</h3> : null}
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          active={contact.id === activeContactId}
          onSelect={() => onSelect(contact.id)}
        />
      ))}
    </section>
  );
}

export function MessengerInbox({ vm }: { vm: MessengerViewModel }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [vm.threadMessages.length, vm.activeContactId]);

  return (
    <div className="arco-messenger__inbox">
      <SidebarPane width={vm.sidebarWidth} onWidthChange={vm.setSidebarWidth} defaultWidth={320}>
        <div className="arco-messenger__sidebar">
          <header className="arco-messenger__sidebar-header">
            <h1>
              <Users size={16} aria-hidden /><T k={I18nKey.APPS$MESSENGER_MESSAGES} /></h1>
            <Button variant="primary" size="default" onClick={() => vm.setConnectOpen(true)}>
              <Plus size={14} /><T k={I18nKey.APPS$MESSENGER_NEW} /></Button>
          </header>
          <div className="arco-messenger__sidebar-search">
            <Search size={14} aria-hidden />
            <Input
              value={vm.searchQuery}
              onChange={(event) => vm.setSearchQuery(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$MESSENGER_SEARCH_CONVERSATIONS)}
              aria-label={i18n.t(I18nKey.APPS$MESSENGER_SEARCH_CONVERSATIONS)}
            />
          </div>
          <div className="arco-messenger__sidebar-list">
            {vm.filteredContacts.length === 0 ? (
              <EmptyState title={i18n.t(I18nKey.APPS$MESSENGER_NO_CONVERSATIONS_FOUND)} />
            ) : (
              <>
                <ContactSection
                  label={i18n.t(I18nKey.APPS$EMAIL_UNREAD)}
                  contacts={vm.unreadContacts}
                  activeContactId={vm.activeContactId}
                  onSelect={(id) => {
                    vm.setActiveContactId(id);
                    vm.openPopout(id);
                  }}
                />
                <ContactSection
                  label={vm.unreadContacts.length > 0 ? "Recent" : undefined}
                  contacts={vm.readContacts}
                  activeContactId={vm.activeContactId}
                  onSelect={(id) => {
                    vm.setActiveContactId(id);
                    vm.openPopout(id);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </SidebarPane>

      <main className="arco-messenger__thread">
        {!vm.activeContact ? (
          <EmptyState title={i18n.t(I18nKey.APPS$MESSENGER_NO_CONVERSATION_SELECTED)} />
        ) : (
          <>
            <header className="arco-messenger__thread-header">
              <div className="arco-messenger__thread-identity">
                <Avatar
                  name={vm.activeContact.name}
                  size="md"
                  status={vm.activeContact.status === "online" ? "online" : "offline"}
                />
                <div>
                  <strong>{vm.activeContact.name}</strong>
                  {vm.activeContact.status ? <span>{PRESENCE_LABEL[vm.activeContact.status]}</span> : null}
                </div>
              </div>
              <div className="arco-messenger__thread-actions">
                <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$CONTACTS_CALL)}>
                  <Phone size={16} />
                </Button>
                <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$MESSENGER_VIDEO_CALL)}>
                  <Video size={16} />
                </Button>
                <Button variant="ghost" size="default" onClick={() => vm.expandPopout(vm.activeContactId)}><T k={I18nKey.APPS$MESSENGER_OPEN_ON_DESKTOP_2} /></Button>
              </div>
            </header>
            <div ref={scrollRef} className="arco-messenger__thread-scroll">
              {vm.threadMessages.map((message) => (
                <InboxMessage key={message.id} message={message} contactName={vm.activeContact!.name} />
              ))}
            </div>
            <footer className="arco-messenger__thread-composer">
              <Input
                value={vm.composerValue}
                onChange={(event) => vm.setComposerValue(event.target.value)}
                placeholder={`Message ${vm.activeContact.name}…`}
                aria-label={i18n.t(I18nKey.APPS$SETTINGS_MESSAGE)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    vm.submitActive();
                  }
                }}
              />
              <Button variant="primary" size="default" onClick={() => vm.submitActive()} disabled={!vm.composerValue.trim()}><T k={I18nKey.APPS$MESSENGER_SEND} /></Button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

export function MessengerHub({ vm }: { vm: MessengerViewModel }) {
  const openSessions = vm.sessions.filter((s) => s.state === "open");
  const minimizedSessions = vm.sessions.filter((s) => s.state === "minimized");

  return (
    <div className="arco-messenger__hub">
      <header className="arco-messenger__hub-header">
        <div>
          <h1><T k={I18nKey.APPS$MESSENGER_DESKTOP_CHATS} /></h1>
          <p><T k={I18nKey.APPS$MESSENGER_CONVERSATIONS_STAY_OPEN_ON_YOUR_DESKTOP_CLOSE_THE_MESSEN} /></p>
        </div>
        <Button variant="primary" size="default" onClick={() => vm.setView("inbox")}>
          <Plus size={14} /><T k={I18nKey.APPS$MESSENGER_NEW_MESSAGE} /></Button>
      </header>

      <section className="arco-messenger__hub-section">
        <h2><T k={I18nKey.APPS$MESSENGER_OPEN_ON_DESKTOP} />{openSessions.length})</h2>
        {openSessions.length === 0 ? (
          <EmptyState title={i18n.t(I18nKey.APPS$MESSENGER_NO_OPEN_CHATS)}>
            <p><T k={I18nKey.APPS$MESSENGER_PICK_SOMEONE_FROM_THE_INBOX_TO_POP_OUT_A_CONVERSATION} /></p>
            <Button variant="primary" onClick={() => vm.setView("inbox")}><T k={I18nKey.APPS$MESSENGER_BROWSE_INBOX} /></Button>
          </EmptyState>
        ) : (
          <ul className="arco-messenger__hub-list">
            {openSessions.map((session) => {
              const contact = vm.contacts.find((c) => c.id === session.contactId);
              if (!contact) return null;
              return (
                <li key={session.contactId} className="arco-messenger__hub-item">
                  <Avatar
                    name={contact.name}
                    size="md"
                    status={contact.status === "online" ? "online" : contact.status ? "offline" : undefined}
                  />
                  <div className="arco-messenger__hub-item-body">
                    <strong>{contact.name}</strong>
                    <span>{contact.lastMessage}</span>
                  </div>
                  <div className="arco-messenger__hub-item-actions">
                    <Button variant="ghost" size="default" onClick={() => vm.minimizePopout(session.contactId)}><T k={I18nKey.APPS$MESSENGER_MINIMIZE} /></Button>
                    <Button variant="ghost" size="default" onClick={() => vm.closePopout(session.contactId)}><T k={I18nKey.COMMON$CLOSE} /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {minimizedSessions.length > 0 ? (
        <section className="arco-messenger__hub-section">
          <h2><T k={I18nKey.APPS$MESSENGER_MINIMIZED} />{minimizedSessions.length})</h2>
          <ul className="arco-messenger__hub-list arco-messenger__hub-list--bubbles">
            {minimizedSessions.map((session) => {
              const contact = vm.contacts.find((c) => c.id === session.contactId);
              if (!contact) return null;
              return (
                <li key={session.contactId}>
                  <button
                    type="button"
                    className="arco-messenger__hub-bubble"
                    onClick={() => vm.expandPopout(session.contactId)}
                    title={`Restore chat with ${contact.name}`}
                  >
                    <Avatar
                      name={contact.name}
                      size="md"
                      status={contact.status === "online" ? "online" : contact.status ? "offline" : undefined}
                    />
                    <span>{contact.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="arco-messenger__hub-section">
        <h2><T k={I18nKey.APPS$MESSENGER_START_A_CHAT} /></h2>
        <ul className="arco-messenger__hub-list">
          {vm.contacts
            .filter((c) => !vm.sessions.some((s) => s.contactId === c.id))
            .slice(0, 4)
            .map((contact) => (
              <li key={contact.id} className="arco-messenger__hub-item">
                <Avatar name={contact.name} size="md" />
                <div className="arco-messenger__hub-item-body">
                  <strong>{contact.name}</strong>
                  <span>{contact.lastMessage}</span>
                </div>
                <Button variant="primary" size="default" onClick={() => vm.openPopout(contact.id)}><T k={I18nKey.APPS$MESSENGER_OPEN_CHAT} /></Button>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
