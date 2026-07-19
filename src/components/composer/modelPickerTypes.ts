/**
 * Shared types for the composer model picker (provider left-nav + model list).
 *
 * When a provider isn't authenticated yet, attach `setup` so the right pane
 * shows a configure screen instead of an empty model list.
 */
export interface ModelPickerModel {
  id: string;
  label: string;
  /**
   * Secondary line under the title — for registry models, a compact meta
   * string like "Fast · 1.3 GB" or "Fastest · Experimental · 731 MB".
   */
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

/**
 * Inline configure surface for providers that need credentials / an endpoint
 * before they can advertise models (OpenAI, Kosmos, Cursor, ACP, Custom…).
 */
export interface ModelPickerSetup {
  title: string;
  description: string;
  /** Optional base-URL field (Custom endpoint). */
  urlLabel?: string;
  urlPlaceholder?: string;
  /** Optional API-key field; when set, the pane shows paste + Save & connect. */
  keyLabel?: string;
  keyPlaceholder?: string;
  /**
   * Persist credentials from the setup form. `baseUrl` is only set when
   * `urlLabel` is present. Prefer this over `onSaveKey` when a URL is needed.
   */
  onSaveConnection?: (creds: {
    apiKey: string;
    baseUrl?: string;
  }) => void | Promise<void>;
  /** @deprecated Prefer onSaveConnection — kept for simple key-only flows. */
  onSaveKey?: (apiKey: string) => void | Promise<void>;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export interface ModelPickerProvider {
  id: string;
  label: string;
  kind: ModelPickerProviderKind;
  /** Agent profile to activate when this provider (or one of its models) is chosen. */
  profileId?: string;
  models: ModelPickerModel[];
  /** Shown when models is empty and `setup` is absent. */
  emptyMessage?: string;
  /** Configure screen — replaces the model list when the provider isn't ready. */
  setup?: ModelPickerSetup;
  /** Provider tab is browsable but models cannot be selected yet. */
  inactive?: boolean;
  /**
   * Left-nav group. `where` = model suppliers (Local, OpenAI, Kosmos, Custom…);
   * `who` = external agent runtimes (Cursor, ACP…).
   */
  group?: "where" | "who";
}

export interface ModelPickerNavAction {
  id: string;
  label: string;
  onSelect: () => void;
}
