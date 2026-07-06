/**
 * Bento drawer store — layout persistence and open state for the shell overlay.
 */
import { create } from "zustand";
import { BENTO_DEFAULT_ITEMS } from "./bentoCatalog";
import { clampItemToGrid } from "./grid-utils";
import type { BentoItem } from "./types";

interface BentoStore {
  open: boolean;
  width: number;
  items: BentoItem[];
  activeId: string | null;
  settingsItemId: string | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setWidth: (width: number) => void;
  setItems: (items: BentoItem[]) => void;
  setActiveId: (id: string | null) => void;
  setSettingsItemId: (id: string | null) => void;
  updateItem: (id: string, patch: Partial<BentoItem>) => void;
}

function loadItems(): BentoItem[] {
  try {
    const raw = localStorage.getItem("arco:bento-items");
    if (!raw) return BENTO_DEFAULT_ITEMS.map((item) => clampItemToGrid(item));
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return BENTO_DEFAULT_ITEMS.map((item) => clampItemToGrid(item));
    }
    return parsed.map((item) => clampItemToGrid(item as BentoItem));
  } catch {
    return BENTO_DEFAULT_ITEMS.map((item) => clampItemToGrid(item));
  }
}

function loadWidth(): number {
  const raw = Number.parseInt(localStorage.getItem("arco:bento-width") ?? "", 10);
  return Number.isFinite(raw) && raw >= 320 && raw <= 720 ? raw : 420;
}

function persistItems(items: BentoItem[]) {
  localStorage.setItem("arco:bento-items", JSON.stringify(items));
}

export const useBentoStore = create<BentoStore>((set, get) => ({
  open: localStorage.getItem("arco:bento-open") === "true",
  width: loadWidth(),
  items: loadItems(),
  activeId: loadItems()[0]?.id ?? null,
  settingsItemId: null,

  setOpen: (open) => {
    localStorage.setItem("arco:bento-open", String(open));
    set({ open });
  },

  toggleOpen: () =>
    set((s) => {
      const open = !s.open;
      localStorage.setItem("arco:bento-open", String(open));
      return { open };
    }),

  setWidth: (width) => {
    localStorage.setItem("arco:bento-width", String(width));
    set({ width });
  },

  setItems: (items) => {
    persistItems(items);
    set({ items });
  },

  setActiveId: (activeId) => set({ activeId }),

  setSettingsItemId: (settingsItemId) => set({ settingsItemId }),

  updateItem: (id, patch) => {
    const items = get().items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    persistItems(items);
    set({ items });
  },
}));

export type BentoViewModel = Pick<
  ReturnType<typeof useBentoStore.getState>,
  "open" | "width" | "items" | "activeId"
>;
