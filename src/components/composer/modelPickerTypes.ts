/**
 * Shared types for the composer model picker (provider left-nav + model list).
 */
export interface ModelPickerModel {
  id: string;
  label: string;
  description?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type ModelPickerProviderKind =
  | "builtin"
  | "cursor"
  | "acp"
  | "kosmos"
  | "custom"
  | "other";

export interface ModelPickerProvider {
  id: string;
  label: string;
  kind: ModelPickerProviderKind;
  /** Agent profile to activate when this provider (or one of its models) is chosen. */
  profileId?: string;
  models: ModelPickerModel[];
  /** Shown when models is empty (e.g. ACP session not warm yet). */
  emptyMessage?: string;
  /** Provider tab is browsable but models cannot be selected yet. */
  inactive?: boolean;
}

export interface ModelPickerNavAction {
  id: string;
  label: string;
  onSelect: () => void;
}
