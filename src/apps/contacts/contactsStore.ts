/**
 * STUB: client-side contacts vault (localStorage), keyed by backend id
 * (Local / Kosmos Cloud server profile) — same model as Notes.
 * Wire point: swap for os.contacts@1 + contactsService when the platform store exists.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_BACKEND_ID, LOCAL_CONTACTS_BACKEND_ID } from "./contactsMock";
import type { ContactImportMode, ContactInput, PhoneContact } from "./types";

const STORAGE_KEY = "arco-contacts-vault";

function nextContactId(): string {
  return `contact_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ContactsStore {
  activeBackendId: string;
  contactsByBackend: Record<string, PhoneContact[]>;
  setActiveBackendId: (id: string) => void;
  ensureBackend: (id: string) => void;
  addContact: (input: ContactInput, backendId?: string) => PhoneContact;
  updateContact: (id: string, input: ContactInput) => void;
  deleteContact: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importContacts: (rows: ContactInput[], mode: ContactImportMode, backendId?: string) => number;
  contactsForBackend: (backendId: string) => PhoneContact[];
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      activeBackendId: DEFAULT_BACKEND_ID,
      contactsByBackend: { [LOCAL_CONTACTS_BACKEND_ID]: [] },

      ensureBackend(id) {
        if (get().contactsByBackend[id]) return;
        set((state) => ({
          contactsByBackend: { ...state.contactsByBackend, [id]: [] },
        }));
      },

      setActiveBackendId(id) {
        get().ensureBackend(id);
        set({ activeBackendId: id });
      },

      contactsForBackend(backendId) {
        return get().contactsByBackend[backendId] ?? [];
      },

      addContact(input, backendId) {
        const resolvedBackendId = backendId ?? get().activeBackendId;
        get().ensureBackend(resolvedBackendId);
        const contact: PhoneContact = {
          id: nextContactId(),
          accountId: resolvedBackendId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          phoneLabel: input.phoneLabel?.trim() || undefined,
          email: input.email?.trim() || undefined,
          company: input.company?.trim() || undefined,
          title: input.title?.trim() || undefined,
          favorite: input.favorite ?? false,
        };
        set((state) => ({
          contactsByBackend: {
            ...state.contactsByBackend,
            [resolvedBackendId]: [...(state.contactsByBackend[resolvedBackendId] ?? []), contact],
          },
        }));
        return contact;
      },

      updateContact(id, input) {
        set((state) => {
          const nextMap = { ...state.contactsByBackend };
          for (const backendId of Object.keys(nextMap)) {
            nextMap[backendId] = nextMap[backendId].map((contact) =>
              contact.id === id
                ? {
                    ...contact,
                    name: input.name.trim(),
                    phone: input.phone.trim(),
                    phoneLabel: input.phoneLabel?.trim() || undefined,
                    email: input.email?.trim() || undefined,
                    company: input.company?.trim() || undefined,
                    title: input.title?.trim() || undefined,
                    favorite: input.favorite ?? contact.favorite,
                  }
                : contact,
            );
          }
          return { contactsByBackend: nextMap };
        });
      },

      deleteContact(id) {
        set((state) => {
          const nextMap = { ...state.contactsByBackend };
          for (const backendId of Object.keys(nextMap)) {
            nextMap[backendId] = nextMap[backendId].filter((contact) => contact.id !== id);
          }
          return { contactsByBackend: nextMap };
        });
      },

      toggleFavorite(id) {
        set((state) => {
          const nextMap = { ...state.contactsByBackend };
          for (const backendId of Object.keys(nextMap)) {
            nextMap[backendId] = nextMap[backendId].map((contact) =>
              contact.id === id ? { ...contact, favorite: !contact.favorite } : contact,
            );
          }
          return { contactsByBackend: nextMap };
        });
      },

      importContacts(rows, mode, backendId) {
        const resolvedBackendId = backendId ?? get().activeBackendId;
        get().ensureBackend(resolvedBackendId);
        const normalized = rows
          .map((row) => ({
            name: row.name.trim(),
            phone: row.phone.trim() || "—",
            phoneLabel: row.phoneLabel?.trim() || undefined,
            email: row.email?.trim() || undefined,
            company: row.company?.trim() || undefined,
            title: row.title?.trim() || undefined,
            favorite: row.favorite ?? false,
          }))
          .filter((row) => row.name.length > 0);

        const imported = normalized.map((row) => ({
          id: nextContactId(),
          accountId: resolvedBackendId,
          ...row,
        }));

        set((state) => ({
          contactsByBackend: {
            ...state.contactsByBackend,
            [resolvedBackendId]:
              mode === "replace"
                ? imported
                : [...(state.contactsByBackend[resolvedBackendId] ?? []), ...imported],
          },
        }));

        return imported.length;
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      partialize: (state) => ({
        activeBackendId: state.activeBackendId,
        contactsByBackend: state.contactsByBackend,
      }),
      migrate() {
        // Drop v1 Personal/Work mock accounts and seed people.
        return {
          activeBackendId: DEFAULT_BACKEND_ID,
          contactsByBackend: { [LOCAL_CONTACTS_BACKEND_ID]: [] },
        };
      },
    },
  ),
);
