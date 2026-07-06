import { create } from "zustand";

export type VoiceBarDisplay = "default" | "expanded" | "minimized";

interface VoiceBarStore {
  display: VoiceBarDisplay;
  setDisplay: (display: VoiceBarDisplay) => void;
  reset: () => void;
}

export const useVoiceBarStore = create<VoiceBarStore>((set) => ({
  display: "default",
  setDisplay: (display) => set({ display }),
  reset: () => set({ display: "default" }),
}));
