import { create } from "zustand";
import {
  applyFaceBg,
  FACE_BG_STORAGE_KEY,
  normalizeFaceBg,
  type FaceBgValue,
} from "./facePreferences";
import {
  FACE_RIG_STORAGE_KEY,
  normalizeFaceRigId,
  type FaceRigId,
} from "./faceRigPreferences";

interface FacePreferencesStore {
  faceBg: FaceBgValue;
  faceRigId: FaceRigId;
  setFaceBg: (value: FaceBgValue) => void;
  setFaceRigId: (value: FaceRigId) => void;
}

const initialFaceBg = normalizeFaceBg(localStorage.getItem(FACE_BG_STORAGE_KEY));
applyFaceBg(initialFaceBg);

const initialFaceRigId = normalizeFaceRigId(localStorage.getItem(FACE_RIG_STORAGE_KEY));

export const useFacePreferencesStore = create<FacePreferencesStore>((set) => ({
  faceBg: initialFaceBg,
  faceRigId: initialFaceRigId,

  setFaceBg: (faceBg) => {
    localStorage.setItem(FACE_BG_STORAGE_KEY, faceBg);
    applyFaceBg(faceBg);
    set({ faceBg });
  },

  setFaceRigId: (faceRigId) => {
    localStorage.setItem(FACE_RIG_STORAGE_KEY, faceRigId);
    set({ faceRigId });
  },
}));
