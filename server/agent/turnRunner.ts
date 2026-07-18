/**
 * Pick which turn runner to use for a given agent kind.
 * Shared by interactive chat, channels, and automations (Phase 4).
 */
import type { AgentKind } from "../../shared/types.js";
import { runAcpTurn } from "../acp/acpAgent.js";
import { runCursorTurn } from "../cursor/cursorAgent.js";
import { runOpenhandsTurn } from "../openhands/openhandsAgent.js";
import { runKosmosRemoteTurn } from "../kosmos-remote/kosmosRemoteAgent.js";
import { runAgentTurn, type RunTurnOptions } from "./loop.js";
import { resolveAcpCommand, resolveTurnKind } from "./resolveTurnKind.js";

export type TurnRunner = (opts: RunTurnOptions) => Promise<string>;

export { resolveAcpCommand, resolveTurnKind };

export function pickTurnRunner(kind: AgentKind): TurnRunner {
  switch (kind) {
    case "acp":
      return runAcpTurn;
    case "cursor":
      return runCursorTurn;
    case "openhands":
      return runOpenhandsTurn;
    case "kosmos":
      return runKosmosRemoteTurn;
    default:
      return runAgentTurn;
  }
}
