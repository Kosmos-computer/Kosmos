/**
 * Pending turn context for the next chat send — linked OpenUI app id and
 * build-mode lock. Set by Refine buttons, composer chips, or Studio defaults.
 */
export type ClientBuildMode = "openui" | "code" | "auto";

export interface ChatTurnContext {
  linkedAppId?: string;
  buildMode?: ClientBuildMode;
}

let pending: ChatTurnContext = {};
/** Sticky build mode for the active chat/studio surface (chips). */
let stickyBuildMode: ClientBuildMode | undefined;

export function setPendingTurnContext(ctx: ChatTurnContext): void {
  pending = { ...pending, ...ctx };
}

export function setStickyBuildMode(mode: ClientBuildMode | undefined): void {
  stickyBuildMode = mode;
}

export function getStickyBuildMode(): ClientBuildMode | undefined {
  return stickyBuildMode;
}

/** Consume one-shot pending fields; sticky buildMode persists. */
export function takeTurnContext(): ChatTurnContext {
  const next: ChatTurnContext = {
    ...(stickyBuildMode ? { buildMode: stickyBuildMode } : {}),
    ...pending,
  };
  pending = {};
  return next;
}
