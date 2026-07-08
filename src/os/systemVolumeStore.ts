import { create } from "zustand";

const STORAGE_KEY = "arco:system-volume";

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : 75;
    if (!Number.isFinite(parsed)) return 75;
    return Math.min(100, Math.max(0, Math.round(parsed)));
  } catch {
    return 75;
  }
}

interface SystemVolumeStore {
  volume: number;
  muted: boolean;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
}

export const useSystemVolumeStore = create<SystemVolumeStore>((set) => ({
  volume: loadVolume(),
  muted: false,
  setVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, Math.round(volume)));
    localStorage.setItem(STORAGE_KEY, String(clamped));
    set({ volume: clamped, muted: clamped === 0 });
  },
  setMuted: (muted) => set({ muted }),
}));
