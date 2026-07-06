import { create } from "zustand";
import {
  applyFaceBg,
  FACE_BG_STORAGE_KEY,
  normalizeFaceBg,
  type FaceBgValue,
} from "./facePreferences";

interface FacePreferencesStore {
  faceBg: FaceBgValue;
  setFaceBg: (value: FaceBgValue) => void;
}

const initialFaceBg = normalizeFaceBg(localStorage.getItem(FACE_BG_STORAGE_KEY));
applyFaceBg(initialFaceBg);

export const useFacePreferencesStore = create<FacePreferencesStore>((set) => ({
  faceBg: initialFaceBg,

  setFaceBg: (faceBg) => {
    localStorage.setItem(FACE_BG_STORAGE_KEY, faceBg);
    applyFaceBg(faceBg);
    set({ faceBg });
  },
}));
