/** Type definitions for app-sdk (sdk.js). */

export interface AppTheme {
  theme: string;
  /** Shell design tokens, forwarded as --os-* custom properties. */
  tokens: Record<string, string>;
}

export interface AppClient {
  intents: {
    invoke: (intent: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
  storage: {
    query: (
      sql: string,
      params?: Record<string, unknown>,
    ) => Promise<{ namespace: string; rows: unknown[] }>;
    execute: (
      sql: string,
      params?: Record<string, unknown>,
    ) => Promise<{ namespace: string; changes: number; lastInsertRowid: number }>;
  };
  shell: {
    notify: (message: string) => Promise<void>;
  };
  /** Platform events — only topics the manifest subscribes to arrive. */
  events: {
    on: (topic: string, fn: () => void) => () => void;
  };
  theme: {
    readonly current: AppTheme;
    onChange: (fn: (theme: AppTheme) => void) => () => void;
  };
}

export function createAppClient(): AppClient;
