/**
 * Composer toolset options — Hermes-style chips that scope agent tools.
 * Re-exported from shared so the UI and server stay in sync.
 */
import { TOOLSETS, DEFAULT_TOOLSET_IDS, type ToolsetDef } from "@shared/toolsets";

export { TOOLSETS, DEFAULT_TOOLSET_IDS, type ToolsetDef };

export function toolsetsLabel(activeIds: string[]): string {
  if (activeIds.length === 0 || activeIds.includes("all")) return "All tools";
  if (activeIds.length === 1) {
    const match = TOOLSETS.find((t) => t.id === activeIds[0]);
    return match?.label ?? "Tools";
  }
  return `${activeIds.length} toolsets`;
}
