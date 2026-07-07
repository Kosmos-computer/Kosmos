/**
 * Global messenger state — popouts persist on the desktop when the Messenger
 * app window is closed or minimized (Facebook Messenger dock semantics).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWindowStore } from "../../os/windowStore";
import {
  DEFAULT_POPOUT_IDS,
  MESSENGER_CONTACTS,
  MESSENGER_THREADS,
} from "./messengerMock";
import type { MessengerContact, MessengerMessage } from "./types";

const MESSENGER_WINDOW_ID = "system:messenger";

export type PopoutState = "open" | "minimized";

export interface PopoutSession {
  contactId: string;
  state: PopoutState;
}

interface MessengerStore {
  initialized: boolean;
  activeContactId: string;
  sessions: PopoutSession[];
  messages: Record<string, MessengerMessage[]>;
  composerByContact: Record<string, string>;

  init: () => void;
  setActiveContactId: (id: string) => void;
  openPopout: (contactId: string) => void;
  minimizePopout: (contactId: string) => void;
  expandPopout: (contactId: string) => void;
  closePopout: (contactId: string) => void;
  setComposerForContact: (contactId: string, value: string) => void;
  handleSubmit: (contactId: string) => void;
  restoreMessengerWindow: () => void;
  contactById: (id: string) => MessengerContact | undefined;
}

function contactById(id: string): MessengerContact | undefined {
  return MESSENGER_CONTACTS.find((c) => c.id === id);
}

function upsertSession(sessions: PopoutSession[], contactId: string, state: PopoutState): PopoutSession[] {
  const existing = sessions.find((s) => s.contactId === contactId);
  if (existing) {
    return sessions.map((s) => (s.contactId === contactId ? { ...s, state } : s));
  }
  return [...sessions, { contactId, state }];
}

export const useMessengerStore = create<MessengerStore>()(
  persist(
    (set, get) => ({
      initialized: false,
      activeContactId: MESSENGER_CONTACTS[0]?.id ?? "",
      sessions: DEFAULT_POPOUT_IDS.map((contactId) => ({ contactId, state: "open" as PopoutState })),
      messages: { ...MESSENGER_THREADS },
      composerByContact: {},

      init() {
        if (get().initialized) return;
        set({ initialized: true });
      },

      setActiveContactId(id) {
        set({ activeContactId: id });
      },

      openPopout(contactId) {
        set((state) => ({
          activeContactId: contactId,
          sessions: upsertSession(state.sessions, contactId, "open"),
        }));
      },

      minimizePopout(contactId) {
        set((state) => ({
          sessions: upsertSession(state.sessions, contactId, "minimized"),
        }));
      },

      expandPopout(contactId) {
        set((state) => ({
          activeContactId: contactId,
          sessions: upsertSession(state.sessions, contactId, "open"),
        }));
      },

      closePopout(contactId) {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.contactId !== contactId),
        }));
      },

      setComposerForContact(contactId, value) {
        set((state) => ({
          composerByContact: { ...state.composerByContact, [contactId]: value },
        }));
      },

      handleSubmit(contactId) {
        const value = get().composerByContact[contactId]?.trim();
        if (!value) return;
        const newMessage: MessengerMessage = {
          id: `local-${Date.now()}`,
          senderId: "me",
          kind: "text",
          content: value,
          timestamp: "Just now",
        };
        set((state) => ({
          messages: {
            ...state.messages,
            [contactId]: [...(state.messages[contactId] ?? []), newMessage],
          },
          composerByContact: { ...state.composerByContact, [contactId]: "" },
        }));
      },

      restoreMessengerWindow() {
        const wm = useWindowStore.getState();
        const existing = wm.windows.find((w) => w.id === MESSENGER_WINDOW_ID);
        if (existing?.minimized) {
          wm.toggleMinimize(MESSENGER_WINDOW_ID);
        }
        if (existing) {
          wm.focus(MESSENGER_WINDOW_ID);
          return;
        }
        wm.open({ type: "system", app: "messenger" }, "Messenger");
      },

      contactById,
    }),
    {
      name: "arco-messenger",
      partialize: (state) => ({
        activeContactId: state.activeContactId,
        sessions: state.sessions,
        messages: state.messages,
        composerByContact: state.composerByContact,
        initialized: state.initialized,
      }),
    },
  ),
);
