/** Persisted space-rig choice (Settings → Appearance). */

export type FaceRigId = "arco" | "chatty" | "kamiji-rig" | "kamiji-demo";

export const FACE_RIG_STORAGE_KEY = "arco:face-rig";

export interface FaceRigOption {
  id: FaceRigId;
  label: string;
  hint: string;
}

export const FACE_RIG_OPTIONS: FaceRigOption[] = [
  {
    id: "arco",
    label: "Minimal",
    hint: "Default CSS face — token-themed and lightweight.",
  },
  {
    id: "chatty",
    label: "Screen",
    hint: "Talking head with screen bezel and expressive mouth.",
  },
  {
    id: "kamiji-rig",
    label: "Round",
    hint: "Circular avatar with accent-colored eyes and mouth.",
  },
  {
    id: "kamiji-demo",
    label: "Coral",
    hint: "Coral companion sprite with dot eyes.",
  },
];

const VALID_IDS = new Set<string>(FACE_RIG_OPTIONS.map((option) => option.id));

export function normalizeFaceRigId(raw: string | null): FaceRigId {
  if (raw && VALID_IDS.has(raw)) return raw as FaceRigId;
  return "arco";
}
